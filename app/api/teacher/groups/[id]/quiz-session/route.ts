import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupQuizSession from '@/models/GroupQuizSession';
import GroupUnitAccess from '@/models/GroupUnitAccess';
import GroupQuizResultSnapshot from '@/models/GroupQuizResultSnapshot';
import QuizAttempt from '@/models/QuizAttempt';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';
import User from '@/models/User';
import SessionScore from '@/models/SessionScore';

type Params = Promise<{ id: string }>;

/** Compute and save optimized results snapshot when session ends */
async function saveLeaderboardSnapshot(sessionId: string, groupId: string) {
    try {
        const sessionObjId = new mongoose.Types.ObjectId(sessionId);

        // 1. Get ALL scores from SessionScore (already incrementally updated)
        const results = await SessionScore.find({ sessionId: sessionObjId })
            .sort({ correctCount: -1, accuracy: -1, lastAnsweredAt: 1 })
            .lean() as any[];

        if (results.length === 0) return;

        // 2. Fetch student names for podium (projection for speed)
        const studentIds = results.map(r => r.studentId);
        const users = await User.find({ _id: { $in: studentIds } }, 'name').lean() as any[];
        const nameMap: Record<string, string> = {};
        users.forEach(u => nameMap[u._id.toString()] = u.name);

        // 3. Save detailed snapshots for history modal
        const snapshots = results.map((r, index) => ({
            sessionId: sessionObjId,
            studentId: r.studentId,
            rank: index + 1,
            correctCount: r.correctCount,
            answeredCount: r.answeredCount,
            accuracy: r.accuracy,
        }));
        await GroupQuizResultSnapshot.insertMany(snapshots);

        // 4. Update the Session document with optimized summary/podium for LISTING speed
        const podiumPreview = results.slice(0, 3).map(r => ({
            studentId: r.studentId,
            name: nameMap[r.studentId.toString()] || 'O\'quvchi',
            correctCount: r.correctCount,
            accuracy: r.accuracy
        }));

        const totalAnswers = results.reduce((acc, r) => acc + r.answeredCount, 0);
        const totalCorrect = results.reduce((acc, r) => acc + r.correctCount, 0);
        const avgAccuracy = results.length > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

        await GroupQuizSession.findByIdAndUpdate(sessionId, {
            podiumPreview,
            summary: {
                totalStudents: results.length,
                totalAnswers,
                avgAccuracy
            }
        });

    } catch (err) {
        console.error('[SAVE_LEADERBOARD]', err);
    }
}

export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const group = await Group.findById(id);
        if (!group) return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        if (teacher.role !== 'admin' && group.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // End any existing active sessions first
        await GroupQuizSession.updateMany(
            { groupId: id, status: 'ACTIVE' },
            { status: 'ENDED', endsAt: new Date() }
        );

        const body = await req.json().catch(() => ({}));
        let { unitIds, questionCount = 20, durationMin = 10, timeLimitSec = 10 } = body;

        if (!unitIds || unitIds.length === 0) {
            const accesses = await GroupUnitAccess.find({ groupId: id }).lean() as any[];
            unitIds = accesses.map((a: any) => a.unitId.toString());
        }

        const startsAt = new Date();
        const endsAt = new Date(startsAt.getTime() + durationMin * 60000);

        const session = await GroupQuizSession.create({
            teacherId: teacher.id,
            groupId: id,
            unitIds,
            questionCount: Number(questionCount),
            durationMin,
            timeLimitSec,
            status: 'ACTIVE',
            startsAt,
            endsAt,
        });

        return NextResponse.json({ session });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error starting session' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        await dbConnect();

        // Find the active session before ending it
        const activeSessions = await GroupQuizSession.find({ groupId: id, status: 'ACTIVE' }).lean() as any[];

        await GroupQuizSession.updateMany(
            { groupId: id, status: 'ACTIVE' },
            { status: 'ENDED', endsAt: new Date() }
        );

        // Save leaderboard snapshot for each ended session
        for (const session of activeSessions) {
            await saveLeaderboardSnapshot(session._id.toString(), id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: 'Error ending session' }, { status: 500 });
    }
}

export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        await dbConnect();
        const session = await GroupQuizSession.findOne(
            { groupId: id, status: 'ACTIVE' }
        ).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ session: session || null });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
