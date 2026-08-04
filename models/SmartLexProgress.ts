import mongoose, { Schema, model, models } from 'mongoose';

const SmartLexProgressSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    // Which of the 10 activities have been completed
    completedActivities: { type: [String], default: [] },
    // Word IDs that have been mastered (correctly answered)
    masteredWordIds: [{ type: Schema.Types.ObjectId, ref: 'Word' }],
    // Total sessions played on this unit
    sessionCount: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    // Active session for Continue Learning feature
    activeSession: {
        wordIds: [{ type: Schema.Types.ObjectId, ref: 'Word' }],
        currentStageIndex: { type: Number, default: 0 },
        lastActivity: { type: Date, default: null },
    },
}, { timestamps: true });

SmartLexProgressSchema.index({ studentId: 1, unitId: 1 }, { unique: true });

const SmartLexProgress = models.SmartLexProgress || model('SmartLexProgress', SmartLexProgressSchema);
export default SmartLexProgress;
