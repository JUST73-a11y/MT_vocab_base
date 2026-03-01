import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import QuizAnswer from '@/models/QuizAnswer';
import DailyStudentStats from '@/models/DailyStudentStats';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

// Tashkent timezone offset: UTC+5
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function getTashkentDayBoundaries(daysAgo = 0) {
    const now = new Date();
    const tashkentNow = new Date(now.getTime() + TZ_OFFSET_MS);

    // Midnight in Tashkent for today
    const tashkentMidnight = new Date(tashkentNow);
    tashkentMidnight.setUTCHours(0, 0, 0, 0);
    tashkentMidnight.setUTCDate(tashkentMidnight.getUTCDate() - daysAgo);

    const start = new Date(tashkentMidnight.getTime() - TZ_OFFSET_MS);
    const end = new Date(start.getTime() + (daysAgo === 0 ? 86400000 : daysAgo * 86400000));

    return { start, end };
}

function getDateRange(range: string) {
    const now = new Date();
    if (range === 'today') {
        const { start } = getTashkentDayBoundaries(0);
        return { $gte: start };
    }
    if (range === '7d') {
        return { $gte: new Date(now.getTime() - 7 * 86400000) };
    }
    if (range === '30d') {
        return { $gte: new Date(now.getTime() - 30 * 86400000) };
    }
    return {}; // all time
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';
        const paramStudentId = searchParams.get('studentId');

        let studentId: string;

        // Teachers/admins can look up any student by studentId param
        if (session.role === 'teacher' || session.role === 'admin') {
            if (!paramStudentId) {
                return NextResponse.json({ message: 'studentId param required for teacher/admin' }, { status: 400 });
            }
            studentId = paramStudentId;
        } else if (session.role === 'student') {
            studentId = paramStudentId || session.id;
        } else {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const studentObjId = new mongoose.Types.ObjectId(studentId);

        // ── PERFORMANCE OPTIMIZATION: READ FROM PRE-AGGREGATED DAILY STATS ──
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

        let statsDocs: any[] = [];
        if (range === 'today') {
            const doc = await DailyStudentStats.findOne({ studentId: studentObjId, date: todayStr }).lean();
            if (doc) statsDocs = [doc];
        } else if (range === '7d' || range === '30d') {
            const days = range === '7d' ? 7 : 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startStr = startDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

            statsDocs = await DailyStudentStats.find({
                studentId: studentObjId,
                date: { $gte: startStr }
            }).lean();
        } else {
            // 'all' range
            statsDocs = await DailyStudentStats.find({ studentId: studentObjId }).lean();
        }

        // Merge stats from docs
        let wordsSeen = 0;
        let correct = 0;
        let totalTimeSpentSeconds = 0;
        let todayOnlineSeconds = 0;
        let todayWordsSeen = 0;
        const sessionsCount = statsDocs.length;
        const unitMap: Record<string, { seen: number, correct: number }> = {};

        statsDocs.forEach(doc => {
            wordsSeen += (doc.wordsSeen || 0);
            correct += (doc.correct || 0);
            totalTimeSpentSeconds += (doc.timeSpentSeconds || 0);
            if (doc.date === todayStr) {
                todayOnlineSeconds = (doc.timeSpentSeconds || 0);
                todayWordsSeen = (doc.wordsSeen || 0);
            }
            if (doc.unitStats) {
                Object.entries(doc.unitStats).forEach(([uId, s]: [string, any]) => {
                    if (!unitMap[uId]) unitMap[uId] = { seen: 0, correct: 0 };
                    unitMap[uId].seen += (s.seen || 0);
                    unitMap[uId].correct += (s.correct || 0);
                });
            }
        });

        // Get total words seen from User model
        const userDoc = await (mongoose.model('User').findById(studentId).select('totalWordsSeen').lean() as any);
        const totalWordsSeen = userDoc?.totalWordsSeen || wordsSeen;

        // Get assigned units count
        const StudentUnitAccess = (await import('@/models/StudentUnitAccess')).default;
        const assignedUnitsCount = await StudentUnitAccess.countDocuments({ studentId: studentObjId });

        // FALLBACK: If no pre-aggregated data found...
        if (statsDocs.length === 0 && range === 'all') {
            const totalAgg = await QuizAnswer.aggregate([
                { $match: { studentId: studentObjId } },
                {
                    $group: {
                        _id: null,
                        wordsSeen: { $sum: 1 },
                        correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                        unitIds: { $addToSet: '$unitId' },
                    },
                },
            ]);
            const t = totalAgg[0] || { wordsSeen: 0, correct: 0, unitIds: [] };
            return NextResponse.json({
                range,
                wordsSeen: t.wordsSeen, // This is total words seen from answers
                correct: t.correct,
                accuracy: t.wordsSeen > 0 ? Math.round((t.correct / t.wordsSeen) * 100) : 0,
                unitsPracticed: t.unitIds.filter((u: any) => u != null).length,
                totalWordsSeen,
                assignedUnitsCount,
                totalTimeSpentSeconds: 0,
                todayOnlineSeconds: 0,
                todayWordsSeen: 0,
                sessionsCount: 0,
                unitBreakdown: [],
            });
        }

        const unitBreakdown = Object.entries(unitMap).map(([unitId, s]) => ({
            unitId,
            seen: s.seen,
            correct: s.correct,
            accuracy: s.seen > 0 ? Math.round((s.correct / s.seen) * 100) : 0
        })).sort((a, b) => b.seen - a.seen);

        const unitsPracticed = unitBreakdown.length;
        const accuracy = wordsSeen > 0 ? Math.round((correct / wordsSeen) * 100) : 0;

        return NextResponse.json({
            range,
            wordsSeen, // This is total in requested range
            correct,
            accuracy,
            unitsPracticed,
            totalWordsSeen,
            assignedUnitsCount,
            totalTimeSpentSeconds,
            todayOnlineSeconds,
            todayWordsSeen,
            sessionsCount,
            unitBreakdown
        });
    } catch (error) {
        console.error('[STUDENT_STATS]', error);
        return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
    }
}
