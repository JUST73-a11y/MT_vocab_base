/**
 * /api/teacher/vocab-import/save/route.ts
 * Final confirmation save endpoint.
 *
 * RULES:
 * - Only accepts explicitly selected entries from teacher review
 * - Performs duplicate check against existing unit words
 * - Writes to existing Word collection — no new collections created
 * - Returns saved count + skipped count
 * - Teacher auth required
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import Unit from '@/models/Unit';
import { SavePayload } from '@/lib/vocab/smartExtract';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json() as SavePayload;
    const { unitId, entries } = body;

    if (!unitId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'unitId va entries kerak' }, { status: 400 });
    }

    await dbConnect();

    // Verify unit belongs to this teacher
    const unit = await Unit.findById(unitId).lean() as any;
    if (!unit) {
      return NextResponse.json({ error: 'Unit topilmadi' }, { status: 404 });
    }
    if (user.role !== 'admin' && unit.createdBy?.toString() !== user.id) {
      return NextResponse.json({ error: 'Bu unit sizga tegishli emas' }, { status: 403 });
    }

    // Fetch existing words in unit for duplicate check
    const existing = await Word.find({ unitId }).select('englishWord').lean() as any[];
    const existingSet = new Set(existing.map((w: any) => w.englishWord.toLowerCase().trim()));

    const toInsert: any[] = [];
    let skipped = 0;

    for (const entry of entries) {
      if (!entry.englishWord?.trim() || !entry.uzbekTranslation?.trim()) {
        skipped++;
        continue;
      }

      // Duplicate check (case-insensitive string equality)
      if (existingSet.has(entry.englishWord.toLowerCase().trim())) {
        skipped++;
        continue;
      }

      toInsert.push({
        unitId,
        englishWord: entry.englishWord.trim(),
        uzbekTranslation: entry.uzbekTranslation.trim(),
        ...(entry.phonetic ? { phonetic: entry.phonetic.trim() } : {}),
        ...(entry.exampleSentence ? { exampleSentence: entry.exampleSentence.trim() } : {}),
        ...(entry.emoji ? { emoji: entry.emoji } : {}),
        ...(entry.emojiSource ? { emojiSource: entry.emojiSource } : {}),
        ...(entry.sourceType ? { sourceType: entry.sourceType } : {}),
        ...(entry.confidence !== undefined ? { confidence: entry.confidence } : {}),
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        saved: 0,
        skipped,
        message: 'Saqlash uchun yangi so\'z topilmadi'
      });
    }

    await Word.insertMany(toInsert, { ordered: false });

    return NextResponse.json({
      saved: toInsert.length,
      skipped,
      message: `${toInsert.length} ta so'z saqlandi${skipped > 0 ? `, ${skipped} ta o'tkazib yuborildi` : ''}`,
    });

  } catch (error: any) {
    console.error('Vocab save error:', error);
    return NextResponse.json({ error: error.message || 'Saqlashda xatolik' }, { status: 500 });
  }
}
