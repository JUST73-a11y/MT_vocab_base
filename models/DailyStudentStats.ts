import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Pre-aggregated daily stats for a student to avoid heavy aggregation on /stats GET.
 * Updated incrementally on every quiz answer.
 */
const DailyStudentStatsSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD (Tashkent Time)
    wordsSeen: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    // unitStats maps unitId -> { seen, correct }
    unitStats: {
        type: Map,
        of: {
            seen: { type: Number, default: 0 },
            correct: { type: Number, default: 0 }
        },
        default: {}
    },
    updatedAt: { type: Date, default: Date.now }
});

// Unique index to allow atomic $inc with upsert
DailyStudentStatsSchema.index({ studentId: 1, date: 1 }, { unique: true });

const DailyStudentStats = models.DailyStudentStats || model('DailyStudentStats', DailyStudentStatsSchema);
export default DailyStudentStats;
