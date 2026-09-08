/**
 * aiReadingExtractor.ts
 *
 * Reusable AI Reading Vocabulary Extraction service.
 * Caller-agnostic: works for Teacher and Student.
 * Permissions and limits belong to the calling API layer.
 *
 * PIPELINE:
 *   text input
 *     → chunk if large
 *     → extract candidates per chunk (parallel)
 *     → merge + deduplicate candidates
 *     → global ranking pass (if multi-chunk)
 *     → validate output
 *     → return top N
 */

import {
  extractReadingVocabulary,
  ReadingExtractionSettings,
  ReadingVocabItem,
  ReadingIdeaItem,
  ReadingExtractionOutput,
} from './geminiClient';
import type { AIExtractionResult, AIReadingSettings, ExtractedVocabItem } from '@/models/AIExtractionSession';

// ── Configuration (env-configurable, not hardcoded) ─────────────────────
const MAX_CHUNK_CHARS  = parseInt(process.env.AI_READING_CHUNK_CHARS  ?? '10000');
const MAX_TOTAL_CHARS  = parseInt(process.env.AI_READING_MAX_CHARS    ?? '80000');  // ~80KB text
const PARALLEL_CHUNKS  = parseInt(process.env.AI_READING_PARALLEL     ?? '3');

// ── Chunking ─────────────────────────────────────────────────────────────

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  // Split at paragraph boundaries to preserve context
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks;
}

// ── Deduplication ─────────────────────────────────────────────────────────

function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/[^a-z\s'-]/g, '');
}

