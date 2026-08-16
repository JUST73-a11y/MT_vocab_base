import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Duel from '@/models/Duel';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        const { id } = await params;
        const body = await req.json();
        const { answers, timeSpentSec } = body;

        await dbConnect();
        const duel = await Duel.findById(id);
        if (!duel) return createApiError('NOT_FOUND', 'Duel topilmadi', 404);

        const isChallenger = duel.challengerId.toString() === session.id;
        const isOpponent = duel.opponentId.toString() === session.id;

        if (!isChallenger && !isOpponent) {
            return createApiError('FORBIDDEN', 'Siz bu duel ishtirokchisi emassiz', 403);
        }

        let correctCount = 0;
        const gradedAnswers = (answers || []).map((ans: any, idx: number) => {
            const q = duel.questions[idx];
            const isCorrect = q && ans.selected === q.correctTranslation;
            if (isCorrect) correctCount++;
            return {
                questionIndex: idx,
                selected: ans.selected,
                isCorrect,
            };
        });

        const scorePayload = {
            isFinished: true,
            correctCount,
            timeSpentSec: Number(timeSpentSec) || 10,
            answers: gradedAnswers,
            completedAt: new Date(),
        };

        if (isChallenger) {
            duel.challengerScore = scorePayload;
        } else {
            duel.opponentScore = scorePayload;
            duel.status = 'ACTIVE';
        }

        const bothFinished = duel.challengerScore.isFinished && duel.opponentScore.isFinished;

        if (bothFinished) {
            duel.status = 'COMPLETED';

            const cCorrect = duel.challengerScore.correctCount;
            const oCorrect = duel.opponentScore.correctCount;
            const cTime = duel.challengerScore.timeSpentSec;
            const oTime = duel.opponentScore.timeSpentSec;

            let winnerId = null;

            if (cCorrect > oCorrect) {
                winnerId = duel.challengerId;
            } else if (oCorrect > cCorrect) {
                winnerId = duel.opponentId;
            } else {
                if (cTime < oTime) {
                    winnerId = duel.challengerId;
                } else if (oTime < cTime) {
                    winnerId = duel.opponentId;
                } else {
                    winnerId = 'DRAW';
                }
            }

            duel.winnerId = winnerId;

            if (winnerId && winnerId !== 'DRAW') {
                const reward = duel.rewardCoins || 20;
                await Wallet.findOneAndUpdate(
                    { studentId: winnerId },
                    { $inc: { balance: reward }, updatedAt: new Date() },
                    { upsert: true }
                );

                await CoinTransaction.create({
                    studentId: winnerId,
                    type: 'EARN_QUIZ',
                    amount: reward,
                    meta: {
                        duelId: duel._id.toString(),
                        reason: '1v1 Do\'stlar Dueli G\'olibi',
                    },
                });
            }
        }

        await duel.save();

        return NextResponse.json({
            success: true,
            isCompleted: bothFinished,
            correctCount,
            timeSpentSec: scorePayload.timeSpentSec,
            winnerId: duel.winnerId?.toString(),
        });

    } catch (error: any) {
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}
