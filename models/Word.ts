import mongoose, { Schema, model, models } from 'mongoose';

const WordSchema = new Schema({
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    englishWord: { type: String, required: true },
    uzbekTranslation: { type: String, required: true },
    phonetic: { type: String },
    exampleSentence: { type: String },
    audioUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
});

// Index for high-performance querying by unitId
WordSchema.index({ unitId: 1 });

const Word = models.Word || model('Word', WordSchema);

export default Word;
