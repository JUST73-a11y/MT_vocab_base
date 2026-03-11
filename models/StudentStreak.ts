import mongoose, { Schema, model, models } from 'mongoose';

const StudentStreakSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: String, default: null }, // 'YYYY-MM-DD' Tashkent time
    totalActiveDays: { type: Number, default: 0 },
}, { timestamps: true });

const StudentStreak = models.StudentStreak || model('StudentStreak', StudentStreakSchema);
export default StudentStreak;
