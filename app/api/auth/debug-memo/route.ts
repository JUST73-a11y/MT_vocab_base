import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import QuizAttempt from '@/models/QuizAttempt';
import QuizAnswer from '@/models/QuizAnswer';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();

    const attempts = await QuizAttempt.find().sort({ startedAt: -1 }).limit(2).lean();
    const data = [];

    for (const att of attempts) {
        const answers = await QuizAnswer.find({ attemptId: att._id }).sort({ answeredAt: -1 }).limit(3).lean();
        data.push({
            attemptId: att._id,
            qMemo: att._qMemo,
            answers: answers.map(a => ({
                wordId: a.wordId,
                selectedOption: a.selectedOption,
                isCorrect: a.isCorrect,
                isTimeout: a.isTimeout
            }))
        });
    }

    return NextResponse.json(data);
}
