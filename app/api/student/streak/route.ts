import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import StudentStreak from '@/models/StudentStreak';
import StudentGameProfile from '@/models/StudentGameProfile';

// GET: return current streak info
export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const [streak, gameProfile] = await Promise.all([
        StudentStreak.findOne({ studentId: session.id }).lean(),
        StudentGameProfile.findOne({ studentId: session.id }).lean(),
    ]);

    return NextResponse.json({
        currentStreak: (streak as any)?.currentStreak || 0,
        longestStreak: (streak as any)?.longestStreak || 0,
        lastActivityDate: (streak as any)?.lastActivityDate || null,
        totalActiveDays: (streak as any)?.totalActiveDays || 0,
        xp: (gameProfile as any)?.xp || 0,
        level: (gameProfile as any)?.level || 1,
        totalCorrect: (gameProfile as any)?.totalCorrect || 0,
        totalQuizzes: (gameProfile as any)?.totalQuizzes || 0,
        badges: (gameProfile as any)?.badges || [],
    });
}

// POST: update streak (called after completing a quiz)
export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

    let streak = await StudentStreak.findOne({ studentId: session.id });

    if (!streak) {
        streak = await StudentStreak.create({
            studentId: session.id,
            currentStreak: 1,
            longestStreak: 1,
            lastActivityDate: today,
            totalActiveDays: 1,
        });
        return NextResponse.json({ currentStreak: 1, streakBroken: false, bonusCoins: 0, isNewDay: true });
    }

    const last = streak.lastActivityDate;

    if (last === today) {
        return NextResponse.json({ currentStreak: streak.currentStreak, streakBroken: false, bonusCoins: 0, isNewDay: false });
    }

    const prevDate = new Date(today);
    prevDate.setDate(prevDate.getDate() - 1);
    const yesterdayStr = prevDate.toISOString().slice(0, 10);

    const streakContinues = last === yesterdayStr;
    const newStreak = streakContinues ? streak.currentStreak + 1 : 1;

    let bonusCoins = 0;
    if (streakContinues) {
        if (newStreak === 3) bonusCoins = 5;
        else if (newStreak === 7) bonusCoins = 20;
        else if (newStreak === 30) bonusCoins = 100;
        else if (newStreak % 7 === 0) bonusCoins = 15;
    }

    streak.currentStreak = newStreak;
    streak.longestStreak = Math.max(streak.longestStreak, newStreak);
    streak.lastActivityDate = today;
    streak.totalActiveDays = (streak.totalActiveDays || 0) + 1;
    await streak.save();

    return NextResponse.json({ currentStreak: newStreak, streakBroken: !streakContinues, bonusCoins, isNewDay: true });
}
