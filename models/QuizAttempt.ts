import mongoose, { Schema, model, models } from 'mongoose';

const QuizAttemptSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    sessionId: { type: Schema.Types.ObjectId, ref: 'GroupQuizSession' },
    unitIds: [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    mode: { type: String, enum: ['STUDENT_SELF', 'GROUP_SESSION'], required: true },
    correctCount: { type: Number, default: 0 },
    answeredCount: { type: Number, default: 0 },
    wordIds: [{ type: Schema.Types.ObjectId, ref: 'Word' }],
    usedWordIds: [{ type: Schema.Types.ObjectId, ref: 'Word' }],
    // Server-side correctOptionId memo: { wordId: correctOptionId }
    _qMemo: { type: Object, default: {} },
    startedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 60 },
    endedAt: { type: Date },
});

QuizAttemptSchema.index({ studentId: 1, startedAt: -1 });
QuizAttemptSchema.index({ sessionId: 1 });

const QuizAttempt = models.QuizAttempt || model('QuizAttempt', QuizAttemptSchema);
export default QuizAttempt;
