import mongoose, { Schema, model, models } from 'mongoose';

const TeacherMessageSchema = new Schema({
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: 172800 }, // 48 hours TTL
});

// Index for sender and receiver lookup
TeacherMessageSchema.index({ senderId: 1, createdAt: -1 });
TeacherMessageSchema.index({ receiverId: 1, createdAt: -1 });

const TeacherMessage = models.TeacherMessage || model('TeacherMessage', TeacherMessageSchema);

export default TeacherMessage;
