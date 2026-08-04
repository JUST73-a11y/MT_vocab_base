import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    visiblePassword: { type: String }, // Store for admin view
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    totalWordsSeen: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },

    // Email OTP verification
    isVerified: { type: Boolean, default: true },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    // Active Tracking & Device
    lastActiveAt: { type: Date, default: null },
    lastDevice: { type: String, default: null },
    lastOs: { type: String, default: null },
    lastBrowser: { type: String, default: null },

    // Teacher-Student Binding
    teacherCode: { type: String, unique: true, sparse: true }, // Only for teachers
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // Only for students

    // Vocabulary Game
    warningCard: { type: Boolean, default: false }, // True if student scored 0 in a vocab session
    needsPasswordSetup: { type: Boolean, default: false }, // True for teacher-created students on first login
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
