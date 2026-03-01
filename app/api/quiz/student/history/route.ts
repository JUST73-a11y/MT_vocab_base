import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import QuizAttempt from '@/models/QuizAttempt';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = 20;
        const skip = (page - 1) * limit;

        await dbConnect();

        const studentObjId = new mongoose.Types.ObjectId(student.id);

        const [attempts, total] = await Promise.all([
            QuizAttempt.find({ studentId: studentObjId, endedAt: { $exists: true } })
                .sort({ endedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('mode correctCount answeredCount questionCountPlanned coinsEarned unitIds startedAt endedAt')
                .lean(),
            QuizAttempt.countDocuments({ studentId: studentObjId, endedAt: { $exists: true } }),
        ]);

        return NextResponse.json({
            attempts,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('[QUIZ_HISTORY]', error);
        return NextResponse.json({ message: 'Error fetching history' }, { status: 500 });
    }
}
