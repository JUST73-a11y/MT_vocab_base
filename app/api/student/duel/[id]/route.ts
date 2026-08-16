import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Duel from '@/models/Duel';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        const { id } = await params;
        await dbConnect();
        const duel = await Duel.findById(id)
            .populate('challengerId', 'name')
            .populate('opponentId', 'name')
            .lean() as any;

        if (!duel) {
            return createApiError('NOT_FOUND', 'Duel topilmadi', 404);
        }

        const isChallenger = duel.challengerId._id.toString() === session.id;
        const isOpponent = duel.opponentId._id.toString() === session.id;

        if (!isChallenger && !isOpponent) {
            return createApiError('FORBIDDEN', 'Bu duelga kirish huquqiga ega emassiz', 403);
        }

        const myScore = isChallenger ? duel.challengerScore : duel.opponentScore;
        const opponentScore = isChallenger ? duel.opponentScore : duel.challengerScore;

        const sanitizedQuestions = duel.questions.map((q: any, idx: number) => ({
            index: idx,
            word: q.word,
            options: q.options,
            audioUrl: q.audioUrl,
            correctTranslation: q.correctTranslation,
        }));

        return NextResponse.json({
            id: duel._id.toString(),
            status: duel.status,
            rewardCoins: duel.rewardCoins,
            isChallenger,
            challengerName: duel.challengerId.name,
            opponentName: duel.opponentId.name,
            myScore: {
                isFinished: myScore?.isFinished || false,
                correctCount: myScore?.correctCount || 0,
                timeSpentSec: myScore?.timeSpentSec || 0,
                answers: myScore?.answers || [],
            },
            opponentScore: {
                isFinished: opponentScore?.isFinished || false,
                correctCount: duel.status === 'COMPLETED' ? (opponentScore?.correctCount || 0) : undefined,
                timeSpentSec: duel.status === 'COMPLETED' ? (opponentScore?.timeSpentSec || 0) : undefined,
            },
            winnerId: duel.winnerId?.toString(),
            questions: sanitizedQuestions,
        });

    } catch (error: any) {
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}
