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

const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

const GENERATION_CONFIG = {
  responseMimeType: 'application/json',
  temperature: 0.1,
  maxOutputTokens: 2048,
};

async function generateContentWithFallback(contents: any): Promise<string> {
  const client = getClient();
  try {
    const model = client.getGenerativeModel({
      model: PRIMARY_MODEL,
      generationConfig: GENERATION_CONFIG,
    });
    const result = await model.generateContent(contents);
    return result.response.text();
  } catch (err: any) {
    console.warn(`Primary model ${PRIMARY_MODEL} failed, attempting fallback to ${FALLBACK_MODEL}:`, err?.message);
    const fallback = client.getGenerativeModel({
      model: FALLBACK_MODEL,
      generationConfig: GENERATION_CONFIG,
    });
    const result = await fallback.generateContent(contents);
    return result.response.text();
  }
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
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
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

// ── Smart text extraction (prose or mixed) ────────────────────────────────
export async function extractFromSmartText(
  text: string,
  mode: 'vocab_list' | 'smart_extract'
): Promise<ExtractedEntry[]> {
  const modeInstruction = mode === 'smart_extract'
    ? `The text may be prose or a document. Identify candidate vocabulary words that appear to be:
       - New/unfamiliar words being introduced
       - Words appearing in a vocabulary list or glossary
       - Bold or highlighted terms
       - Words that have definitions or translations nearby
       Do NOT extract every word from paragraphs. Be selective.
       These are CANDIDATES — mark confidence appropriately.`
    : `The text is a vocabulary list. Extract every English word/phrase and its translation.
       Support formats: "word — translation", "word - translation", column-based, numbered lists.`;

  const prompt = `${VOCAB_SYSTEM}

${modeInstruction}

Text to analyze:
---
${text.slice(0, 8000)}
---

Return a JSON array:
{
  "englishWord": "exact word/phrase",
  "uzbekTranslation": "translation if present, else empty string",
  "phonetic": "if present, else null",
  "exampleSentence": "if present, else null",
  "partOfSpeech": "if detectable, else null",
  "confidence": 0.0-1.0,
  "sourceReference": "line X or context hint"
}

Return [] if nothing found.`;

  const raw = await generateContentWithFallback(prompt);

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
    sourceType: 'smart' as SourceType,
    sourceReference: item.sourceReference ?? undefined,
    confidence: Number(item.confidence ?? 0.75),
    aiTranslation: false,
    ocrUncertain: false,
    status: (Number(item.confidence ?? 0.75) < 0.7) ? 'needs_review' : 'valid',
    selected: mode === 'vocab_list',
  } as ExtractedEntry)).filter(e => e.englishWord.length > 0);
}

// ── PDF extraction (via Gemini native PDF understanding) ──────────────────
export async function extractFromPdf(
  pdfBase64: string,
  pageCount?: number
): Promise<ExtractedEntry[]> {
  const prompt = `${VOCAB_SYSTEM}

This is a PDF document. Extract ALL vocabulary pairs (English word/phrase + Uzbek translation).

Look for:
- Numbered vocabulary lists
- Tables with word/translation columns
- Glossary sections
- Words followed by their translations
- Dictionary-style entries with definitions

For each entry include the page number or section if determinable.

DO NOT extract every word from paragraphs of running text.
ONLY extract entries that clearly function as vocabulary items.

Return JSON array:
{
  "englishWord": "exact word/phrase",
  "uzbekTranslation": "translation if present, else empty string",
  "phonetic": "if present, else null",
  "exampleSentence": "if present, else null",
  "partOfSpeech": "if present, else null",
  "confidence": 0.0-1.0,
  "pageNumber": number or null
}`;

  const pdfPart: Part = {
    inlineData: { data: pdfBase64, mimeType: 'application/pdf' }
  };

  const raw = await generateContentWithFallback([prompt, pdfPart]);

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

export const isGeminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;


