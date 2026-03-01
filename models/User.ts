import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainTextPassword: { type: String, default: null }, // For admin visibility only
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    totalWordsSeen: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },

    // Email OTP verification
    isVerified: { type: Boolean, default: true },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // Teacher-Student Binding
    teacherCode: { type: String, unique: true, sparse: true }, // Only for teachers
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Only for students
});

// In development, clear the cached model so schema changes don't require a full restart
if (process.env.NODE_ENV !== 'production' && mongoose.models.User) {
    delete (mongoose.models as any).User;
}

// Performance indexes
UserSchema.index({ teacherId: 1 });
UserSchema.index({ role: 1 });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
