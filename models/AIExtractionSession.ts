/**
 * AIExtractionSession.ts
 *
 * Tracks a single AI Reading Vocabulary Extraction job.
 *
 * DESIGN DECISIONS:
 * - extractedText is NOT stored — avoids 16MB BSON limit + privacy concerns.
 *   Only source metadata and final results are persisted.
 * - ideas are stored here ONLY — they are NOT imported to Word collection.
 *   Ideas serve as reading comprehension context for the teacher during review.
 * - TTL: 7 days — sessions auto-deleted after a week.
 * - userId can be teacher or student (same model, different userRole).
 */

import { Schema, model, models } from 'mongoose';

const ExtractionSettingsSchema = new Schema({
    requestedCount: { type: Number, required: true },
    cefr:           { type: String, required: true },
    includePhrases: { type: Boolean, default: false },
    includeIdeas:   { type: Boolean, default: false },
    mode:           { type: String, default: 'reading' },
}, { _id: false });

const SourceDocumentSchema = new Schema({
    originalName:      { type: String },
    mimeType:          { type: String },
    sizeBytes:         { type: Number },
    pageCount:         { type: Number },
    extractionMethod:  { type: String },
}, { _id: false });

const ExtractedVocabItemSchema = new Schema({
    word:               { type: String, required: true },
    uzbekTranslation:   { type: String, default: '' },
    phonetic:           { type: String },
    cefr:               { type: String },
    partOfSpeech:       { type: String },
    definition:         { type: String },
    contextSentence:    { type: String },
    contextTranslation: { type: String },
    importanceScore:    { type: Number, min: 0, max: 1 },
    confidence:         { type: String, enum: ['high', 'medium', 'low'] },
    sourcePage:         { type: Number },
    sourceParagraph:    { type: String },
    itemType:           { type: String, enum: ['word', 'phrase'], default: 'word' },
    teacherEdited:      { type: Boolean, default: false },
}, { _id: false });

const ExtractedIdeaSchema = new Schema({
    title:       { type: String },
    summary:     { type: String },
    importance:  { type: String, enum: ['high', 'medium', 'low'] },
    sourcePage:  { type: Number },
    sourceQuote: { type: String },
}, { _id: false });

const ExtractionResultSchema = new Schema({
    vocabulary:  { type: [ExtractedVocabItemSchema], default: [] },
    phrases:     { type: [ExtractedVocabItemSchema], default: [] },
    ideas:       { type: [ExtractedIdeaSchema], default: [] },
    totalFound:  { type: Number, default: 0 },
    message:     { type: String },
}, { _id: false });

const AIExtractionSessionSchema = new Schema({
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, enum: ['teacher', 'student'], required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'done', 'failed'],
        default: 'pending',
    },
    settings:       { type: ExtractionSettingsSchema, required: true },
    sourceDocument: { type: SourceDocumentSchema },
    result:         { type: ExtractionResultSchema },
    error:          { type: String },
    tokensUsed:    { type: Number },
    processingMs:  { type: Number },
    importedToUnitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    importedAt:       { type: Date },
    createdAt: { type: Date, default: Date.now, index: { expires: '7d' } },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

AIExtractionSessionSchema.index({ userId: 1, createdAt: -1 });
AIExtractionSessionSchema.index({ status: 1 });

const AIExtractionSession = models.AIExtractionSession
    || model('AIExtractionSession', AIExtractionSessionSchema);

export default AIExtractionSession;

export interface AIReadingSettings {
    requestedCount: number;
    cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Mixed' | 'Any';
    includePhrases: boolean;
    includeIdeas: boolean;
    mode?: string;
}

export interface ExtractedVocabItem {
    word: string;
    uzbekTranslation: string;
    phonetic?: string;
    cefr?: string;
    partOfSpeech?: string;
    definition?: string;
    contextSentence?: string;
    contextTranslation?: string;
    importanceScore?: number;
    confidence?: 'high' | 'medium' | 'low';
    sourcePage?: number;
    sourceParagraph?: string;
    itemType: 'word' | 'phrase';
    teacherEdited?: boolean;
}

export interface ExtractedIdea {
    title?: string;
    summary?: string;
    importance?: 'high' | 'medium' | 'low';
    sourcePage?: number;
    sourceQuote?: string;
}

export interface AIExtractionResult {
    vocabulary: ExtractedVocabItem[];
    phrases: ExtractedVocabItem[];
    ideas: ExtractedIdea[];
    metadata: {
        totalFound: number;
        message?: string;
        tokensUsed?: number;
        processingMs?: number;
    };
}
