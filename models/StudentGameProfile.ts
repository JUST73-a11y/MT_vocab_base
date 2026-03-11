import mongoose, { Schema, model, models } from 'mongoose';

// XP thresholds per level
export const LEVELS = [
    { level: 1, name: "Yangi boshlovchi", xpNeeded: 0, icon: "🌱" },
    { level: 2, name: "O'rganuvchi", xpNeeded: 100, icon: "📖" },
    { level: 3, name: "So'z ustasi", xpNeeded: 300, icon: "⚡" },
    { level: 4, name: "Leksikon", xpNeeded: 700, icon: "🧠" },
    { level: 5, name: "Vocabulary Master", xpNeeded: 1500, icon: "🏆" },
];

export interface BadgeType {
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedAt: Date;
}

const StudentGameProfileSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalCorrect: { type: Number, default: 0 },
    totalMistakesFixed: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    badges: [{
        id: String,
        name: String,
        icon: String,
        description: String,
        earnedAt: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

const StudentGameProfile = models.StudentGameProfile || model('StudentGameProfile', StudentGameProfileSchema);
export default StudentGameProfile;