function deduplicateItems(items: ReadingVocabItem[]): ReadingVocabItem[] {
  const seen = new Map<string, ReadingVocabItem>();
  for (const item of items) {
    const key = normalizeWord(item.word);
    if (!key) continue;
    const existing = seen.get(key);
    // Keep the one with higher importance score
    if (!existing || (item.importanceScore ?? 0) > (existing.importanceScore ?? 0)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

// ── Output validation ─────────────────────────────────────────────────────

const VALID_CEFR = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const VALID_POS  = new Set(['verb', 'noun', 'adjective', 'adverb', 'phrase', 'other']);
const VALID_CONF = new Set(['high', 'medium', 'low']);

function validateItem(item: any): item is ReadingVocabItem {
  return (
    typeof item?.word === 'string' && item.word.trim().length > 0 &&
    item.word.trim().length < 100 // sanity check — no full sentences as "words"
  );
}

function sanitizeItem(item: any, itemType: 'word' | 'phrase' = 'word'): ReadingVocabItem {
  return {
    word:               String(item.word ?? '').trim(),
    uzbekTranslation:   String(item.uzbekTranslation ?? '').trim(),
    cefr:               VALID_CEFR.has(item.cefr) ? item.cefr : 'B1',
    partOfSpeech:       VALID_POS.has(item.partOfSpeech) ? item.partOfSpeech : 'other',
    definition:         String(item.definition ?? '').trim().slice(0, 500),
    contextSentence:    String(item.contextSentence ?? '').trim().slice(0, 1000),
    contextTranslation: String(item.contextTranslation ?? '').trim().slice(0, 1000),
    importanceScore:    Math.min(1, Math.max(0, Number(item.importanceScore ?? 0.5))),
    confidence:         VALID_CONF.has(item.confidence) ? item.confidence : 'medium',
    phonetic:           item.phonetic ? String(item.phonetic).trim() : undefined,
    sourcePage:         typeof item.sourcePage === 'number' ? item.sourcePage : undefined,
    itemType:           itemType,
  };
}

function sanitizeIdea(item: any): ReadingIdeaItem {
  return {
    title:       String(item.title       ?? '').trim().slice(0, 200),
    summary:     String(item.summary     ?? '').trim().slice(0, 1000),
    importance:  ['high','medium','low'].includes(item.importance) ? item.importance : 'medium',
    sourceQuote: String(item.sourceQuote ?? '').trim().slice(0, 500),
  };
}

// ── Global ranking pass ───────────────────────────────────────────────────
// After merging candidates from multiple chunks, rank them and take top N.

async function rankCandidatesGlobally(
  candidates: ReadingVocabItem[],
  requestedCount: number,
  settings: ReadingExtractionSettings
): Promise<ReadingVocabItem[]> {
  // If candidates fit within requested count already, no ranking needed
  if (candidates.length <= requestedCount) return candidates;

  // Sort by importanceScore descending, then pick top N
  // We do a lightweight re-rank via Gemini only if candidates >> 2x requested
  if (candidates.length > requestedCount * 2) {
    try {
      const summary = candidates
        .slice(0, 150) // limit to avoid token overflow
        .map((c, i) => `${i + 1}. ${c.word} (${c.cefr}) score:${c.importanceScore?.toFixed(2)}`)
        .join('\n');

      const rankPrompt = `You are a CEFR/IELTS vocabulary expert.
From this list of candidate vocabulary items extracted from a reading passage,
select the ${requestedCount} most educationally valuable for English learners.

Criteria: IELTS usefulness, CEFR appropriateness (${settings.cefr}), academic value, reusability.
Prefer: academic verbs, abstract nouns, formal adjectives, useful collocations.
Avoid: rare technical jargon not useful beyond this one passage, already-known basic words.

Candidates:
${summary}

Return ONLY a JSON array of the candidate numbers to keep (1-indexed):
[3, 7, 12, ...]

Return exactly ${requestedCount} numbers.`;

      const { generateContentWithFallback } = await import('./geminiClient');
      const raw = await generateContentWithFallback(rankPrompt, {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 1024,
      });
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const indices: number[] = JSON.parse(cleaned);
      if (Array.isArray(indices) && indices.length > 0) {
        return indices
          .filter(i => i >= 1 && i <= candidates.length)
          .map(i => candidates[i - 1])
          .slice(0, requestedCount);
      }
    } catch {
      // Fallback: sort by importanceScore
    }
  }

  return candidates
    .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0))
    .slice(0, requestedCount);
}

// ── Main extraction service ───────────────────────────────────────────────

export async function extractVocabularyFromDocument(
  documentText: string,
  settings: AIReadingSettings
): Promise<AIExtractionResult> {
  const startMs = Date.now();

  // Truncate extremely large documents
  const text = documentText.slice(0, MAX_TOTAL_CHARS);
  const wasTruncated = documentText.length > MAX_TOTAL_CHARS;

  const chunks = chunkText(text);
  const totalChunks = chunks.length;

  const geminiSettings: ReadingExtractionSettings = {
    requestedCount: settings.requestedCount,
    cefr:           settings.cefr as any,
    includePhrases: settings.includePhrases,
    includeIdeas:   settings.includeIdeas,
    mode:           settings.mode ?? 'reading',
  };

  // ── Single chunk (most common case) ──────────────────────────────────
  if (totalChunks === 1) {
    const output = await extractReadingVocabulary(text, geminiSettings);

    const vocabulary = output.vocabulary
      .filter(validateItem)
      .map(v => sanitizeItem(v, 'word'));

    const phrases = output.phrases
      .filter(validateItem)
      .map(p => sanitizeItem(p, 'phrase'));

    const ideas = (output.ideas ?? []).map(sanitizeIdea);

    const totalFound = vocabulary.length + phrases.length;
    let message = output.message;
    if (wasTruncated) {
      message = `Hujjat juda katta — dastlabki ${Math.round(MAX_TOTAL_CHARS / 1000)}KB tahlil qilindi.${message ? ' ' + message : ''}`;
    }

    return {
      vocabulary,
      phrases,
      ideas,
      metadata: {
        totalFound,
        message,
        processingMs: Date.now() - startMs,
      },
    };
  }

  // ── Multi-chunk: parallel extraction ─────────────────────────────────
  const allVocabCandidates: ReadingVocabItem[] = [];
  const allPhraseCandidates: ReadingVocabItem[] = [];
  const allIdeaCandidates: ReadingIdeaItem[] = [];

  // Process chunks in batches to avoid overwhelming the API
  for (let i = 0; i < chunks.length; i += PARALLEL_CHUNKS) {
    const batch = chunks.slice(i, i + PARALLEL_CHUNKS);
    const results = await Promise.allSettled(
      batch.map((chunk, batchIdx) =>
        extractReadingVocabulary(chunk, geminiSettings, i + batchIdx + 1, totalChunks)
      )
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        allVocabCandidates.push(...res.value.vocabulary.filter(validateItem).map(v => sanitizeItem(v, 'word')));
        allPhraseCandidates.push(...res.value.phrases.filter(validateItem).map(p => sanitizeItem(p, 'phrase')));
        allIdeaCandidates.push(...(res.value.ideas ?? []).map(sanitizeIdea));
      }
    }
  }

  // Deduplicate across chunks
  const dedupedVocab  = deduplicateItems(allVocabCandidates);
  const dedupedPhrases = deduplicateItems(allPhraseCandidates);

  // Global ranking — pick the best N across all chunks
  const finalVocab   = await rankCandidatesGlobally(dedupedVocab, settings.requestedCount, geminiSettings);
  const finalPhrases = settings.includePhrases
    ? dedupedPhrases.sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0)).slice(0, Math.round(settings.requestedCount * 0.3))
    : [];

  // Deduplicate ideas (by title similarity)
  const seenIdeaTitles = new Set<string>();
  const finalIdeas = allIdeaCandidates.filter(idea => {
    const key = idea.title?.toLowerCase().trim() ?? '';
    if (seenIdeaTitles.has(key)) return false;
    seenIdeaTitles.add(key);
    return true;
  }).slice(0, 10);

  const totalFound = finalVocab.length + finalPhrases.length;
  let message: string | undefined;
  if (totalFound < settings.requestedCount) {
    message = `Faqat ${totalFound} ta yuqori sifatli so'z topildi (${totalChunks} qism tahlil qilindi).`;
  }
  if (wasTruncated) {
    message = `Hujjat juda katta — dastlabki ${Math.round(MAX_TOTAL_CHARS / 1000)}KB tahlil qilindi.${message ? ' ' + message : ''}`;
  }

  return {
    vocabulary: finalVocab,
    phrases:    finalPhrases,
    ideas:      finalIdeas,
    metadata: {
      totalFound,
      message,
      processingMs: Date.now() - startMs,
    },
  };
}
