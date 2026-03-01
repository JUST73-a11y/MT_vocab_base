import mongoose, { Schema, model, models } from 'mongoose';

const WalletSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date, default: Date.now },
});

WalletSchema.index({ studentId: 1 }, { unique: true });

const Wallet = models.Wallet || model('Wallet', WalletSchema);
export default Wallet;
