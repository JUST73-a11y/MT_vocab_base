import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getServerSession } from "@/lib/serverAuth";
import StudentGameProfile, { LEVELS } from "@/models/StudentGameProfile";

function computeLevel(xp: number): number {
    let level = 1;
    for (const l of LEVELS) { if (xp >= l.xpNeeded) level = l.level; }
    return level;
}

function checkBadges(profile: any): any[] {
    const existing = new Set((profile.badges || []).map((b: any) => b.id));
    const newBadges: any[] = [];
    const candidates = [
        { id: "first_quiz", name: "Birinchi quiz!", icon: "target", description: "1-quizdan otdi", condition: profile.totalQuizzes >= 1 },
        { id: "correct_50", name: "50 togri javob", icon: "zap", description: "50 ta s togri topdi", condition: profile.totalCorrect >= 50 },
        { id: "correct_100", name: "Yuz togri!", icon: "hundred", description: "100 ta s togri topdi", condition: profile.totalCorrect >= 100 },
        { id: "correct_500", name: "Soz ustasi", icon: "medal", description: "500 ta s togri topdi", condition: profile.totalCorrect >= 500 },
        { id: "mistakes_fixed_50", name: "Kuchli xotira", icon: "brain", description: "50 ta xato tuzatildi", condition: profile.totalMistakesFixed >= 50 },
        { id: "mistakes_fixed_100", name: "Xato yoq!", icon: "fire", description: "100 ta xato tuzatildi", condition: profile.totalMistakesFixed >= 100 },
        { id: "level_3", name: "Soz ustasi darajasi", icon: "star", description: "Level 3 ga kotarildi", condition: profile.level >= 3 },
        { id: "level_5", name: "Vocabulary Master!", icon: "trophy", description: "Maksimal daraja", condition: profile.level >= 5 },
    ];
    for (const b of candidates) {
        if (b.condition && !existing.has(b.id)) {
            newBadges.push({ id: b.id, name: b.name, icon: b.icon, description: b.description, earnedAt: new Date() });
        }
    }
    return newBadges;
}

export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const profile = await StudentGameProfile.findOne({ studentId: session.id }).lean() as any;
    if (!profile) {
        return NextResponse.json({
            xp: 0, level: 1, levelName: LEVELS[0].name, levelIcon: LEVELS[0].icon,
            totalCorrect: 0, totalQuizzes: 0, totalMistakesFixed: 0,
            badges: [], levels: LEVELS, nextLevelXp: LEVELS[1].xpNeeded, currentLevelXp: 0,
        });
    }
    const currentLevelDef = LEVELS.find(l => l.level === profile.level) || LEVELS[0];
    const nextLevelDef = LEVELS.find(l => l.level === profile.level + 1);
    return NextResponse.json({
        xp: profile.xp, level: profile.level,
        levelName: currentLevelDef.name, levelIcon: currentLevelDef.icon,
        totalCorrect: profile.totalCorrect, totalQuizzes: profile.totalQuizzes,
        totalMistakesFixed: profile.totalMistakesFixed, badges: profile.badges,
        levels: LEVELS, currentLevelXp: currentLevelDef.xpNeeded,
        nextLevelXp: nextLevelDef?.xpNeeded ?? null,
    });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { xpDelta = 1, correctDelta = 0, mistakeFixedDelta = 0, quizCompletedDelta = 0 } = body;
    await dbConnect();
    let profile = await StudentGameProfile.findOne({ studentId: session.id });
    if (!profile) profile = new StudentGameProfile({ studentId: session.id });
    profile.xp = (profile.xp || 0) + xpDelta;
    profile.totalCorrect = (profile.totalCorrect || 0) + correctDelta;
    profile.totalMistakesFixed = (profile.totalMistakesFixed || 0) + mistakeFixedDelta;
    profile.totalQuizzes = (profile.totalQuizzes || 0) + quizCompletedDelta;
    profile.level = computeLevel(profile.xp);
    const newBadges = checkBadges(profile);
    if (newBadges.length > 0) profile.badges = [...(profile.badges || []), ...newBadges];
    await profile.save();
    return NextResponse.json({ xp: profile.xp, level: profile.level, newBadges });
}
