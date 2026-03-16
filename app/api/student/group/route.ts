import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import GroupQuizSession from '@/models/GroupQuizSession';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import DailyStudentStats from '@/models/DailyStudentStats';
import QuizAttempt from '@/models/QuizAttempt';
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
            return NextResponse.json({ group: null, members: [] });
        }

        // 2. Fetch the group details + teacher
        const groupId = studentMemberDoc.groupId;
        const group = await Group.findById(groupId).lean() as any;

        if (!group) {
            return NextResponse.json({ group: null, members: [] });
        }

        const teacher = await User.findById(group.teacherId).select('name').lean() as any;

        // 3. Fetch all members of this group
        const groupMembersDocs = await GroupMember.find({ groupId: groupId }).lean();
        const memberIds = groupMembersDocs.map(m => m.studentId);

        // 4. Fetch user details, wallets, daily stats, and quizzes
        const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

        const [users, wallets, activeQuizDoc, publishedQuizzes, dailyStatsDocs] = await Promise.all([
            User.find({ _id: { $in: memberIds } }).select('_id name totalWordsSeen').lean(),
            Wallet.find({ studentId: { $in: memberIds } }).lean(),
            GroupQuizSession.findOne({
                groupId: groupId,
                status: 'ACTIVE',
                $or: [{ endsAt: { $gt: new Date() } }, { endsAt: { $exists: false } }]
            }).lean() as any,
            GroupQuizSession.find({
                groupId: groupId,
                status: { $in: ['PUBLISHED', 'ACTIVE'] },
            }).sort({ createdAt: -1 }).limit(5).lean(),
            DailyStudentStats.find({ studentId: { $in: memberIds }, date: todayDateStr }).lean()
        ]);

        // Check if current student has completed any published quiz
        const publishedQuizIds = publishedQuizzes.map((q: any) => q._id);
        const studentAttempts = publishedQuizIds.length > 0
            ? await QuizAttempt.find({
                studentId: session.id,
                sessionId: { $in: publishedQuizIds },
                endedAt: { $exists: true, $ne: null },
            }).select('sessionId correctCount answeredCount').lean()
            : [];
        const attemptBySession = new Map(studentAttempts.map((a: any) => [a.sessionId.toString(), a]));

        // 5. Merge and format the members list
        const membersList = users.map((user: any) => {
            const wallet = wallets.find(w => String(w.studentId) === String(user._id));
            const memberDoc = groupMembersDocs.find(m => String(m.studentId) === String(user._id));
            const dailyStats = dailyStatsDocs.find((d: any) => String(d.studentId) === String(user._id)) as any;

            return {
                _id: String(user._id),
                name: user.name,
                totalWordsSeen: user.totalWordsSeen || 0,
                todayWordsSeen: dailyStats?.wordsSeen || 0,
                todayCorrect: dailyStats?.correct || 0,
                coinBalance: wallet?.balance || 0,
                joinedAt: memberDoc?.joinedAt || null,
                isCurrentUser: String(user._id) === session.id
            };
        });

        // 6. Sort members by MT Coins (descending), then by today's correct
        membersList.sort((a, b) => {
            if (b.coinBalance !== a.coinBalance) {
                return (b.coinBalance as number) - (a.coinBalance as number);
            }
            return (b.todayCorrect as number) - (a.todayCorrect as number);
        });

        // 7. Calculate rank & insights
        const studentRank = membersList.findIndex(m => m.isCurrentUser) + 1;
        const currentStudent = membersList.find(m => m.isCurrentUser);
        const groupTodayCorrect = membersList.reduce((sum, m) => sum + m.todayCorrect, 0);
        const groupAvgCorrect = membersList.length > 0 ? Math.round(groupTodayCorrect / membersList.length) : 0;

        // Insight: how many more correct to reach next rank
        let nextRankGap = null;
        if (studentRank > 1 && currentStudent) {
            const aboveStudent = membersList[studentRank - 2]; // person above
            nextRankGap = (aboveStudent.coinBalance as number) - (currentStudent.coinBalance as number);
        }

        // Format published quizzes
        const formattedQuizzes = publishedQuizzes.map((q: any) => {
            const attempt = attemptBySession.get(q._id.toString());
            return {
                id: String(q._id),
                title: q.title || 'Group Quiz',
                description: q.description || '',
                questionCount: q.questionCount,
                timeLimitSec: q.timeLimitSec,
                mode: q.mode || 'EN',
                status: q.status,
                createdAt: q.createdAt,
                studentCompleted: !!attempt,
                studentResult: attempt ? {
                    correctCount: attempt.correctCount,
                    answeredCount: attempt.answeredCount,
                } : null,
            };
        });

        return NextResponse.json({
            group: {
                id: String(group._id),
                name: group.name,
                teacherName: teacher?.name || 'Unknown',
                createdAt: group.createdAt,
                memberCount: membersList.length
            },
            activeQuiz: activeQuizDoc ? {
                id: String(activeQuizDoc._id),
                title: activeQuizDoc.title || 'Live Quiz',
                questionCount: activeQuizDoc.questionCount,
                timeLimitSec: activeQuizDoc.timeLimitSec,
                durationMin: activeQuizDoc.durationMin,
                mode: activeQuizDoc.mode || 'EN',
                startsAt: activeQuizDoc.startsAt,
            } : null,
            publishedQuizzes: formattedQuizzes,
            members: membersList,
            insights: {
                studentRank,
                groupTodayCorrect,
                groupAvgCorrect,
                studentTodayCorrect: currentStudent?.todayCorrect || 0,
                studentCoinBalance: currentStudent?.coinBalance || 0,
                nextRankGap,
                memberCount: membersList.length,
            }
        });

    } catch (error: any) {
        
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}

