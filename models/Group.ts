import mongoose, { Schema, model, models } from 'mongoose';

const GroupSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

// Performance index
GroupSchema.index({ teacherId: 1 });

const Group = models.Group || model('Group', GroupSchema);

export default Group;
