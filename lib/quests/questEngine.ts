import dbConnect from '@/lib/db';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

export interface Quest {
    id: string;
    title: string;
    description: string;
    icon: string;
    goal: number;
    current: number;
    rewardCoins: number;
    rewardXp: number;
    rewardEnergy: number;
    completed: boolean;
    claimed: boolean;
}

export function getTodayDateString(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function getStudentQuests(studentId: string): Promise<Quest[]> {
    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const today = getTodayDateString();

    let profile = await StudentGameProfile.findOne({ studentId: studentObjId });
    if (!profile) {
        profile = await StudentGameProfile.create({ studentId: studentObjId, dailyQuestsDate: today, completedQuests: [], questProgress: {} });
    }

    // Reset daily quests if date changed
    if (profile.dailyQuestsDate !== today) {
        profile.dailyQuestsDate = today;
        profile.completedQuests = [];
        profile.questProgress = {};
        await profile.save();
    }

    const prog = profile.questProgress || {};
    const claimed = profile.completedQuests || [];

    const quests: Quest[] = [
        {
            id: 'PRACTICE_WORDS',
            title: '🎯 So\'z Mashqi',
            description: 'Bugun kamida 25 ta so\'z mashq qiling',
            icon: '📚',
            goal: 25,
            current: Math.min(25, Number(prog.PRACTICE_WORDS) || 0),
            rewardCoins: 80,
            rewardXp: 100,
            rewardEnergy: 1,
            completed: (Number(prog.PRACTICE_WORDS) || 0) >= 25,
            claimed: claimed.includes('PRACTICE_WORDS'),
        },
        {
            id: 'SPEED_RUN_SCORE',
            title: '⚡ Speed Run Usta',
            description: 'Speed Run o\'yinida kamida 10 ta to\'g\'ri so\'z toping',
            icon: '⚡',
            goal: 10,
            current: Math.min(10, Number(prog.SPEED_RUN_SCORE) || 0),
            rewardCoins: 120,
            rewardXp: 150,
            rewardEnergy: 2,
            completed: (Number(prog.SPEED_RUN_SCORE) || 0) >= 10,
            claimed: claimed.includes('SPEED_RUN_SCORE'),
        },
        {
            id: 'DUEL_WIN',
            title: '⚔️ Duel G\'olibi',
            description: '1v1 Duel jangida 1 marta g\'alaba qozoning',
            icon: '⚔️',
            goal: 1,
            current: Math.min(1, Number(prog.DUEL_WIN) || 0),
            rewardCoins: 150,
            rewardXp: 200,
            rewardEnergy: 3,
            completed: (Number(prog.DUEL_WIN) || 0) >= 1,
            claimed: claimed.includes('DUEL_WIN'),
        },
    ];

    return quests;
}

export async function incrementQuestProgress(studentId: string, questId: string, amount: number = 1) {
    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const today = getTodayDateString();

    let profile = await StudentGameProfile.findOne({ studentId: studentObjId });
    if (!profile) {
        profile = await StudentGameProfile.create({ studentId: studentObjId, dailyQuestsDate: today, completedQuests: [], questProgress: {} });
    }

    if (profile.dailyQuestsDate !== today) {
        profile.dailyQuestsDate = today;
        profile.completedQuests = [];
        profile.questProgress = {};
    }

    const currentProgress = profile.questProgress || {};
    currentProgress[questId] = (Number(currentProgress[questId]) || 0) + amount;
    profile.questProgress = currentProgress;
    profile.markModified('questProgress');
    await profile.save();
}