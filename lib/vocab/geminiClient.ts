/**
 * geminiClient.ts
 * Thin wrapper around @google/generative-ai for vocabulary extraction.
 *
 * AI GUARDRAILS (enforced via system prompt):
 *   ✅ detect structure, extract text, identify vocabulary candidates
 *   ✅ generate missing translations when explicitly requested
 *   ✅ suggest emojis
 *   ❌ NEVER replace teacher vocabulary with synonyms
 *   ❌ NEVER rewrite existing translations
 *   ❌ NEVER invent vocabulary
 *   ❌ NEVER silently correct or merge entries
 *
 * Teacher-provided data always has priority over AI-generated data.
 * This module is used SERVER-SIDE ONLY.
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { ExtractedEntry, SourceType } from './smartExtract';

// ── UUID shim (Node crypto, no extra package) ──────────────────────────────
function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Client singleton (server-side only) ────────────────────────────────────
function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set in .env.local');
  return new GoogleGenerativeAI(key);
}

export const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
];

export const PRIMARY_MODEL = GEMINI_MODELS[0];
export const FALLBACK_MODEL = GEMINI_MODELS[1];
export const SECONDARY_FALLBACK = GEMINI_MODELS[2];

const GENERATION_CONFIG = {
  responseMimeType: 'application/json',
  temperature: 0.1,
  maxOutputTokens: 2048,
};

export async function generateContentWithFallback(contents: any, config: any = GENERATION_CONFIG): Promise<string> {
  const client = getClient();
  let lastError: any = null;

  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: config,
        });
        const result = await model.generateContent(contents);
        const text = result.response.text();
        if (text && text.trim()) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isTransient = msg.includes('503') || msg.includes('429') || msg.includes('high demand') || msg.includes('fetch failed');
        console.warn(`[Gemini] Model ${modelName} (attempt ${attempt}) warning: ${msg.slice(0, 100)}`);
        if (isTransient && attempt === 1) {
          await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
          continue;
        }
        break; // Next model in chain
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to generate content');
}

// ── Shared system instruction ──────────────────────────────────────────────
const VOCAB_SYSTEM = `You are a vocabulary extraction assistant for a language learning app.
Your ONLY job is to identify and structure existing vocabulary pairs — English word/phrase and its Uzbek translation.

ABSOLUTE RULES:
1. Return ONLY vocabulary that is clearly present in the source content.
2. NEVER replace a word with a synonym (railway ≠ railroad, tailor ≠ dressmaker).
3. NEVER invent vocabulary not present in the source.
4. NEVER rewrite or correct existing translations.
5. Multi-word expressions (keep fit, go on a picnic, father-in-law) must be preserved EXACTLY.
6. If confidence is low, set ocrUncertain: true instead of guessing.
7. Always respond with valid JSON only — no markdown, no explanation.`;

// ── JSON parse helper ──────────────────────────────────────────────────────
function parseJsonResponse(raw: string): any {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    const objMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (objMatch) {
      try { return JSON.parse(objMatch[1]); } catch {}
    }
    const arrMatch = cleaned.match(/(\[[\s\S]*\])/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[1]); } catch {}
    }
    throw err1;
  }
}

// ── Image extraction ──────────────────────────────────────────────────────
export async function extractFromImage(
  base64Data: string,
  mimeType: string,
  sourceReference = 'image'
): Promise<ExtractedEntry[]> {
  const prompt = `${VOCAB_SYSTEM}

Extract ALL English vocabulary words/phrases and their translations from this image.
The image may contain:
- Vocabulary lists (word on one line, translation below or beside it)
- Textbook pages with vocabulary sections
- Handwritten or printed vocabulary cards
- Dictionary-style pages

Return a JSON array. Each object:
{
  "englishWord": "exact word/phrase as it appears",
  "uzbekTranslation": "exact translation as it appears",
  "phonetic": "if visible, else null",
  "exampleSentence": "if visible, else null",
  "partOfSpeech": "noun|verb|adj|adverb|phrase|null",
  "confidence": 0.0-1.0,
  "ocrUncertain": true|false
}

If a word has no matching translation visible, still include it with uzbekTranslation: "".
Return [] if no vocabulary is found.`;

  const imagePart: Part = {
    inlineData: { data: base64Data, mimeType: mimeType as any }
  };

  const raw = await generateContentWithFallback([prompt, imagePart]);

  let parsed: any[];
  try {
    parsed = parseJsonResponse(raw);
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    return [];
  }

  return parsed.map((item: any) => ({
    id: newId(),
    englishWord: String(item.englishWord ?? '').trim(),
    uzbekTranslation: String(item.uzbekTranslation ?? '').trim(),
    phonetic: item.phonetic ? String(item.phonetic).trim() : undefined,
    exampleSentence: item.exampleSentence ? String(item.exampleSentence).trim() : undefined,
    partOfSpeech: item.partOfSpeech ?? undefined,
    sourceType: 'image' as SourceType,
    sourceReference,
    confidence: Number(item.confidence ?? 0.8),
    aiTranslation: false,
    ocrUncertain: Boolean(item.ocrUncertain),
    status: (item.ocrUncertain || (item.confidence ?? 0.8) < 0.7) ? 'needs_review' : 'valid',
    selected: !item.ocrUncertain,
  } as ExtractedEntry)).filter(e => e.englishWord.length > 0);
}

// ── Smart text extraction (prose, vocab list or mixed) ─────────────────────
export async function extractFromSmartText(
  text: string,
  mode: 'vocab_list' | 'smart_extract'
): Promise<ExtractedEntry[]> {
  const modeInstruction = mode === 'smart_extract'
    ? `The text may be a reading passage, article, notes, or vocabulary document.
       Identify the key vocabulary words, collocations, or phrases for learning.
       Extract them and provide their direct, natural Uzbek translations.
       If the text already has translations, preserve them.`
    : `The text is a vocabulary list or word collection. Extract every English word/phrase and its translation.
       If translations are missing for any words, generate accurate, natural Uzbek translations.`;

  const prompt = `${VOCAB_SYSTEM}

${modeInstruction}

Text to analyze:
---
${text.slice(0, 12000)}
---

Return a JSON array of extracted vocabulary items:
[{
  "englishWord": "exact word/phrase",
  "uzbekTranslation": "accurate Uzbek translation (1-3 words)",
  "phonetic": "phonetic/IPA if visible, else null",
  "exampleSentence": "sentence from context or a natural example sentence",
  "partOfSpeech": "verb|noun|adjective|adverb|phrase|other",
  "confidence": 0.8-1.0,
  "sourceReference": "context hint or line"
}]

Return [] ONLY if the text contains no meaningful words.`;

  const raw = await generateContentWithFallback(prompt);

  let parsed: any[] = [];
  try {
    const rawParsed: any = parseJsonResponse(raw);
    if (Array.isArray(rawParsed)) {
      parsed = rawParsed;
    } else if (Array.isArray(rawParsed?.vocabulary)) {
      parsed = rawParsed.vocabulary;
    } else if (Array.isArray(rawParsed?.words)) {
      parsed = rawParsed.words;
    }
  } catch {
    return [];
  }

  return parsed.map((item: any) => ({
    id: newId(),
    englishWord: String(item.englishWord ?? item.word ?? '').trim(),
    uzbekTranslation: String(item.uzbekTranslation ?? item.translation ?? '').trim(),
    phonetic: item.phonetic ? String(item.phonetic).trim() : undefined,
    exampleSentence: item.exampleSentence ? String(item.exampleSentence).trim() : undefined,
    partOfSpeech: item.partOfSpeech ?? undefined,
    sourceType: 'smart' as SourceType,
    sourceReference: item.sourceReference ?? undefined,
    confidence: Number(item.confidence ?? 0.85),
    aiTranslation: Boolean(!item.uzbekTranslation),
    ocrUncertain: false,
    status: (Number(item.confidence ?? 0.85) < 0.7) ? 'needs_review' : 'valid',
    selected: true,
  } as ExtractedEntry)).filter(e => e.englishWord.length > 0);
}

// ── PDF extraction (via Gemini native PDF understanding) ──────────────────
export async function extractFromPdf(
  pdfBase64: string,
  pageCount?: number
): Promise<ExtractedEntry[]> {
  const prompt = `${VOCAB_SYSTEM}

This is a PDF document (reading passage, article, textbook page, or vocabulary list).
Extract ALL valuable vocabulary words/phrases for language learners.

For every word/phrase:
- If Uzbek translation is present in the document, use it.
- If translation is not in the document, GENERATE the accurate, concise Uzbek translation (1-3 words).
- Provide an example sentence and part of speech.

Return JSON array:
[{
  "englishWord": "exact word/phrase",
  "uzbekTranslation": "accurate Uzbek translation",
  "phonetic": "IPA or null",
  "exampleSentence": "example sentence",
  "partOfSpeech": "verb|noun|adjective|adverb|phrase|other",
  "confidence": 0.8-1.0,
  "pageNumber": number or null
}]`;

  const pdfPart: Part = {
    inlineData: { data: pdfBase64, mimeType: 'application/pdf' }
  };

  const raw = await generateContentWithFallback([prompt, pdfPart]);

  let parsed: any[] = [];
  try {
    const rawParsed: any = parseJsonResponse(raw);
    if (Array.isArray(rawParsed)) {
      parsed = rawParsed;
    } else if (Array.isArray(rawParsed?.vocabulary)) {
      parsed = rawParsed.vocabulary;
    } else if (Array.isArray(rawParsed?.words)) {
      parsed = rawParsed.words;
    }
  } catch {
    return [];
  }

  return parsed.map((item: any) => ({
    id: newId(),
    englishWord: String(item.englishWord ?? item.word ?? '').trim(),
    uzbekTranslation: String(item.uzbekTranslation ?? item.translation ?? '').trim(),
    phonetic: item.phonetic ? String(item.phonetic).trim() : undefined,
    exampleSentence: item.exampleSentence ? String(item.exampleSentence).trim() : undefined,
    partOfSpeech: item.partOfSpeech ?? undefined,
    sourceType: 'pdf' as SourceType,
    sourceReference: item.pageNumber ? `sahifa ${item.pageNumber}` : undefined,
    confidence: Number(item.confidence ?? 0.85),
    aiTranslation: false,
    ocrUncertain: false,
    status: (Number(item.confidence ?? 0.85) < 0.7) ? 'needs_review' : 'valid',
    selected: true,
  } as ExtractedEntry)).filter(e => e.englishWord.length > 0);
}

// ── AI Translation generation ─────────────────────────────────────────────
export async function generateTranslations(
  words: string[]
): Promise<Record<string, string>> {
  if (words.length === 0) return {};

  const prompt = `${VOCAB_SYSTEM}

Generate Uzbek translations for the following English words/phrases.
These are vocabulary items for a language learning app (likely English for Uzbek speakers).

Rules:
- Provide the most common, natural Uzbek translation
- For multi-word expressions, translate the whole expression (not word by word)
- If unsure, provide the closest common translation
- Never use synonyms for the English word — translate it directly

Words to translate:
${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Return a JSON object: { "word": "uzbekTranslation", ... }
Use the exact English word as the key.`;

  const raw = await generateContentWithFallback(prompt);

  try {
    const parsed = parseJsonResponse(raw);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {/* empty */}

  return {};
}

