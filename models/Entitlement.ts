import mongoose, { Schema } from 'mongoose';

export type EntitlementFeature = 'THEME_CREATOR';
export type EntitlementSource = 'SHOP' | 'SYSTEM' | 'ADMIN' | 'TEACHER' | 'REWARD';
export type EntitlementStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

const EntitlementSchema = new Schema(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        feature: {
            type: String,
            enum: ['THEME_CREATOR'],
            required: true,
        },
        source: {
            type: String,
            enum: ['SHOP', 'SYSTEM', 'ADMIN', 'TEACHER', 'REWARD'],
            default: 'SHOP',
        },
        sourceReferenceId: { type: Schema.Types.ObjectId, default: null },
        startsAt: { type: Date, required: true },
        expiresAt: { type: Date, required: true, index: true },
        status: {
            type: String,
            enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
            default: 'ACTIVE',
        },
    },
    { timestamps: true }
);

EntitlementSchema.index({ studentId: 1, feature: 1 });
EntitlementSchema.index({ expiresAt: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Entitlement) {
    delete (mongoose.models as any).Entitlement;
}

const Entitlement = mongoose.models.Entitlement || mongoose.model('Entitlement', EntitlementSchema);
export default Entitlement;
