import mongoose, { Schema, model, models } from 'mongoose';

const GroupQuizResultSnapshotSchema = new Schema({
    sessionId: { type: Schema.Types.ObjectId, ref: 'GroupQuizSession', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rank: { type: Number, required: true },
    correctCount: { type: Number, default: 0 },
    answeredCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // percentage 0-100
    createdAt: { type: Date, default: Date.now },
});

GroupQuizResultSnapshotSchema.index({ sessionId: 1, rank: 1 });
GroupQuizResultSnapshotSchema.index({ studentId: 1, createdAt: -1 });

const GroupQuizResultSnapshot = models.GroupQuizResultSnapshot || model('GroupQuizResultSnapshot', GroupQuizResultSnapshotSchema);
export default GroupQuizResultSnapshot;
