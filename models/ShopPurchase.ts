import mongoose, { Schema } from 'mongoose';

export type PurchaseStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'COMPLETED'
    | 'REFUNDED'
    | 'CANCELLED';

const ShopPurchaseSchema = new Schema(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        itemId: { type: Schema.Types.ObjectId, ref: 'ShopItem', required: true, index: true },
        itemNameSnapshot: { type: String, required: true },
        itemTypeSnapshot: { type: String, required: true },
        priceSnapshot: { type: Number, required: true },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'REFUNDED', 'CANCELLED'],
            default: 'PENDING',
            index: true,
        },
        entitlementId: { type: Schema.Types.ObjectId, ref: 'Entitlement', default: null },
        purchasedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date, default: null },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewNote: { type: String, default: '' },
        idempotencyKey: { type: String, default: null, sparse: true },
    },
    { timestamps: true }
);

ShopPurchaseSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
ShopPurchaseSchema.index({ teacherId: 1, status: 1 });
ShopPurchaseSchema.index({ studentId: 1, createdAt: -1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.ShopPurchase) {
    delete (mongoose.models as any).ShopPurchase;
}

const ShopPurchase = mongoose.models.ShopPurchase || mongoose.model('ShopPurchase', ShopPurchaseSchema);
export default ShopPurchase;
