/**
 * documentTextExtractor.ts
 *
 * Unified file-to-text extraction pipeline.
 * Supports: PDF, DOCX, Images (OCR), XLSX, CSV, TXT.
 *
 * Reuses existing infrastructure:
 *   - pdf-parse  (PDF text layer)
 *   - mammoth    (DOCX)
 *   - gemini     (image OCR + scanned PDF fallback)
 *   - xlsx       (XLS/XLSX)
 *
 * Files are processed in-memory — nothing written to disk.
 * This service is caller-agnostic (works for teacher and student).
 */

import { isGeminiConfigured } from './geminiClient';

export type ExtractionMethod =
  | 'pdf-parse'
  | 'mammoth'
  | 'gemini-vision'
  | 'gemini-pdf'
  | 'xlsx'
  | 'csv'
  | 'plaintext';

export interface DocumentTextResult {
  text: string;
  pageCount?: number;
  mimeType: string;
  method: ExtractionMethod;
  warnings: string[];
}

// ── Size limits ──────────────────────────────────────────────────────────
const MAX_SIZE_MB = {
  image: 10,
  pdf:   20,
  docx:  10,
  xlsx:  5,
  csv:   2,
  txt:   5,
} as const;

const MB = 1024 * 1024;

// ── Allowed MIME types ───────────────────────────────────────────────────
const ALLOWED_MIME: Record<string, keyof typeof MAX_SIZE_MB> = {
  'image/jpeg':                                       'image',
  'image/jpg':                                        'image',
  'image/png':                                        'image',
  'image/webp':                                       'image',
  'application/pdf':                                  'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword':                               'docx',
  'application/vnd.ms-excel':                         'xlsx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/csv':                                         'csv',
  'text/plain':                                       'txt',
};

function getFileCategory(mimeType: string, fileName?: string): keyof typeof MAX_SIZE_MB | null {
  const direct = ALLOWED_MIME[mimeType] ?? ALLOWED_MIME[mimeType.toLowerCase()];
  if (direct) return direct;

  if (!fileName) return null;
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'image';
  if (['xlsx', 'xls'].includes(ext)) return 'xlsx';
  if (ext === 'csv') return 'csv';
  if (['txt', 'text', 'md'].includes(ext)) return 'txt';

  return null;
}

