import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import QuizAttempt from '@/models/QuizAttempt';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

type Params = Promise<{ id: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const studentId = new mongoose.Types.ObjectId(id);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalAgg, todayAgg] = await Promise.all([
            QuizAttempt.aggregate([
                { $match: { studentId } },
                { $group: { _id: null, correct: { $sum: '$correctCount' }, answered: { $sum: '$answeredCount' } } },
            ]),
            QuizAttempt.aggregate([
                { $match: { studentId, startedAt: { $gte: todayStart } } },
                { $group: { _id: null, correct: { $sum: '$correctCount' }, answered: { $sum: '$answeredCount' } } },
            ]),
        ]);

        return NextResponse.json({
            today: {
                correct: todayAgg[0]?.correct ?? 0,
                answered: todayAgg[0]?.answered ?? 0,
            },
            total: {
                correct: totalAgg[0]?.correct ?? 0,
                answered: totalAgg[0]?.answered ?? 0,
            },
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching student quiz stats' }, { status: 500 });
    }
}
