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
    sourceType: { type: String },   // "text" | "image" | "pdf" | "docx" | "ai_translation"
    confidence: { type: Number },   // 0–1 float; 1.0 = teacher-entered directly
    createdAt: { type: Date, default: Date.now },
});


// Index for high-performance querying by unitId
WordSchema.index({ unitId: 1 });

const Word = models.Word || model('Word', WordSchema);

export default Word;
