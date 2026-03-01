import mongoose, { Schema, model, models } from 'mongoose';

const GroupUnitAccessSchema = new Schema({
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    grantedByTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grantedAt: { type: Date, default: Date.now },
});

// Group can only have access to a unit once
GroupUnitAccessSchema.index({ groupId: 1, unitId: 1 }, { unique: true });

const GroupUnitAccess = models.GroupUnitAccess || model('GroupUnitAccess', GroupUnitAccessSchema);

export default GroupUnitAccess;
