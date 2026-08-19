import dbConnect from '@/lib/db';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

export function getTitleForLevel(level: number): string {
    if (level >= 50) return 'Ilohiy';
    if (level >= 40) return 'Afsona';
    if (level >= 30) return 'Bobomister';
    if (level >= 20) return 'Usta';
    if (level >= 15) return 'Bilimdon';
    if (level >= 10) return 'Yodlovchi';
    if (level >= 5) return 'Shogird';
    return 'Boshlovchi';
}

export function getXpRequiredForLevel(level: number): number {
    return Math.floor(100 * Math.pow(level, 1.5));
}

export function calculateLevelFromXp(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number } {
    let level = 1;
    let accumulatedXp = 0;

    while (true) {
        const needed = getXpRequiredForLevel(level);
        if (accumulatedXp + needed > xp) {
            return {
                level,
                currentLevelXp: xp - accumulatedXp,
                nextLevelXp: needed,
            };
        }
        accumulatedXp += needed;
        level++;
    }
}

export async function addXpToStudent(studentId: string, xpAmount: number): Promise<{ oldLevel: number; newLevel: number; leveledUp: boolean; newXp: number; newTitle: string }> {
    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(studentId);

    let profile = await StudentGameProfile.findOne({ studentId: studentObjId });
    if (!profile) {
        profile = await StudentGameProfile.create({ studentId: studentObjId, xp: 0, level: 1, title: 'Boshlovchi' });
    }

    const oldLevel = profile.level;
    const newTotalXp = profile.xp + xpAmount;
    const { level: newLevel } = calculateLevelFromXp(newTotalXp);
    const newTitle = getTitleForLevel(newLevel);

    profile.xp = newTotalXp;
    profile.level = newLevel;
    profile.title = newTitle;
    await profile.save();

    return {
        oldLevel,
        newLevel,
        leveledUp: newLevel > oldLevel,
        newXp: newTotalXp,
        newTitle,
    };
}