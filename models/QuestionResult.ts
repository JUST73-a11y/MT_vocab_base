import mongoose, { Schema, model, models } from 'mongoose';

/**
 * QuestionResult — stores every individual question asked in a VocabGameSession.
 * Preserves exact snapshots of the student name and vocabulary word at the time asked.
 */
const QuestionResultSchema = new Schema({
    sessionId: { type: Schema.Types.ObjectId, ref: 'VocabGameSession', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customStudentId: { type: String }, // e.g. "M00001"
    studentNameSnapshot: { type: String, required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vocabularyId: { type: Schema.Types.ObjectId, ref: 'Word', required: true },
    wordSnapshot: {
        englishWord: { type: String, required: true },
        uzbekTranslation: { type: String, required: true },
        phonetic: { type: String, default: '' },
        emoji: { type: String, default: '' },
    },
    result: { type: String, enum: ['correct', 'wrong'], required: true },
    responseTimeMs: { type: Number, default: 0 },
    questionIndex: { type: Number, default: 0 },
    askedAt: { type: Date, default: Date.now },
});

// Indexes for query performance and analytics
QuestionResultSchema.index({ sessionId: 1, studentId: 1 });
QuestionResultSchema.index({ sessionId: 1, askedAt: 1 });
QuestionResultSchema.index({ vocabularyId: 1, result: 1 });
QuestionResultSchema.index({ studentId: 1, result: 1 });
QuestionResultSchema.index({ groupId: 1, askedAt: -1 });

// Ensure hot reload in development doesn't hold stale schemas
if (process.env.NODE_ENV !== 'production' && mongoose.models.QuestionResult) {
    delete (mongoose.models as any).QuestionResult;
}

const QuestionResult = models.QuestionResult || model('QuestionResult', QuestionResultSchema);

export default QuestionResult;
