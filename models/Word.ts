import mongoose, { Schema, model, models } from 'mongoose';

const WordSchema = new Schema({
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    englishWord: { type: String, required: true },
    uzbekTranslation: { type: String, required: true },
    phonetic: { type: String },
    exampleSentence: { type: String },
    audioUrl: { type: String },
    // Smart Import metadata — optional, does not affect existing functionality
    emoji: { type: String },
    emojiSource: { type: String, enum: ['automatic', 'teacher_selected'] },
    sourceType: { type: String },   // "text" | "image" | "pdf" | "docx" | "ai_translation" | "ai_reading"
    confidence: { type: Number },   // 0–1 float; 1.0 = teacher-entered directly
    createdAt: { type: Date, default: Date.now },

    // ── AI Reading Vocabulary Extractor fields ─────────────────────────────
    // All optional. Existing words keep null/undefined — no migration needed.

    /** Item type. CRITICAL: games/quiz must always filter itemType !== 'phrase' when needed.
     *  Default 'word' keeps full backward compatibility with all existing queries. */
    itemType: {
        type: String,
        enum: ['word', 'phrase'],
        default: 'word',
    },

    /** CEFR level assigned by AI. Null for manually-entered words. */
    cefr: {
        type: String,
        enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', null],
        default: null,
    },

    /** Part of speech (extended). */
    partOfSpeech: { type: String },   // verb|noun|adjective|adverb|phrase|other

    /** English definition (AI-generated for reading vocab). */
    definition: { type: String },

    /** Uzbek translation of the context sentence (AI-generated). */
    contextTranslation: { type: String },

    /** AI importance score 0.0–1.0 for ranking during extraction. Not exposed to students. */
    importanceScore: { type: Number, min: 0, max: 1 },

    /** Metadata from AI Reading Extractor — never null-checked by games/quiz. */
    aiMetadata: {
        /** Reference to AIExtractionSession that produced this word */
        extractionSessionId: { type: Schema.Types.ObjectId, ref: 'AIExtractionSession' },
        /** AI confidence in this extraction: 'high'|'medium'|'low' */
        confidence: { type: String, enum: ['high', 'medium', 'low'] },
        /** Original filename the word was extracted from */
        sourceDocumentName: { type: String },
        /** Page number in source document (if applicable) */
        sourcePage: { type: Number },
        /** Exact source sentence from which this word was extracted */
        sourceContext: { type: String },
        /** Timestamp when the AI extraction was approved and imported */
        importedAt: { type: Date },
    },
});


// Index for high-performance querying by unitId
WordSchema.index({ unitId: 1 });

const Word = models.Word || model('Word', WordSchema);

export default Word;