export interface EmojiItemInput {
  word: string;
  translation?: string;
}

// ── Emoji suggestion ──────────────────────────────────────────────────────
export async function suggestEmojis(
  items: EmojiItemInput[]
): Promise<Record<string, string>> {
  if (items.length === 0) return {};

  const prompt = `You are a creative vocabulary assistant for an educational flashcard app.
Assign the single most relevant, expressive, and accurate emoji for EACH vocabulary item listed below.

Input items (English word — Uzbek translation):
${items.map((it, i) => `${i + 1}. ${it.word}${it.translation ? ` — ${it.translation}` : ''}`).join('\n')}

RULES:
1. Always choose a fitting emoji for every item based on its meaning or Uzbek translation.
2. For animals/nature (e.g. Reptile -> 🦎, Aviary -> 🐦, Aquarium -> 🐠, Lizard -> 🦎) use animal/nature emojis.
3. For people/roles (e.g. Presenter -> 🎙️, Keeper -> 🛡️, Companion -> 🤝) use person/object emojis.
4. For abstract or actions (e.g. Adopt -> 👨‍👩‍👧, Disturb -> 🚫, Constant -> 🔄, Brief -> ⏱️, Enable -> ✅, Possessions -> 💎, Stereo -> 🎧) use conceptual or action emojis.
5. Return ONLY a JSON object mapping exact English word -> single emoji string.

Example Output format:
{
  "Reptile": "🦎",
  "Presenter": "🎙️",
  "Keeper": "🛡️",
  "Aviary": "🐦",
  "Aquarium": "🐠"
}`;

  const raw = await generateContentWithFallback(prompt);

  try {
    const parsed = parseJsonResponse(raw);
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'string' && v.trim()) filtered[k] = v.trim();
      }
      return filtered;
    }
  } catch {/* empty */}

  return {};
}

