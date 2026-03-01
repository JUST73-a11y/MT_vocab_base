import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import GroupQuizResultSnapshot from '@/models/GroupQuizResultSnapshot';
import GroupQuizSession from '@/models/GroupQuizSession';
import SessionScore from '@/models/SessionScore';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

type Params = Promise<{ id: string; sessionId: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id, sessionId } = await params;
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // 1. Check if session is ACTIVE or ENDED
        const session = await GroupQuizSession.findById(sessionId).lean() as any;
        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });

        let results = [];

        if (session.status === 'ACTIVE') {
            // ── LIVE MODE: Read from SessionScore (Pre-aggregated incremental scores) ──
            const scores = await SessionScore.find({ sessionId: new mongoose.Types.ObjectId(sessionId) })
                .sort({ correctCount: -1, accuracy: -1, lastAnsweredAt: 1 })
                .limit(50)
                .lean() as any[];

            const studentIds = scores.map(s => s.studentId);
            const students = await User.find({ _id: { $in: studentIds } }, 'name').lean() as any[];
            const nameMap = Object.fromEntries(students.map(s => [s._id.toString(), s.name]));

            results = scores.map((s, idx) => ({
                rank: idx + 1,
                studentId: s.studentId,
                studentName: nameMap[s.studentId.toString()] || 'O\'quvchi',
                correctCount: s.correctCount,
                answeredCount: s.answeredCount,
                accuracy: s.accuracy,
            }));
        } else {
            // ── FINAL MODE: Read from static Snapshots ──
            const snapshots = await GroupQuizResultSnapshot.find({
                sessionId: new mongoose.Types.ObjectId(sessionId),
            })
                .sort({ rank: 1 })
                .limit(100)
                .lean() as any[];

            const studentIds = snapshots.map(s => s.studentId);
            const students = await User.find({ _id: { $in: studentIds } }, 'name').lean() as any[];
            const nameMap = Object.fromEntries(students.map(s => [s._id.toString(), s.name]));

            results = snapshots.map(s => ({
                rank: s.rank,
                studentId: s.studentId,
                studentName: nameMap[s.studentId.toString()] || 'O\'quvchi',
                correctCount: s.correctCount,
                answeredCount: s.answeredCount,
                accuracy: s.accuracy,
            }));
        }

        return NextResponse.json({
            sessionId,
            status: session.status,
            results,
            podium: results.slice(0, 3),
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching results' }, { status: 500 });
    }
}
