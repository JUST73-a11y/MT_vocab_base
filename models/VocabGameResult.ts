import mongoose, { Schema, model, models } from 'mongoose';

/**
 * VocabGameResult — stores each student's final result for a VocabGameSession.
 */
const VocabGameResultSchema = new Schema({
    sessionId:    { type: Schema.Types.ObjectId, ref: 'VocabGameSession', required: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId:      { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    teacherId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId:       { type: Schema.Types.ObjectId, ref: 'Unit' },
    unitIds:      [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    questionsAsked: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount:   { type: Number, default: 0 },
    accuracy:     { type: Number, default: 0 }, // 0–100 percentage
    rank:         { type: Number, default: 0 },
    warningCard:  { type: Boolean, default: false }, // true if correctCount === 0
    wordIds:      [{ type: Schema.Types.ObjectId, ref: 'Word' }], // words shown to this student
    createdAt:    { type: Date, default: Date.now },
});

VocabGameResultSchema.index({ sessionId: 1, rank: 1 });
VocabGameResultSchema.index({ studentId: 1, createdAt: -1 });
VocabGameResultSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

const VocabGameResult = models.VocabGameResult || model('VocabGameResult', VocabGameResultSchema);
export default VocabGameResult;
