import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import DuelChallenge from '@/models/DuelChallenge';
import TeacherNotification from '@/models/TeacherNotification';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 }); }

    const { targetStudentId } = body;
    if (!targetStudentId) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Target student ID required' }, { status: 400 });
    }

    await dbConnect();
    const challenger = await User.findById(session.id).lean() as any;
    const target = await User.findById(targetStudentId).lean() as any;

    if (!target) return NextResponse.json({ code: 'NOT_FOUND', message: 'Target student not found' }, { status: 404 });

    const roomId = `duel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry

    const challenge = await DuelChallenge.create({
        challengerId: new mongoose.Types.ObjectId(session.id),
        targetId: new mongoose.Types.ObjectId(targetStudentId),
        roomId,
        status: 'PENDING',
        expiresAt,
    });

    return NextResponse.json({
        success: true,
        roomId,
        challenge,
        challengerName: challenger?.name || 'Do\'stingiz',
        targetName: target?.name,
    });
}