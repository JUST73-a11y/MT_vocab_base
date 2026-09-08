/**
 * /api/teacher/vocab-import/file/route.ts
 * Unified File upload + extraction: Image, PDF, DOCX, TXT, XLSX, CSV.
 *
 * Pipeline:
 *   Image → Gemini Vision OCR
 *   PDF (text layer) → pdf-parse text → parseVocabText or Gemini smart extract
 *   PDF (scanned/no text) → Gemini native PDF understanding
 *   DOCX → mammoth text/table extraction → parseVocabText or Gemini smart extract
 *   TXT / CSV / XLSX → text extractor → parseVocabText or Gemini smart extract
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
import { validateFile, extractTextFromBuffer } from '@/lib/vocab/documentTextExtractor';
import { ExtractedEntry, ExtractionResult, SourceType } from '@/lib/vocab/smartExtract';

export const dynamic = 'force-dynamic';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const suggestEmojisRaw = formData.get('suggestEmojis');
    const suggestEmojis = suggestEmojisRaw !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'Fayl tanlanmadi' }, { status: 400 });
    }

    const mime = file.type || 'application/octet-stream';
    const fileName = file.name;
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate size and file category
    const validation = validateFile(mime, buffer.byteLength, fileName);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Gemini check
    if (!isGeminiConfigured()) {
      return NextResponse.json({
        error: 'Fayl tahlili uchun Gemini API kalit kerak. .env.local faylga GEMINI_API_KEY qo\'shing.'
      }, { status: 503 });
    }

    let entries: ExtractedEntry[] = [];
    let source = fileName;
    let pagesAnalyzed: number | undefined;
    const warnings: string[] = [];

    // ── IMAGE ─────────────────────────────────────────────────────────────
    if (IMAGE_TYPES.includes(mime) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      const base64 = buffer.toString('base64');
      entries = await extractFromImage(base64, mime.startsWith('image/') ? mime : `image/${ext === 'jpg' ? 'jpeg' : ext}`, fileName);
      source = `🖼️ ${fileName}`;
    }

    // ── PDF ───────────────────────────────────────────────────────────────
    else if (mime === 'application/pdf' || ext === 'pdf') {
      let textLayerText = '';
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        textLayerText = pdfData.text || '';
        pagesAnalyzed = pdfData.numpages;
      } catch {
        textLayerText = '';
      }

      const isTextPdf = textLayerText.trim().length > 5;

      if (isTextPdf) {
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
            aiTranslation: !p.uzbekTranslation,
            ocrUncertain: false,
            status: 'valid',
            selected: true,
          } as ExtractedEntry));
        } else {
          entries = await extractFromSmartText(textLayerText, 'smart_extract');
          entries = entries.map(e => ({ ...e, sourceType: 'pdf' as SourceType }));
        }
      } else {
        const base64 = buffer.toString('base64');
        entries = await extractFromPdf(base64, pagesAnalyzed);
      }

      source = `📄 ${fileName}${pagesAnalyzed ? ` (${pagesAnalyzed} sahifa)` : ''}`;
    }

    // ── DOCX ──────────────────────────────────────────────────────────────
    else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx' || ext === 'doc'
    ) {
      const mammoth = (await import('mammoth')).default;
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const html = htmlResult.value || '';
      const tableEntries = extractTableFromHtml(html);

      if (tableEntries.length >= 2) {
        entries = tableEntries;
      } else {
        const rawResult = await mammoth.extractRawText({ buffer });
        const rawText = rawResult.value || '';
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
            aiTranslation: !p.uzbekTranslation,
            ocrUncertain: false,
            status: 'valid',
            selected: true,
          } as ExtractedEntry));
        } else {
          entries = await extractFromSmartText(rawText, 'smart_extract');
          entries = entries.map(e => ({ ...e, sourceType: 'docx' as SourceType }));
        }
      }

      source = `📝 ${fileName}`;
    }

    // ── TXT / CSV / XLSX / Other Text Documents ────────────────────────────
    else {
      const extracted = await extractTextFromBuffer(buffer, mime, fileName);
      warnings.push(...extracted.warnings);
      const text = extracted.text;

      if (!text.trim()) {
        return NextResponse.json({
          error: 'Fayldan matn topilmadi yoki fayl bo\'sh.'
        }, { status: 422 });
      }

      const { words: parsed, warnings: pw } = parseVocabText(text);
      warnings.push(...pw);

      if (parsed.length >= 2) {
        entries = parsed.map((p: ParsedWord) => ({
          id: newId(),
          englishWord: p.englishWord,
          uzbekTranslation: p.uzbekTranslation,
          phonetic: p.phonetic,
          exampleSentence: p.exampleSentence,
          sourceType: 'text' as SourceType,
          confidence: 1.0,
          aiTranslation: !p.uzbekTranslation,
          ocrUncertain: false,
          status: 'valid',
          selected: true,
        } as ExtractedEntry));
      } else {
        entries = await extractFromSmartText(text, 'smart_extract');
        entries = entries.map(e => ({ ...e, sourceType: 'text' as SourceType }));
      }

      source = `📄 ${fileName}`;
    }

    // ── Emoji suggestions ─────────────────────────────────────────────────
    if (suggestEmojis && entries.length > 0) {
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
  const rowMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];

  for (const row of rowMatches) {
    const cellMatches = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? [];
    const cells = cellMatches
      .map(c => c.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);

    if (cells.length < 2) continue;

    const english = cells[0];
    const uzbek = cells[1];

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
