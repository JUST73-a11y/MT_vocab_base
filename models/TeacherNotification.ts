import mongoose, { Schema, model, models } from 'mongoose';

const TeacherNotificationSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    type: { type: String, default: 'CERTIFICATE_AWARDED' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    unitTitle: { type: String, default: '' },
    certId: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

const TeacherNotification = models.TeacherNotification || model('TeacherNotification', TeacherNotificationSchema);
export default TeacherNotification;
