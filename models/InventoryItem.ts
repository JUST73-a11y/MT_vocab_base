import mongoose, { Schema } from 'mongoose';

const InventoryItemSchema = new Schema(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        itemId: { type: Schema.Types.ObjectId, ref: 'ShopItem', required: true },
        purchaseId: { type: Schema.Types.ObjectId, ref: 'ShopPurchase', required: true },
        itemType: { type: String, required: true },
        itemName: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 0 },
        status: {
            type: String,
            enum: ['AVAILABLE', 'USED', 'EXPIRED'],
            default: 'AVAILABLE',
        },
        // Type-specific: { denomination: 10 } for DOLLAR_CARD, { energyAmount: 30 } for ENERGY_STACK
        metadata: { type: Schema.Types.Mixed, default: {} },
        acquiredAt: { type: Date, default: Date.now },
        usedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

InventoryItemSchema.index({ studentId: 1, itemType: 1 });
InventoryItemSchema.index({ studentId: 1, status: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.InventoryItem) {
    delete (mongoose.models as any).InventoryItem;
}

const InventoryItem = mongoose.models.InventoryItem || mongoose.model('InventoryItem', InventoryItemSchema);
export default InventoryItem;
