import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Stores incremental student scores for a specific group quiz session.
 * Updated on every quiz answer. Used for ultra-fast live leaderboard.
 */
const SessionScoreSchema = new Schema({
    sessionId: { type: Schema.Types.ObjectId, ref: 'GroupQuizSession', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    correctCount: { type: Number, default: 0 },
    answeredCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    lastAnsweredAt: { type: Date, default: Date.now }
});

// Index for fast leaderboard sorting
// Sort by correct (primary), then accuracy (secondary), then speed (lastAnsweredAt)
SessionScoreSchema.index({ sessionId: 1, correctCount: -1, accuracy: -1, lastAnsweredAt: 1 });
SessionScoreSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

const SessionScore = models.SessionScore || model('SessionScore', SessionScoreSchema);
export default SessionScore;
