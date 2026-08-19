import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { addXpToStudent } from '@/lib/gameProfile';
import { incrementQuestProgress } from '@/lib/quests/questEngine';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const student = await User.findById(session.id).lean() as any;

    let allWords: any[] = [];

    if (student?.teacherId) {
        const units = await Unit.find({
            $or: [{ teacherId: student.teacherId }, { createdBy: student.teacherId }]
        }).select('_id').lean();
        const unitIds = units.map((u: any) => u._id);
        if (unitIds.length > 0) {
            allWords = await Word.find({ unitId: { $in: unitIds } }).limit(120).lean() as any[];
        }
    }

    if (allWords.length < 4) {
        allWords = await Word.find().limit(150).lean() as any[];
    }

    if (allWords.length < 4) {
        return NextResponse.json({ questions: [] });
    }

    // Shuffle & construct 50 4-option questions
    const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
    const questions = shuffledWords.slice(0, 50).map((w: any) => {
        const english = w.englishWord || w.english || 'Word';
        const correctUzbek = w.uzbekTranslation || w.uzbek || 'Tarjima';

        const wrongOptions = allWords
            .filter((other: any) => (other.uzbekTranslation || other.uzbek) !== correctUzbek)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map((other: any) => other.uzbekTranslation || other.uzbek);

        const optionsSet = new Set([correctUzbek, ...wrongOptions]);
        while (optionsSet.size < 4) {
            optionsSet.add(`Variant ${optionsSet.size + 1}`);
        }
        const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

        return {
            id: w._id.toString(),
            word: english,
            correctUzbek,
            options,
        };
    });

    return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 }); }

    const { correctCount, maxStreak, duration = 60 } = body;
    if (typeof correctCount !== 'number' || correctCount < 0) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid score' }, { status: 400 });
    }

    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(session.id);

    // Multipliers scaled by time mode (15s, 30s, 45s, 60s)
    const coinMultiplier = duration <= 15 ? 8 : duration <= 30 ? 6 : 5;
    const coinsEarned = correctCount * coinMultiplier;
    const xpEarned = correctCount * 12 + (maxStreak || 0) * 5;

    let wallet = await Wallet.findOne({ studentId: studentObjId });
    if (!wallet) wallet = await Wallet.create({ studentId: studentObjId, balance: 0 });

    if (coinsEarned > 0) {
        wallet.balance += coinsEarned;
        await wallet.save();

        await CoinTransaction.create({
            studentId: studentObjId,
            type: 'EARN_QUIZ',
            amount: coinsEarned,
            meta: { reason: `Speed Run (${duration}s): ${correctCount} ta to'g'ri` },
        });
    }

    const xpResult = await addXpToStudent(session.id, xpEarned);
    await incrementQuestProgress(session.id, 'SPEED_RUN_SCORE', correctCount);

    let profile = await StudentGameProfile.findOne({ studentId: studentObjId });
    if (!profile) profile = await StudentGameProfile.create({ studentId: studentObjId });

    const isNewHighScore = correctCount > (profile.highSpeedRunScore || 0);
    if (isNewHighScore) {
        profile.highSpeedRunScore = correctCount;
    }
    profile.totalSpeedRunGames = (profile.totalSpeedRunGames || 0) + 1;
    await profile.save();

    return NextResponse.json({
        success: true,
        correctCount,
        coinsEarned,
        xpEarned,
        newBalance: wallet.balance,
        isNewHighScore,
        xpResult,
    });
}