export async function resolveSmartEmojis(
  items: (string | { englishWord: string; uzbekTranslation?: string })[]
): Promise<Record<string, string>> {
  if (items.length === 0) return {};
  const { batchLookupEmoji } = await import('./emojiMap');

  const normalizedItems: EmojiItemInput[] = items.map(it =>
    typeof it === 'string' ? { word: it } : { word: it.englishWord, translation: it.uzbekTranslation }
  );

  const wordList = normalizedItems.map(it => it.word);

  // 1. Static lookup first (instant, free)
  const staticMap = batchLookupEmoji(wordList);

  // 2. Identify missing items
  const missingItems = normalizedItems.filter(it => !staticMap[it.word]);

  // 3. Fallback to Gemini AI if configured and missing words exist
  if (missingItems.length > 0 && isGeminiConfigured()) {
    try {
      const aiMap = await suggestEmojis(missingItems);
      return { ...staticMap, ...aiMap };
    } catch (err) {
      console.warn('AI emoji suggestion notice:', err);
    }
  }

  return staticMap;
}

// ── AI Reading Vocabulary Extractor ───────────────────────────────────────
export interface ReadingExtractionSettings {
  requestedCount: number;
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Mixed' | 'Any';
  includePhrases: boolean;
  includeIdeas: boolean;
  mode?: string;
}

