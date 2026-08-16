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
import Certificate from '@/models/Certificate';
import CoinTransaction from '@/models/CoinTransaction';
import SmartLexProgress from '@/models/SmartLexProgress';
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

        // 4. Fetch user details, wallets, daily stats, certificates, coin transactions, smartlex progress, and quizzes in parallel
        const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        const [
            users,
            wallets,
            activeQuizDoc,
            publishedQuizzes,
            dailyStatsDocs,
            certCounts,
            lifetimeCoinsAgg,
            totalTimeAgg,
            smartLexAgg
        ] = await Promise.all([
            User.find({ _id: { $in: memberIds } }).select('_id name totalWordsSeen lastActiveAt lastLoginAt').lean(),
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
            DailyStudentStats.find({ studentId: { $in: memberIds } }).lean(),
            Certificate.aggregate([
                { $match: { studentId: { $in: memberIds } } },
                { $group: { 
                    _id: '$studentId', 
                    count: { $sum: 1 }, 
                    totalCertWords: { $sum: { $ifNull: ['$totalWords', 0] } },
                    totalCertTime: { $sum: { $ifNull: ['$activeLearningTimeSeconds', 0] } } 
                } }
            ]),
            CoinTransaction.aggregate([
                { $match: { studentId: { $in: memberIds }, amount: { $gt: 0 } } },
                { $group: { _id: '$studentId', totalEarned: { $sum: '$amount' } } }
            ]),
            QuizAttempt.aggregate([
                { $match: { studentId: { $in: memberIds } } },
                { $group: { 
                    _id: '$studentId', 
                    totalCorrect: { $sum: '$correctCount' },
                    totalAnswered: { $sum: '$answeredCount' }
                }}
            ]),
            SmartLexProgress.aggregate([
                { $match: { studentId: { $in: memberIds } } },
                { $group: {
                    _id: '$studentId',
                    totalSmartLexTime: { $sum: '$activeLearningTimeSeconds' }
                }}
            ])
        ]);

        // Build lookup maps
        const certMap = new Map(certCounts.map((c: any) => [c._id.toString(), c]));
        const lifetimeCoinMap = new Map(lifetimeCoinsAgg.map((c: any) => [c._id.toString(), c.totalEarned]));
        const quizAccuracyMap = new Map(totalTimeAgg.map((q: any) => [q._id.toString(), q]));
        const smartLexMap = new Map(smartLexAgg.map((s: any) => [s._id.toString(), s]));

        // Daily stats grouped by student
        const dailyStatsByStudent = new Map<string, { todayWordsSeen: number; todayCorrect: number; totalTimeSec: number }>();
        dailyStatsDocs.forEach((d: any) => {
            const sid = d.studentId.toString();
            const current = dailyStatsByStudent.get(sid) || { todayWordsSeen: 0, todayCorrect: 0, totalTimeSec: 0 };
            current.totalTimeSec += d.timeSpentSeconds || 0;
            if (d.date === todayDateStr) {
                current.todayWordsSeen += d.wordsSeen || 0;
                current.todayCorrect += d.correct || 0;
            }
            dailyStatsByStudent.set(sid, current);
        });

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

        // 5. Merge and format members list
        const membersList = users.map((user: any) => {
            const sid = String(user._id);
            const wallet = wallets.find(w => String(w.studentId) === sid);
            const memberDoc = groupMembersDocs.find(m => String(m.studentId) === sid);
            const studentDaily = dailyStatsByStudent.get(sid) || { todayWordsSeen: 0, todayCorrect: 0, totalTimeSec: 0 };
            const certData = certMap.get(sid);
            const quizData = quizAccuracyMap.get(sid);
            const smartLexData = smartLexMap.get(sid);

            // Lifetime coins: sum of earned coins (never drops when teacher redeems/deducts)
            const earnedCoins = lifetimeCoinMap.get(sid) || 0;
            const currentBalance = wallet?.balance || 0;
            const totalCoinsEarned = Math.max(earnedCoins, currentBalance);

            // Certificates count
            const certificatesCount = certData?.count || 0;

            // Accuracy %
            let accuracy = 100;
            if (quizData && quizData.totalAnswered > 0) {
                accuracy = Math.min(100, Math.round((quizData.totalCorrect / quizData.totalAnswered) * 100));
            } else if (studentDaily.todayWordsSeen > 0) {
                accuracy = Math.min(100, Math.round((studentDaily.todayCorrect / studentDaily.todayWordsSeen) * 100));
            }

            // Total words mastered strictly = (Words from Certified Units) + (Words from Mashq Boshlash / Random Practice)
            const certWords = certData?.totalCertWords || 0;
            const randomMashqWords = user.totalWordsSeen || studentDaily.todayWordsSeen || 0;
            const totalWordsSeen = certWords + randomMashqWords;

            // Total online / learning time formatted
            const totalSeconds = (studentDaily.totalTimeSec || 0) + (certData?.totalCertTime || 0) + (smartLexData?.totalSmartLexTime || 0);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const onlineTimeFormatted = hours > 0 
                ? `${hours}s ${minutes}m` 
                : minutes > 0 
                    ? `${minutes} daqiqa` 
                    : `${Math.max(1, Math.floor(totalSeconds))} soniya`;

            // Online status
            const lastActive = user.lastActiveAt || user.lastLoginAt;
            const isOnline = lastActive ? new Date(lastActive) >= fifteenMinutesAgo : false;

            // Comprehensive Gamified Score:
            // Score = (Lifetime Coins * 2) + (Words Seen * 3) + (Certificates * 50) + (Today Correct * 5)
            const score = (totalCoinsEarned * 2) + (totalWordsSeen * 3) + (certificatesCount * 50) + (studentDaily.todayCorrect * 5);

            return {
                _id: sid,
                name: user.name,
                totalWordsSeen,
                todayWordsSeen: studentDaily.todayWordsSeen,
                todayCorrect: studentDaily.todayCorrect,
                coinBalance: currentBalance,
                totalCoinsEarned: totalCoinsEarned,
                certificatesCount,
                accuracy,
                totalTimeOnlineSec: totalSeconds,
                onlineTimeFormatted,
                isOnline,
                score,
                joinedAt: memberDoc?.joinedAt || null,
                isCurrentUser: sid === session.id
            };
        });

        // 6. Sort members by comprehensive score (descending)
        membersList.sort((a, b) => b.score - a.score || b.totalCoinsEarned - a.totalCoinsEarned || b.totalWordsSeen - a.totalWordsSeen);

        // Assign clean rank numbers
        const rankedMembers = membersList.map((m, idx) => ({
            ...m,
            rank: idx + 1
        }));

        // 7. Calculate group rank & insights
        const studentRank = rankedMembers.findIndex(m => m.isCurrentUser) + 1;
        const currentStudent = rankedMembers.find(m => m.isCurrentUser);
        const groupTotalWordsSeen = rankedMembers.reduce((sum, m) => sum + m.totalWordsSeen, 0);
        const groupTodayCorrect = rankedMembers.reduce((sum, m) => sum + m.todayCorrect, 0);
        const groupAvgCorrect = rankedMembers.length > 0 ? Math.round(groupTodayCorrect / rankedMembers.length) : 0;

        // Insight: gap to reach next rank
        let nextRankGap = null;
        let aboveStudentName = null;
        if (studentRank > 1 && currentStudent) {
            const aboveStudent = rankedMembers[studentRank - 2];
            nextRankGap = Math.max(1, aboveStudent.score - currentStudent.score);
            aboveStudentName = aboveStudent.name;
        }

        // Group weekly goal: 3,000 words target
        const groupGoalTarget = 3000;
        const groupGoalCurrent = Math.min(groupGoalTarget, groupTotalWordsSeen);
        const groupGoalPercent = Math.min(100, Math.round((groupGoalCurrent / groupGoalTarget) * 100));

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
                teacherName: teacher?.name || 'Ustoz',
                createdAt: group.createdAt,
                memberCount: rankedMembers.length
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
            members: rankedMembers,
            insights: {
                studentRank,
                groupTotalWordsSeen,
                groupTodayCorrect,
                groupAvgCorrect,
                studentTodayCorrect: currentStudent?.todayCorrect || 0,
                studentCoinBalance: currentStudent?.coinBalance || 0,
                studentTotalCoins: currentStudent?.totalCoinsEarned || 0,
                studentScore: currentStudent?.score || 0,
                nextRankGap,
                aboveStudentName,
                memberCount: rankedMembers.length,
                groupGoal: {
                    target: groupGoalTarget,
                    current: groupGoalCurrent,
                    percent: groupGoalPercent,
                    rewardCoins: 50,
                }
            }
        });

    } catch (error: any) {
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}

