import mongoose, { Schema } from 'mongoose';

const DuelChallengeSchema = new Schema(
    {
        challengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        roomId: { type: String, required: true },
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
            default: 'PENDING',
            index: true,
        },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.DuelChallenge) {
    delete (mongoose.models as any).DuelChallenge;
}

const DuelChallenge = mongoose.models.DuelChallenge || mongoose.model('DuelChallenge', DuelChallengeSchema);
export default DuelChallenge;