export function validateFile(
  mimeType: string,
  sizeBytes: number,
  fileName?: string
): { ok: true } | { ok: false; error: string } {
  const category = getFileCategory(mimeType, fileName);
  if (!category) {
    return { ok: false, error: `Qo'llab-quvvatlanmaydigan fayl turi (${mimeType || fileName || 'noma\'lum'}). PDF, DOCX, TXT, XLSX, CSV yoki rasm yuklang.` };
  }
  const limitMB = MAX_SIZE_MB[category];
  if (sizeBytes > limitMB * MB) {
    return { ok: false, error: `Fayl hajmi ${limitMB} MB dan oshmasligi kerak` };
  }
  return { ok: true };
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<DocumentTextResult> {
  const warnings: string[] = [];
  const category = getFileCategory(mimeType, fileName) || 'txt';
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // ── Image → Gemini Vision OCR ──────────────────────────────────────────
  if (category === 'image') {
    if (!isGeminiConfigured()) {
      return { text: '', mimeType, method: 'gemini-vision', warnings: ['Gemini API sozlanmagan — rasm matnini o\'qib bo\'lmadi'] };
    }
    const base64 = buffer.toString('base64');
    const rawText = await extractRawTextFromImageViaGemini(base64, mimeType);
    return { text: rawText, mimeType, method: 'gemini-vision', warnings };
  }

  // ── PDF ────────────────────────────────────────────────────────────────
  if (category === 'pdf' || ext === 'pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      const text = result.text?.trim() ?? '';
      const pageCount = result.numpages;

      // If pdf-parse extracted text (even short vocab list), use it
      if (text.length > 5) {
        return { text, pageCount, mimeType, method: 'pdf-parse', warnings };
      }

      // Scanned PDF fallback → Gemini native PDF
      warnings.push('PDF matnli qatlam topilmadi — AI skanerlash ishlatilmoqda');
      if (!isGeminiConfigured()) {
        return { text: '', pageCount, mimeType, method: 'gemini-pdf', warnings: [...warnings, 'Gemini API sozlanmagan'] };
      }
      const pdfBase64 = buffer.toString('base64');
      const rawText = await extractRawTextFromPdfViaGemini(pdfBase64, pageCount);
      return { text: rawText, pageCount, mimeType, method: 'gemini-pdf', warnings };
    } catch (err: any) {
      // Fallback to Gemini PDF OCR
      if (isGeminiConfigured()) {
        try {
          const pdfBase64 = buffer.toString('base64');
          const rawText = await extractRawTextFromPdfViaGemini(pdfBase64);
          if (rawText.trim().length > 5) {
            return { text: rawText, mimeType, method: 'gemini-pdf', warnings };
          }
        } catch {}
      }
      warnings.push(`PDF o'qishda xato: ${err?.message ?? "Noma'lum xato"}`);
      return { text: '', mimeType, method: 'pdf-parse', warnings };
    }
  }

  // ── DOCX ───────────────────────────────────────────────────────────────
  if (category === 'docx' || ext === 'docx' || ext === 'doc') {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim() ?? '';
      if (result.messages?.length) {
        warnings.push(...result.messages.map((m: any) => m.message).slice(0, 3));
      }
      return { text, mimeType, method: 'mammoth', warnings };
    } catch (err: any) {
      warnings.push(`DOCX o'qishda xato: ${err?.message ?? "Noma'lum xato"}`);
      return { text: '', mimeType, method: 'mammoth', warnings };
    }
  }

  // ── XLSX / XLS ─────────────────────────────────────────────────────────
  if (category === 'xlsx' || ext === 'xlsx' || ext === 'xls') {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const lines: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet, { strip: true });
        if (csv.trim()) {
          lines.push(`=== ${sheetName} ===`);
          lines.push(csv);
        }
      }
      return { text: lines.join('\n'), mimeType, method: 'xlsx', warnings };
    } catch (err: any) {
      warnings.push(`XLSX o'qishda xato: ${err?.message ?? "Noma'lum xato"}`);
      return { text: '', mimeType, method: 'xlsx', warnings };
    }
  }

  // ── CSV ────────────────────────────────────────────────────────────────
  if (category === 'csv' || ext === 'csv') {
    const text = buffer.toString('utf-8').trim();
    return { text, mimeType, method: 'csv', warnings };
  }

  // ── Plain text / TXT / Markdown ────────────────────────────────────────
  const text = buffer.toString('utf-8').trim();
  return { text, mimeType: 'text/plain', method: 'plaintext', warnings };
}

// ── Gemini raw text extraction helpers ─────────────────────────────────────
async function extractRawTextFromImageViaGemini(
  base64: string,
  mimeType: string
): Promise<string> {
  const { generateContentWithFallback } = await import('./geminiClient');
  const prompt = `Extract ALL text content from this image exactly as it appears.
Return the full text without any commentary, formatting suggestions, or analysis.
Preserve paragraph structure with line breaks.
If the image contains no readable text, return an empty string.`;

  const imagePart = { inlineData: { data: base64, mimeType: mimeType as any } };
  try {
    const raw = await generateContentWithFallback([prompt, imagePart], {
      temperature: 0.0,
      maxOutputTokens: 4096,
    });
    return raw.trim();
  } catch {
    return '';
  }
}

async function extractRawTextFromPdfViaGemini(
  pdfBase64: string,
  pageCount?: number
): Promise<string> {
  const { generateContentWithFallback } = await import('./geminiClient');
  const prompt = `Extract ALL text content from this PDF document.
Return the complete text preserving paragraph structure and all words.
Include page breaks as "--- Page N ---" markers where detectable.
Do not add any commentary or analysis.`;

  const pdfPart = { inlineData: { data: pdfBase64, mimeType: 'application/pdf' as any } };
  try {
    const raw = await generateContentWithFallback([prompt, pdfPart], {
      temperature: 0.0,
      maxOutputTokens: 8192,
    });
    return raw.trim();
  } catch {
    return '';
  }
}
