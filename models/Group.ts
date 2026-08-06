import mongoose, { Schema, model, models } from 'mongoose';

const GroupSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    level: { type: String, default: '' },
    course: { type: String, default: '' },
    vocabularyMode: { type: Boolean, default: true }, // Enable/disable vocab game for this group
    telegramChatId: { type: String, default: '' }, // For automated Telegram reports
    createdAt: { type: Date, default: Date.now },
});

// Performance index
GroupSchema.index({ teacherId: 1 });

const Group = models.Group || model('Group', GroupSchema);

export default Group;
