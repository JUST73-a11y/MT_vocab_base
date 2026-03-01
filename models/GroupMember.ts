import mongoose, { Schema, model, models } from 'mongoose';

const GroupMemberSchema = new Schema({
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
});

// Student can only be in a group once
GroupMemberSchema.index({ groupId: 1, studentId: 1 }, { unique: true });

const GroupMember = models.GroupMember || model('GroupMember', GroupMemberSchema);

export default GroupMember;
