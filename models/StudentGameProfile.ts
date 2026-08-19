import mongoose, { Schema } from 'mongoose';

export const LEVELS = [
    { level: 1, name: "Yangi boshlovchi", xpNeeded: 0, icon: "🌱", color: '#6ee7b7' },
    { level: 2, name: "O'rganuvchi", xpNeeded: 100, icon: "📖", color: '#60a5fa' },
    { level: 3, name: "So'z ustasi", xpNeeded: 300, icon: "⚡", color: '#a78bfa' },
    { level: 4, name: "Leksikon", xpNeeded: 700, icon: "🧠", color: '#f59e0b' },
    { level: 5, name: "Vocabulary Master", xpNeeded: 1500, icon: "🏆", color: '#f87171' },
];

const StudentGameProfileSchema = new Schema(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        xp: { type: Number, default: 0, min: 0 },
        level: { type: Number, default: 1, min: 1 },
        title: { type: String, default: 'Boshlovchi' },

        totalCorrect: { type: Number, default: 0 },
        totalQuizzes: { type: Number, default: 0 },
        totalMistakesFixed: { type: Number, default: 0 },
        badges: [{ type: Schema.Types.Mixed }],

        // Speed run stats
        highSpeedRunScore: { type: Number, default: 0 },
        totalSpeedRunGames: { type: Number, default: 0 },

        // Wheel stats
        wheelSpinsCount: { type: Number, default: 0 },
        lastWheelSpinAt: { type: Date, default: null },

        // Quests tracking for current UTC date
        dailyQuestsDate: { type: String, default: '' },
        completedQuests: [{ type: String }],
        questProgress: { type: Schema.Types.Mixed, default: {} },

        // Friends
        friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

if (process.env.NODE_ENV !== 'production' && mongoose.models.StudentGameProfile) {
    delete (mongoose.models as any).StudentGameProfile;
}

const StudentGameProfile = mongoose.models.StudentGameProfile || mongoose.model('StudentGameProfile', StudentGameProfileSchema);
export default StudentGameProfile;