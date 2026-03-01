import mongoose, { Schema, model, models } from 'mongoose';

const UnitShareSchema = new Schema({
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    fromTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permission: { type: String, enum: ['VIEW', 'MANAGE'], default: 'VIEW' },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REVOKED'], default: 'PENDING' },
    createdAt: { type: Date, default: Date.now },
});

// Prevent multiple active shares for the same unit to the same teacher
UnitShareSchema.index({ unitId: 1, toTeacherId: 1 }, { unique: true });

// Performance indexes
UnitShareSchema.index({ fromTeacherId: 1 });
UnitShareSchema.index({ toTeacherId: 1 });

const UnitShare = models.UnitShare || model('UnitShare', UnitShareSchema);

export default UnitShare;
