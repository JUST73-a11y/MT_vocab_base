import mongoose, { Schema, model, models } from 'mongoose';

const QuizAnswerSchema = new Schema({
    attemptId: { type: Schema.Types.ObjectId, ref: 'QuizAttempt', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wordId: { type: Schema.Types.ObjectId, ref: 'Word', required: true },
    wordSnapshot: {
        en: { type: String, required: true },
        uz: { type: String, required: true },
    },
    selectedOption: { type: String, required: false, default: null },
    selectedText: { type: String, required: false, default: null },
    isCorrect: { type: Boolean, required: true },
    isTimeout: { type: Boolean, default: false },
    modeAtAnswerTime: { type: String, enum: ['EN', 'UZ'], default: 'EN' },
    servedAt: { type: Date },
    answeredAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

QuizAnswerSchema.index({ attemptId: 1 });
QuizAnswerSchema.index({ studentId: 1, answeredAt: -1 });

const QuizAnswer = models.QuizAnswer || model('QuizAnswer', QuizAnswerSchema);
export default QuizAnswer;
