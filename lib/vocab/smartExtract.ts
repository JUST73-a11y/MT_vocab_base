/**
 * smartExtract.ts
 * Shared types for the Smart Vocabulary Import pipeline.
 *
 * PIPELINE (immutable):
 * SOURCE → EXTRACT → STRUCTURE → VALIDATE → PREVIEW → TEACHER REVIEW → CONFIRM → SAVE
 *
 * Nothing is saved to DB until explicit teacher confirmation.
 * Teacher-provided data always overrides AI-generated data.
 */

export type SourceType =
  | 'text'          // plain/pasted text, deterministic parse
  | 'image'         // jpg/png/webp, Gemini Vision OCR
  | 'pdf'           // pdf, text layer or Gemini native
  | 'docx'          // docx, mammoth + Gemini
  | 'ai_translation'// AI-generated translation (no original)
  | 'smart';        // auto-detected

export type EntryStatus =
  | 'valid'          // ready to save
  | 'needs_review'   // low confidence or OCR uncertain
  | 'duplicate'      // already exists in target unit
  | 'error';         // unparseable

export type EmojiSource = 'automatic' | 'teacher_selected';

export interface ExtractedEntry {
  /** Ephemeral UUID — for React key and teacher selection tracking only */
  id: string;
  englishWord: string;
  uzbekTranslation: string;
  phonetic?: string;
  exampleSentence?: string;
  partOfSpeech?: string;
  emoji?: string;
  emojiSource?: EmojiSource;
  sourceType: SourceType;
  /** Human-readable source location: "page 3", "region 2", "line 14" */
  sourceReference?: string;
  /** 0–1. 1.0 = deterministic parse (certain). <0.70 = needs manual review. */
  confidence: number;
  /** Translation was AI-generated (not teacher-provided). Must be visible to teacher. */
  aiTranslation: boolean;
  /** OCR engine flagged this as uncertain. */
  ocrUncertain?: boolean;
  status: EntryStatus;
  /** _id of existing Word document if status === 'duplicate' */
  duplicateOf?: string;
  /** Teacher can deselect rows before final save */
  selected: boolean;
  parseWarning?: string;
}

export interface ExtractionResult {
  entries: ExtractedEntry[];
  /** Human-readable source description, e.g. "vocabulary.pdf (28 pages)" */
  source: string;
  pagesAnalyzed?: number;
  warnings: string[];
}

export interface TranslationResult {
  /** word → generated Uzbek translation */
  translations: Record<string, string>;
}

export interface EmojiResult {
  /** word → suggested emoji (or empty string if none) */
  emojis: Record<string, string>;
}

/** Payload sent to /api/teacher/vocab-import/save */
export interface SavePayload {
  unitId: string;
  entries: FinalEntry[];
}

/** Stripped-down entry used for the actual DB write */
export interface FinalEntry {
  englishWord: string;
  uzbekTranslation: string;
  phonetic?: string;
  exampleSentence?: string;
  emoji?: string;
  emojiSource?: EmojiSource;
  sourceType?: SourceType;
  confidence?: number;
}

/** Confidence thresholds */
export const CONFIDENCE = {
  HIGH: 0.9,
  MEDIUM: 0.7,
} as const;

export function confidenceLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= CONFIDENCE.HIGH) return 'high';
  if (score >= CONFIDENCE.MEDIUM) return 'medium';
  return 'low';
}
