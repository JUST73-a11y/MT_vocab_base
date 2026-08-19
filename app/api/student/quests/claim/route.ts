import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { getStudentQuests } from '@/lib/quests/questEngine';
import { addXpToStudent } from '@/lib/gameProfile';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import StudentEnergy from '@/models/StudentEnergy';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 }); }

    const { questId } = body;
    if (!questId) return NextResponse.json({ code: 'BAD_REQUEST', message: 'Quest ID required' }, { status: 400 });

    const quests = await getStudentQuests(session.id);
    const targetQuest = quests.find(q => q.id === questId);

    if (!targetQuest) return NextResponse.json({ code: 'NOT_FOUND', message: 'Quest not found' }, { status: 404 });
    if (!targetQuest.completed) return NextResponse.json({ code: 'BAD_REQUEST', message: 'Quest is not completed yet' }, { status: 400 });
    if (targetQuest.claimed) return NextResponse.json({ code: 'BAD_REQUEST', message: 'Quest reward already claimed' }, { status: 400 });

    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(session.id);

    // 1. Add coins
    const wallet = await Wallet.findOneAndUpdate(
        { studentId: studentObjId },
        { $inc: { balance: targetQuest.rewardCoins }, $set: { updatedAt: new Date() } },
        { upsert: true, new: true }
    );

    await CoinTransaction.create({
        studentId: studentObjId,
        type: 'EARN_QUIZ',
        amount: targetQuest.rewardCoins,
        meta: { reason: `Kunlik vazifa bajarildi: ${targetQuest.title}` },
    });

    // 2. Add Energy if reward includes energy
    if (targetQuest.rewardEnergy > 0) {
        await StudentEnergy.findOneAndUpdate(
            { studentId: studentObjId },
            { $inc: { energy: targetQuest.rewardEnergy } },
            { upsert: true }
        );
    }

    // 3. Add XP & update profile
    const xpResult = await addXpToStudent(session.id, targetQuest.rewardXp);

    // 4. Mark quest claimed in profile
    await StudentGameProfile.findOneAndUpdate(
        { studentId: studentObjId },
        { $addToSet: { completedQuests: questId } },
        { upsert: true }
    );

    return NextResponse.json({
        success: true,
        rewardCoins: targetQuest.rewardCoins,
        rewardXp: targetQuest.rewardXp,
        rewardEnergy: targetQuest.rewardEnergy,
        newBalance: wallet.balance,
        xpResult,
    });
}