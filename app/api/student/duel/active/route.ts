import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Duel from '@/models/Duel';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        await dbConnect();

        // 1. Fetch open active & pending duels
        const openDuelsDocs = await Duel.find({
            $or: [
                { opponentId: session.id, status: { $in: ['PENDING', 'ACTIVE'] } },
                { challengerId: session.id, status: { $in: ['PENDING', 'ACTIVE'] } }
            ]
        })
        .populate('challengerId', 'name')
        .populate('opponentId', 'name')
        .sort({ createdAt: -1 })
        .lean();

        const openDuels = openDuelsDocs.map((d: any) => ({
            id: d._id.toString(),
            challengerId: d.challengerId?._id?.toString(),
            challengerName: d.challengerId?.name || 'O\'quvchi',
            opponentId: d.opponentId?._id?.toString(),
            opponentName: d.opponentId?.name || 'O\'quvchi',
            status: d.status,
            rewardCoins: d.rewardCoins,
            isIncoming: d.opponentId?._id?.toString() === session.id,
            isChallenger: d.challengerId?._id?.toString() === session.id,
            myFinished: d.challengerId?._id?.toString() === session.id 
                ? (d.challengerScore?.isFinished || false) 
                : (d.opponentScore?.isFinished || false),
            opponentFinished: d.challengerId?._id?.toString() === session.id 
                ? (d.opponentScore?.isFinished || false) 
                : (d.challengerScore?.isFinished || false),
            createdAt: d.createdAt,
        }));

        // 2. Fetch completed duel history (last 10)
        const completedDocs = await Duel.find({
            $or: [
                { opponentId: session.id, status: 'COMPLETED' },
                { challengerId: session.id, status: 'COMPLETED' }
            ]
        })
        .populate('challengerId', 'name')
        .populate('opponentId', 'name')
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .lean();

        const completedDuels = completedDocs.map((d: any) => {
            const isChallenger = d.challengerId?._id?.toString() === session.id;
            const myScore = isChallenger ? d.challengerScore : d.opponentScore;
            const opponentScore = isChallenger ? d.opponentScore : d.challengerScore;
            const winnerIdStr = d.winnerId?.toString();
            const isWinner = winnerIdStr === session.id;
            const isDraw = winnerIdStr === 'DRAW';

            return {
                id: d._id.toString(),
                challengerName: d.challengerId?.name || 'O\'quvchi',
                opponentName: d.opponentId?.name || 'O\'quvchi',
                opponentDisplayName: isChallenger ? (d.opponentId?.name || 'Raqib') : (d.challengerId?.name || 'Chaqiruvchi'),
                myCorrect: myScore?.correctCount || 0,
                myTimeSec: myScore?.timeSpentSec || 0,
                opponentCorrect: opponentScore?.correctCount || 0,
                opponentTimeSec: opponentScore?.timeSpentSec || 0,
                isWinner,
                isDraw,
                rewardCoins: d.rewardCoins,
                completedAt: d.updatedAt || d.createdAt,
            };
        });

        return NextResponse.json({ 
            duels: openDuels, // backward compatibility
            openDuels,
            completedDuels 
        });

    } catch (error: any) {
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}
