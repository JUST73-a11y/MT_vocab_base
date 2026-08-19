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
    if (!student?.teacherId) {
        return NextResponse.json({ questions: [] });
    }

    // Fetch units belonging to teacher
    const units = await Unit.find({ teacherId: student.teacherId, isActive: true }).select('_id').lean();
    const unitIds = units.map((u: any) => u._id);

    // Fetch 100 word items
    const allVocab = await Word.find({ unitId: { $in: unitIds } }).limit(100).lean() as any[];

    if (allVocab.length < 4) {
        return NextResponse.json({ questions: [] });
    }

    // Shuffle & construct 30 4-option questions
    const shuffledVocabs = [...allVocab].sort(() => Math.random() - 0.5);
    const questions = shuffledVocabs.slice(0, 30).map((vocab: any) => {
        const wrongOptions = allVocab
            .filter((v: any) => v._id.toString() !== vocab._id.toString())
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map((v: any) => v.uzbek);

        const options = [vocab.uzbek, ...wrongOptions].sort(() => Math.random() - 0.5);
        return {
            id: vocab._id.toString(),
            word: vocab.english,
            correctUzbek: vocab.uzbek,
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

    const { correctCount, maxStreak } = body;
    if (typeof correctCount !== 'number' || correctCount < 0) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid score' }, { status: 400 });
    }

    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(session.id);

    // Coins: 5 MT per correct word
    const coinsEarned = correctCount * 5;
    // XP: 10 XP per correct word + streak bonus
    const xpEarned = correctCount * 10 + (maxStreak || 0) * 5;

    let wallet = await Wallet.findOne({ studentId: studentObjId });
    if (!wallet) wallet = await Wallet.create({ studentId: studentObjId, balance: 0 });

    if (coinsEarned > 0) {
        wallet.balance += coinsEarned;
        await wallet.save();

        await CoinTransaction.create({
            studentId: studentObjId,
            type: 'EARN_QUIZ',
            amount: coinsEarned,
            meta: { reason: `Speed Run o'yini: ${correctCount} ta to'g'ri` },
        });
    }

    const xpResult = await addXpToStudent(session.id, xpEarned);
    await incrementQuestProgress(session.id, 'SPEED_RUN_SCORE', correctCount);

    // Update Speed Run high score
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