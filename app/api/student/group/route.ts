import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import GroupQuizSession from '@/models/GroupQuizSession';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import DailyStudentStats from '@/models/DailyStudentStats';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        await dbConnect();

        // 1. Find which group this student belongs to
        const studentMemberDoc = await GroupMember.findOne({ studentId: session.id }).lean();

        if (!studentMemberDoc) {
            // Student is not in any group
            return NextResponse.json({ group: null, members: [] });
        }

        // 2. Fetch the group details
        const groupId = studentMemberDoc.groupId;
        const group = await Group.findById(groupId).lean();

        if (!group) {
            return NextResponse.json({ group: null, members: [] });
        }

        // 3. Fetch all members of this group
        const groupMembersDocs = await GroupMember.find({ groupId: groupId }).lean();
        const memberIds = groupMembersDocs.map(m => m.studentId);

        // 4. Fetch user details, wallets, daily stats, and any ACTIVE quiz for this group
        const todayDateStr = new Date().toISOString().split('T')[0];

        const [users, wallets, activeQuizDoc, dailyStatsDocs] = await Promise.all([
            User.find({ _id: { $in: memberIds } }).select('_id name totalWordsSeen').lean(),
            Wallet.find({ studentId: { $in: memberIds } }).lean(),
            GroupQuizSession.findOne({ groupId: groupId, status: 'ACTIVE' }).lean(),
            DailyStudentStats.find({ studentId: { $in: memberIds }, date: todayDateStr }).lean()
        ]);

        // 5. Merge and format the members list
        const membersList = users.map(user => {
            const wallet = wallets.find(w => String(w.studentId) === String(user._id));
            const memberDoc = groupMembersDocs.find(m => String(m.studentId) === String(user._id));
            const dailyStats = dailyStatsDocs.find((d: any) => String(d.studentId) === String(user._id));

            return {
                _id: String(user._id),
                name: user.name,
                totalWordsSeen: user.totalWordsSeen || 0,
                todayWordsSeen: dailyStats?.wordsSeen || 0,
                coinBalance: wallet?.balance || 0,
                joinedAt: memberDoc?.joinedAt || null,
                isCurrentUser: String(user._id) === session.id
            };
        });

        // 6. Sort members by MT Coins (descending), then by today's words seen
        membersList.sort((a, b) => {
            if (b.coinBalance !== a.coinBalance) {
                return (b.coinBalance as number) - (a.coinBalance as number);
            }
            return (b.todayWordsSeen as number) - (a.todayWordsSeen as number);
        });

        return NextResponse.json({
            group: {
                id: String(group._id),
                name: group.name,
                createdAt: group.createdAt,
                memberCount: membersList.length
            },
            activeQuiz: activeQuizDoc ? {
                id: String(activeQuizDoc._id),
                questionCount: activeQuizDoc.questionCount,
                durationMin: activeQuizDoc.durationMin,
                startsAt: activeQuizDoc.startsAt
            } : null,
            members: membersList
        });

    } catch (error: any) {
        console.error('Error fetching student group details:', error);
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}
