import mongoose, { Schema } from 'mongoose';

export type ShopItemType =
    | 'THEME_CREATOR_ACCESS'
    | 'SMART_CARD'
    | 'DOLLAR_CARD'
    | 'ENERGY_STACK'
    | 'CUSTOM';

const ShopItemSchema = new Schema(
    {
        teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, default: '', maxlength: 500 },
        imageUrl: { type: String, default: null },
        type: {
            type: String,
            enum: ['THEME_CREATOR_ACCESS', 'SMART_CARD', 'DOLLAR_CARD', 'ENERGY_STACK', 'CUSTOM'],
            required: true,
        },
        price: { type: Number, required: true, min: 0 },
        isUnlimitedStock: { type: Boolean, default: true },
        stock: { type: Number, default: 0, min: 0 },
        isActive: { type: Boolean, default: true, index: true },
        requiresApproval: { type: Boolean, default: false },
        visibilityType: { type: String, enum: ['ALL', 'GROUP', 'STUDENT'], default: 'ALL' },
        groupIds: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
        studentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        effect: { type: Schema.Types.Mixed, default: null },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

ShopItemSchema.index({ teacherId: 1, isActive: 1 });
ShopItemSchema.index({ isActive: 1, type: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.ShopItem) {
    delete (mongoose.models as any).ShopItem;
}

const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', ShopItemSchema);
export default ShopItem;
