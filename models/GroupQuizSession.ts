import mongoose, { Schema, model, models } from 'mongoose';

const GroupQuizSessionSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    unitIds: [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    questionCount: { type: Number, default: 20 },
    durationMin: { type: Number, default: 10 },
    timeLimitSec: { type: Number, default: 10 }, // per-question timer (seconds)
    status: { type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE' },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

GroupQuizSessionSchema.index({ groupId: 1, status: 1 });
GroupQuizSessionSchema.index({ teacherId: 1, createdAt: -1 });

const GroupQuizSession = models.GroupQuizSession || model('GroupQuizSession', GroupQuizSessionSchema);
export default GroupQuizSession;
