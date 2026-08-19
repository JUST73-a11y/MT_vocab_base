import mongoose, { Schema } from 'mongoose';

const FriendshipSchema = new Schema(
    {
        requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
            default: 'PENDING',
            index: true,
        },
    },
    { timestamps: true }
);

FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Friendship) {
    delete (mongoose.models as any).Friendship;
}

const Friendship = mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);
export default Friendship;