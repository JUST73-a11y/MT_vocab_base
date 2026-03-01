import mongoose, { Schema, model, models } from 'mongoose';

const SessionSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wordsSeen: [{ type: String }], // Array of word IDs
    date: { type: String, required: true }, // Format YYYY-MM-DD
    wordsCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

// Unique compound index so one session per student per day
SessionSchema.index({ studentId: 1, date: 1 }, { unique: true });

const Session = models.Session || model('Session', SessionSchema);

export default Session;
