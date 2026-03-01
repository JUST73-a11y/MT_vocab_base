import mongoose, { Schema, model, models } from 'mongoose';

const StudentProfileSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Reference to the User (Teacher)
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    joinedAt: { type: Date, default: null },
}, { timestamps: true });

// Prevent model overwrite in development
const StudentProfile = models.StudentProfile || model('StudentProfile', StudentProfileSchema);

export default StudentProfile;
