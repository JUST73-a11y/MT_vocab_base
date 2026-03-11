import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Tracks words that a student has answered incorrectly in quizzes.
 * Used for the "Yodlash" (Mistakes) page and REVIEW_WRONGS quiz mode.
 */
const StudentMistakeWordSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wordId: { type: Schema.Types.ObjectId, ref: 'Word', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    wrongCount: { type: Number, default: 1 },
    lastWrongAt: { type: Date, default: Date.now },
    isLearned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

StudentMistakeWordSchema.index({ studentId: 1, wordId: 1 }, { unique: true });
StudentMistakeWordSchema.index({ studentId: 1, wrongCount: -1 });
StudentMistakeWordSchema.index({ studentId: 1, lastWrongAt: -1 });

const StudentMistakeWord = models.StudentMistakeWord || model('StudentMistakeWord', StudentMistakeWordSchema);
export default StudentMistakeWord;
