import mongoose, { Schema, model, models } from 'mongoose';

const TeacherProfileSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    teacherCode: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });

// Prevent model overwrite in development
const TeacherProfile = models.TeacherProfile || model('TeacherProfile', TeacherProfileSchema);

export default TeacherProfile;
