import mongoose, { Schema, model, models } from 'mongoose';

const CoinTransactionSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // null for system/quiz earn
    type: {
        type: String,
        enum: ['EARN_QUIZ', 'REDEEM_TEACHER', 'ADJUST_ADMIN'],
        required: true,
    },
    amount: { type: Number, required: true }, // positive = earn, negative = deduct
    meta: { type: Schema.Types.Mixed, default: {} }, // { attemptId, correctCount, answeredCount } or { reason, note }
    createdAt: { type: Date, default: Date.now },
});

CoinTransactionSchema.index({ studentId: 1, createdAt: -1 });
CoinTransactionSchema.index({ teacherId: 1, createdAt: -1 });
CoinTransactionSchema.index({ type: 1, createdAt: -1 });

const CoinTransaction = models.CoinTransaction || model('CoinTransaction', CoinTransactionSchema);
export default CoinTransaction;
