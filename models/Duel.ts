import mongoose, { Schema, model, models } from 'mongoose';

const DuelQuestionSchema = new Schema({
    word: { type: String, required: true },
    correctTranslation: { type: String, required: true },
    options: [{ type: String, required: true }],
    audioUrl: { type: String, default: null },
});

const DuelPlayerScoreSchema = new Schema({
    isFinished: { type: Boolean, default: false },
    correctCount: { type: Number, default: 0 },
    timeSpentSec: { type: Number, default: 0 },
    answers: [{
        questionIndex: { type: Number, required: true },
        selected: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
    }],
    completedAt: { type: Date, default: null },
});

const DuelSchema = new Schema({
    challengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    opponentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'DECLINED', 'EXPIRED'],
        default: 'PENDING',
    },
    questions: [DuelQuestionSchema],
    challengerScore: { type: DuelPlayerScoreSchema, default: () => ({ isFinished: false, correctCount: 0, timeSpentSec: 0, answers: [] }) },
    opponentScore: { type: DuelPlayerScoreSchema, default: () => ({ isFinished: false, correctCount: 0, timeSpentSec: 0, answers: [] }) },
    winnerId: { type: Schema.Types.Mixed, default: null }, // ObjectId or 'DRAW'
    rewardCoins: { type: Number, default: 20 },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
});

DuelSchema.index({ challengerId: 1, createdAt: -1 });
DuelSchema.index({ opponentId: 1, status: 1 });
DuelSchema.index({ groupId: 1, createdAt: -1 });

const Duel = models.Duel || model('Duel', DuelSchema);
export default Duel;