export interface ReadingVocabItem {
  word: string;
  uzbekTranslation: string;
  cefr: string;
  partOfSpeech: string;
  definition: string;
  contextSentence: string;
  contextTranslation: string;
  importanceScore: number;
  confidence: 'high' | 'medium' | 'low';
  phonetic?: string;
  sourcePage?: number;
  itemType: 'word' | 'phrase';
}

export interface ReadingIdeaItem {
  title: string;
  summary: string;
  importance: 'high' | 'medium' | 'low';
  sourceQuote: string;
}

export interface ReadingExtractionOutput {
  vocabulary: ReadingVocabItem[];
  phrases: ReadingVocabItem[];
  ideas: ReadingIdeaItem[];
  message?: string;
}

function buildCefrInstruction(cefr: string): string {
  if (cefr === 'Any' || cefr === 'Mixed') {
    return 'Ignore strict CEFR filtering. Select the most educationally useful vocabulary regardless of level. Strongly prefer B1–C2 range. Avoid A1 unless the word has special contextual importance.';
  }
  return `Target CEFR level: ${cefr}. Focus on words at or near this level. Include adjacent levels if they are contextually important.`;
}

export async function extractReadingVocabulary(
  text: string,
  settings: ReadingExtractionSettings,
  chunkIndex?: number,
  totalChunks?: number
): Promise<ReadingExtractionOutput> {
  const cefrInstruction = buildCefrInstruction(settings.cefr);
  const countNote = (totalChunks && totalChunks > 1)
    ? `This is chunk ${chunkIndex}/${totalChunks} of a larger document. Extract ALL high-value candidates — final ranking happens separately.`
    : `Return approximately ${settings.requestedCount} items total. If the text lacks enough quality vocabulary, return fewer — NEVER pad with weak words.`;

  const systemPrompt = `You are an expert IELTS/CEFR vocabulary analyst and EFL teacher.
Analyze the reading passage and extract the most educationally valuable vocabulary for English learners.

CORE OBJECTIVE: Find vocabulary genuinely useful for CEFR/IELTS-style reading — NOT just words that exist in the text.

SELECTION CRITERIA:
1. Academic/formal value
2. CEFR relevance — ${cefrInstruction}
3. IELTS reading usefulness
4. Context importance (critical to understanding the passage)
5. Reusability in other academic texts

MANDATORY EXCLUSIONS:
- Function words: the, a, an, is, are, was, were, of, in, on, to, and, or, for, with
- Obvious A1 beginner words (unless teacher requested A1/A2)
- Proper nouns: names, cities, countries, companies (unless critical)
- Numbers, dates, percentages
- Words NOT actually present in the source text (anti-hallucination rule)
- Context sentences MUST be exact quotes from the passage — never invented

WORD FORMS: Choose the most useful learning form. Do not extract all forms of the same word.

TRANSLATION RULES (CRITICAL):
- "uzbekTranslation" MUST BE CONCISE, DIRECT, AND CRISP (strictly 1–3 words max, e.g. "o'zgartirmoq", "xilma-xillik", "muhim").
- NEVER write long descriptions, sentence-like definitions, or multi-clause explanations in "uzbekTranslation".
- Detailed explanations belong ONLY in "definition" (English) and "contextTranslation" (full sentence translation).
- "uzbekTranslation" must be the clean vocabulary equivalent for flashcards.

${countNote}

Return ONLY valid JSON (no markdown) in this exact structure:
{
  "vocabulary": [{
    "word": "exact word from text",
    "uzbekTranslation": "concise 1-3 word Uzbek meaning",
    "cefr": "A1|A2|B1|B2|C1|C2",
    "partOfSpeech": "verb|noun|adjective|adverb|other",
    "definition": "clear English definition",
    "contextSentence": "EXACT sentence from the passage",
    "contextTranslation": "Uzbek translation of context sentence",
    "importanceScore": 0.0-1.0,
    "confidence": "high|medium|low",
    "phonetic": "IPA or null",
    "sourcePage": null,
    "itemType": "word"
  }],
  "phrases": [],
  "ideas": [],
  "message": "Only N items found (optional — omit if count reached)"
}

QUALITY > QUANTITY. Fewer high-value items beats more weak items.`;

  const userPrompt = [
    `Reading passage:\n---\n${text.slice(0, 12000)}\n---`,
    `Requested count: ${settings.requestedCount}`,
    `CEFR filter: ${settings.cefr}`,
    settings.includePhrases
      ? 'Extract useful collocations/academic phrases/phrasal verbs in the phrases[] array. Only genuinely reusable phrases — not random sentence fragments.'
      : 'Return phrases: []',
    settings.includeIdeas
      ? 'Extract key claims/findings/arguments in the ideas[] array as { title, summary, importance, sourceQuote }.'
      : 'Return ideas: []',
  ].join('\n');

  const readingConfig = {
    responseMimeType: 'application/json',
    temperature: 0.15,
    maxOutputTokens: 8192,
  };

  const raw = await generateContentWithFallback([systemPrompt, userPrompt], readingConfig);

  try {
    const parsed = parseJsonResponse(raw);
    return {
      vocabulary: Array.isArray(parsed?.vocabulary) ? parsed.vocabulary : [],
      phrases:    Array.isArray(parsed?.phrases)    ? parsed.phrases    : [],
      ideas:      Array.isArray(parsed?.ideas)      ? parsed.ideas      : [],
      message:    parsed?.message,
    };
  } catch (parseErr) {
    console.error('Failed to parse AI reading response:', raw?.slice(0, 300));
    return { vocabulary: [], phrases: [], ideas: [], message: 'AI javobi noto\'g\'ri formatda' };
  }
}

export const isGeminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;
