/**
 * POST /api/teacher/ai-reading/save
 *
 * Teacher confirms and imports selected AI-extracted vocabulary into MT-Vocab.
 * This is the ONLY place AI results enter the Word collection.
 * Teacher approval is mandatory — AI never writes directly.
 *
 * FLOW: Teacher selects items → duplicate check → Word.insertMany → mark session imported
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import Unit from '@/models/Unit';
import AIExtractionSession from '@/models/AIExtractionSession';

export const dynamic = 'force-dynamic';

interface SelectedItem {
  word: string;
  uzbekTranslation: string;
  phonetic?: string;
  cefr?: string;
  partOfSpeech?: string;
  definition?: string;
  contextSentence?: string;
  contextTranslation?: string;
  importanceScore?: number;
  confidence?: string;
  itemType?: 'word' | 'phrase';
  sourcePage?: number;
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const body = await req.json();
    const { sessionId, unitId, selectedItems } = body;

    if (!unitId) {
      return NextResponse.json({ error: 'unitId kerak' }, { status: 400 });
    }
    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      return NextResponse.json({ error: 'Hech bo\'lmaganda bitta element tanlang' }, { status: 400 });
    }

    await dbConnect();

    // ── Verify unit ownership ─────────────────────────────────────────────
    const unit = await Unit.findById(unitId).lean() as any;
    if (!unit) {
      return NextResponse.json({ error: 'Unit topilmadi' }, { status: 404 });
    }
    if (user.role !== 'admin' && unit.createdBy?.toString() !== user.id) {
      return NextResponse.json({ error: 'Bu unit sizga tegishli emas' }, { status: 403 });
    }

    function normalizeForDedup(w: string): string[] {
      const clean = String(w || '').toLowerCase().trim().replace(/[^a-z0-9\s'-]/g, '');
      const variants = [clean];
      if (clean.endsWith('ies') && clean.length > 4) variants.push(clean.slice(0, -3) + 'y');
      else if (clean.endsWith('es') && clean.length > 3) variants.push(clean.slice(0, -2));
      else if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 2) variants.push(clean.slice(0, -1));
      return variants;
    }

    // ── Duplicate check against existing unit vocabulary ──────────────────
    const existing = await Word.find({ unitId }).select('englishWord').lean() as any[];
    const existingSet = new Set<string>();
    for (const w of existing) {
      for (const variant of normalizeForDedup(w.englishWord)) {
        existingSet.add(variant);
      }
    }

    const toInsert: any[] = [];
    const duplicates: string[] = [];
    let skipped = 0;

    for (const item of selectedItems) {
      const wordText = String(item.word ?? '').trim();
      const translation = String(item.uzbekTranslation ?? '').trim();

      if (!wordText) { skipped++; continue; }

      const variants = normalizeForDedup(wordText);
      if (variants.some(v => existingSet.has(v))) {
        duplicates.push(wordText);
        skipped++;
        continue;
      }
      // Add newly inserted variants to local set to avoid duplicates within same import batch
      for (const v of variants) existingSet.add(v);

      const now = new Date();
      toInsert.push({
        unitId,
        englishWord:        wordText,
        uzbekTranslation:   translation,
        ...(item.phonetic          ? { phonetic: item.phonetic.trim() }                  : {}),
        ...(item.contextSentence   ? { exampleSentence: item.contextSentence.trim() }    : {}),
        // New AI Reading fields
        cefr:               item.cefr || null,
        partOfSpeech:       item.partOfSpeech || undefined,
        definition:         item.definition   || undefined,
        contextTranslation: item.contextTranslation || undefined,
        importanceScore:    typeof item.importanceScore === 'number' ? item.importanceScore : undefined,
        itemType:           item.itemType || 'word',
        sourceType:         'ai_reading',
        confidence:         1.0,   // teacher explicitly approved → max confidence
        aiMetadata: {
          extractionSessionId: sessionId || undefined,
          confidence:         item.confidence || 'medium',
          sourcePage:         item.sourcePage || undefined,
          sourceContext:      item.contextSentence || undefined,
          importedAt:         now,
        },
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        saved: 0, skipped, duplicates,
        message: 'Saqlash uchun yangi so\'z topilmadi (barchasi dublikat yoki noto\'g\'ri)',
      });
    }

    await Word.insertMany(toInsert, { ordered: false });

    // ── Mark session as imported ──────────────────────────────────────────
    if (sessionId) {
      try {
        await AIExtractionSession.findByIdAndUpdate(sessionId, {
          importedToUnitId: unitId,
          importedAt: new Date(),
        });
      } catch { /* non-critical — session may have expired */ }
    }

    return NextResponse.json({
      saved: toInsert.length,
      skipped,
      duplicates,
      message: `${toInsert.length} ta so'z "${unit.title}" unitiga saqlandi${skipped > 0 ? `, ${skipped} ta o'tkazib yuborildi` : ''}`,
    });

  } catch (error: any) {
    console.error('AI Reading save error:', error);
    return NextResponse.json({ error: error.message || 'Saqlashda xatolik' }, { status: 500 });
  }
}
