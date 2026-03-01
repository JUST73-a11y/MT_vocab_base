import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import QuizAttempt from '@/models/QuizAttempt';
import GroupMember from '@/models/GroupMember';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

type Params = Promise<{ id: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const url = new URL(req.url);
        const sessionId = url.searchParams.get('sessionId');

        await dbConnect();

        // Get all members of the group
        const members = await GroupMember.find({ groupId: id }).lean() as any[];
        const studentIds = members.map((m: any) => m.studentId);

        // Fetch their names
        const users = await User.find({ _id: { $in: studentIds } }).select('name email').lean() as any[];
        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

        // Build match filter
        const matchFilter: any = { studentId: { $in: studentIds } };
        if (sessionId) {
            matchFilter.sessionId = new mongoose.Types.ObjectId(sessionId);
        }

        // Aggregate attempts per student
        const agg = await QuizAttempt.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$studentId',
                    correct: { $sum: '$correctCount' },
                    answered: { $sum: '$answeredCount' },
                }
            },
            { $sort: { correct: -1, answered: 1 } }
        ]);

        const leaderboard = agg.map((entry: any, idx: number) => {
            const u = userMap.get(entry._id.toString());
            return {
                rank: idx + 1,
                studentId: entry._id.toString(),
                name: u?.name ?? 'Unknown',
                email: u?.email ?? '',
                correct: entry.correct,
                answered: entry.answered,
                accuracy: entry.answered > 0 ? Math.round((entry.correct / entry.answered) * 100) : 0,
            };
        });

        // Include members with 0 answers
        const answeredIds = new Set(agg.map((e: any) => e._id.toString()));
        for (const sid of studentIds) {
            if (!answeredIds.has(sid.toString())) {
                const u = userMap.get(sid.toString());
                leaderboard.push({
                    rank: leaderboard.length + 1,
                    studentId: sid.toString(),
                    name: u?.name ?? 'Unknown',
                    email: u?.email ?? '',
                    correct: 0,
                    answered: 0,
                    accuracy: 0,
                });
            }
        }

        return NextResponse.json({ leaderboard });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error fetching leaderboard' }, { status: 500 });
    }
}
