/**
 * /api/teacher/vocab-import/file/route.ts
 * File upload + extraction: image, PDF, DOCX.
 *
 * Pipeline:
 *   Image → Gemini Vision OCR
 *   PDF (text layer) → pdf-parse text → parseVocabText or Gemini smart extract
 *   PDF (scanned/no text) → Gemini native PDF understanding
 *   DOCX → mammoth text extraction → parseVocabText + Gemini for remainder
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import {
  extractFromImage,
  extractFromPdf,
  extractFromSmartText,
  isGeminiConfigured,
  resolveSmartEmojis,
} from '@/lib/vocab/geminiClient';
import { parseVocabText, ParsedWord } from '@/lib/vocab/vocabParser';
import { batchLookupEmoji } from '@/lib/vocab/emojiMap';
import { ExtractedEntry, ExtractionResult, SourceType } from '@/lib/vocab/smartExtract';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10 MB
const MAX_PDF_SIZE   = 20 * 1024 * 1024;  // 20 MB
const MAX_DOCX_SIZE  = 10 * 1024 * 1024;  // 10 MB

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const PDF_TYPE    = 'application/pdf';
const DOCX_TYPE   = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_TYPE    = 'application/msword';

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const suggestEmojisRaw = formData.get('suggestEmojis');
    const suggestEmojis = suggestEmojisRaw !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'Fayl tanlanmadi' }, { status: 400 });
    }

    const mime = file.type;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── DOC (old binary format) — not supported ──────────────────────────
    if (mime === DOC_TYPE || file.name.toLowerCase().endsWith('.doc')) {
      return NextResponse.json({
        error: 'Eski .doc format qo\'llab-quvvatlanmaydi. Faylni .docx formatida qayta saqlang va yuklang.'
      }, { status: 400 });
    }

    // ── Gemini required check ─────────────────────────────────────────────
    if (!isGeminiConfigured()) {
      return NextResponse.json({
        error: 'Fayl tahlili uchun Gemini API kalit kerak. .env.local faylga GEMINI_API_KEY qo\'shing.'
      }, { status: 503 });
    }

    let entries: ExtractedEntry[] = [];
    let source = file.name;
    let pagesAnalyzed: number | undefined;
    const warnings: string[] = [];

    // ── IMAGE ─────────────────────────────────────────────────────────────
    if (IMAGE_TYPES.includes(mime)) {
      if (buffer.byteLength > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Rasm 10 MB dan kichik bo\'lishi kerak' }, { status: 400 });
      }
      const base64 = buffer.toString('base64');
      entries = await extractFromImage(base64, mime, file.name);
      source = `🖼️ ${file.name}`;
    }

    // ── PDF ───────────────────────────────────────────────────────────────
    else if (mime === PDF_TYPE || file.name.toLowerCase().endsWith('.pdf')) {
      if (buffer.byteLength > MAX_PDF_SIZE) {
        return NextResponse.json({ error: 'PDF 20 MB dan kichik bo\'lishi kerak' }, { status: 400 });
      }

      // Try text layer first (fast, deterministic)
      let textLayerText = '';
      try {
        // Require pdf-parse (CJS package)
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        textLayerText = pdfData.text || '';
        pagesAnalyzed = pdfData.numpages;
      } catch {
        textLayerText = '';
      }

      const isTextPdf = textLayerText.trim().length > 50;

      if (isTextPdf) {
        // Text PDF: try deterministic first
        const { words: parsed, warnings: pw } = parseVocabText(textLayerText);
        warnings.push(...pw);

        if (parsed.length >= 2) {
          entries = parsed.map((p: ParsedWord) => ({
            id: newId(),
            englishWord: p.englishWord,
            uzbekTranslation: p.uzbekTranslation,
            phonetic: p.phonetic,
            exampleSentence: p.exampleSentence,
            sourceType: 'pdf' as SourceType,
            confidence: 1.0,
            aiTranslation: false,
            ocrUncertain: false,
            status: 'valid',
            selected: true,
          } as ExtractedEntry));
        } else {
          // Not a simple vocab list — use Gemini on the text
          entries = await extractFromSmartText(textLayerText, 'smart_extract');
          entries = entries.map(e => ({ ...e, sourceType: 'pdf' as SourceType }));
        }
      } else {
        // Scanned PDF: send raw bytes to Gemini
        const base64 = buffer.toString('base64');
        entries = await extractFromPdf(base64, pagesAnalyzed);
      }

      source = `📄 ${file.name}${pagesAnalyzed ? ` (${pagesAnalyzed} sahifa)` : ''}`;
    }

    // ── DOCX ──────────────────────────────────────────────────────────────
    else if (mime === DOCX_TYPE || file.name.toLowerCase().endsWith('.docx')) {
      if (buffer.byteLength > MAX_DOCX_SIZE) {
        return NextResponse.json({ error: 'DOCX 10 MB dan kichik bo\'lishi kerak' }, { status: 400 });
      }

      const mammoth = (await import('mammoth')).default;

      // Extract raw text
      const rawResult = await mammoth.extractRawText({ buffer });
      const rawText = rawResult.value || '';

      // Also extract as HTML to find tables
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const html = htmlResult.value || '';

      // Extract table rows from HTML (word | translation pattern)
      const tableEntries = extractTableFromHtml(html);

      if (tableEntries.length >= 2) {
        entries = tableEntries;
      } else {
        // Fall back to text parsing
        const { words: parsed, warnings: pw } = parseVocabText(rawText);
        warnings.push(...pw);

        if (parsed.length >= 2) {
          entries = parsed.map((p: ParsedWord) => ({
            id: newId(),
            englishWord: p.englishWord,
            uzbekTranslation: p.uzbekTranslation,
            phonetic: p.phonetic,
            exampleSentence: p.exampleSentence,
            sourceType: 'docx' as SourceType,
            confidence: 1.0,
            aiTranslation: false,
            ocrUncertain: false,
            status: 'valid',
            selected: true,
          } as ExtractedEntry));
        } else {
          // Smart extract from raw text
          entries = await extractFromSmartText(rawText, 'smart_extract');
          entries = entries.map(e => ({ ...e, sourceType: 'docx' as SourceType }));
        }
      }

      source = `📝 ${file.name}`;
    }

    else {
      return NextResponse.json({
        error: `Qo'llab-quvvatlanmaydigan fayl turi: ${mime}. JPG, PNG, WEBP, PDF yoki DOCX yuklang.`
      }, { status: 400 });
    }

    // ── Emoji suggestions ─────────────────────────────────────────────────
    if (suggestEmojis) {
      const emojiMap = await resolveSmartEmojis(entries);
      entries = entries.map(e => ({
        ...e,
        emoji: e.emoji || emojiMap[e.englishWord] || undefined,
        emojiSource: emojiMap[e.englishWord] ? ('automatic' as const) : undefined,
      }));
    }

    const result: ExtractionResult = {
      entries,
      source,
      pagesAnalyzed,
      warnings,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Vocab file import error:', error);
    return NextResponse.json({ error: error.message || 'Fayl tahlilida xatolik' }, { status: 500 });
  }
}

// ── DOCX HTML table extractor ─────────────────────────────────────────────
function extractTableFromHtml(html: string): ExtractedEntry[] {
  const entries: ExtractedEntry[] = [];

  // Find all <tr> rows
  const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];

  for (const row of rowMatches) {
    // Extract cell content (td or th)
    const cellMatches = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? [];
    const cells = cellMatches
      .map(c => c.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);

    if (cells.length < 2) continue;

    const english = cells[0];
    const uzbek = cells[1];

    // Skip header rows
    if (/^(word|english|so'z|tarjima|translation|uzbek)$/i.test(english)) continue;
    if (english.length === 0) continue;

    entries.push({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      englishWord: english,
      uzbekTranslation: uzbek,
      phonetic: cells[2] ?? undefined,
      sourceType: 'docx' as SourceType,
      confidence: 1.0,
      aiTranslation: false,
      ocrUncertain: false,
      status: 'valid',
      selected: true,
    } as ExtractedEntry);
  }

  return entries;
}
