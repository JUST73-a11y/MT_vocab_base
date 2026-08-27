/**
 * /api/teacher/vocab-import/extract/route.ts
 * Text-based extraction.
 * - 'vocab_list' → deterministic parseVocabText (no AI, instant)
 * - 'smart_extract' → Gemini identifies vocabulary candidates from prose
 * - 'auto' → tries deterministic first, escalates to Gemini if < 2 entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { parseVocabText, ParsedWord } from '@/lib/vocab/vocabParser';
import {
  ExtractedEntry, ExtractionResult, SourceType
} from '@/lib/vocab/smartExtract';
import { batchLookupEmoji } from '@/lib/vocab/emojiMap';
import { extractFromSmartText, isGeminiConfigured, resolveSmartEmojis } from '@/lib/vocab/geminiClient';

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json() as {
      text: string;
      mode: 'auto' | 'vocab_list' | 'smart_extract';
      suggestEmojis?: boolean;
    };

    const { text, mode, suggestEmojis = true } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Matn bo\'sh' }, { status: 400 });
    }

    const warnings: string[] = [];
    let entries: ExtractedEntry[] = [];
    let usedAI = false;

    // ── Deterministic path ───────────────────────────────────────────────
    if (mode === 'vocab_list' || mode === 'auto') {
      const { words: parsed, warnings: parseWarnings } = parseVocabText(text);
      warnings.push(...parseWarnings);

      entries = parsed.map((p: ParsedWord) => ({
        id: newId(),
        englishWord: p.englishWord,
        uzbekTranslation: p.uzbekTranslation,
        phonetic: p.phonetic,
        exampleSentence: p.exampleSentence,
        sourceType: 'text' as SourceType,
        confidence: 1.0, // deterministic = certain
        aiTranslation: false,
        ocrUncertain: false,
        status: 'valid',
        selected: true,
      } as ExtractedEntry));
    }

    // ── AI escalation path ────────────────────────────────────────────────
    if (mode === 'smart_extract' || (mode === 'auto' && entries.length < 2)) {
      if (!isGeminiConfigured()) {
        if (mode === 'smart_extract') {
          return NextResponse.json({
            error: 'Gemini API kalit sozlanmagan. .env.local faylga GEMINI_API_KEY qo\'shing.'
          }, { status: 503 });
        }
        // auto mode without Gemini → return deterministic results (even if few)
      } else {
        usedAI = true;
        const aiEntries = await extractFromSmartText(text, mode === 'smart_extract' ? 'smart_extract' : 'smart_extract');
        entries = mode === 'auto' ? aiEntries : aiEntries; // replace for smart, replace for auto escalation
      }
    }

    // ── Emoji suggestions ─────────────────────────────────────────────────
    if (suggestEmojis) {
      const emojiMap = await resolveSmartEmojis(entries);
      entries = entries.map(e => ({
        ...e,
        emoji: e.emoji || emojiMap[e.englishWord] || undefined,
        emojiSource: emojiMap[e.englishWord] ? 'automatic' : undefined,
      }));
    }

    const result: ExtractionResult = {
      entries,
      source: usedAI ? 'Matn (AI tahlil)' : 'Matn (tez tahlil)',
      warnings,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Vocab extract error:', error);
    return NextResponse.json({ error: error.message || 'Tahlil xatosi' }, { status: 500 });
  }
}
