import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import VocabGameResult from '@/models/VocabGameResult';
import { getServerSession } from '@/lib/serverAuth';

import mongoose from 'mongoose';
import Group from '@/models/Group';
import Unit from '@/models/Unit';
import User from '@/models/User';

type Params = Promise<{ id: string }>;

/**
 * GET /api/teacher/vocab-game/summary/[id]
 * Returns full session summary with leaderboard, charts data, and Telegram message.
 */
export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid session ID' }, { status: 400 });
        }

        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Register models before populate
        const _dummyG = Group;
        const _dummyU = Unit;
        const _dummyUsr = User;

        const session = await VocabGameSession.findById(id)
            .populate('groupId', 'name')
            .populate('unitId', 'title')
            .populate({ path: 'unitIds', select: 'title', strictPopulate: false });

        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const results = await VocabGameResult.find({ sessionId: id })
            .populate('studentId', 'name email warningCard')
            .sort({ rank: 1 });

        if (!results.length) {
            return NextResponse.json({ session, results: [], stats: null, telegramMessage: '' });
        }

        // Compute aggregate stats
        const totalStudents = results.length;
        const totalCorrect = results.reduce((s, r) => s + r.correctCount, 0);
        const avgScore = Math.round(totalCorrect / totalStudents);
        const avgAccuracy = Math.round(results.reduce((s, r) => s + r.accuracy, 0) / totalStudents);
        const highestScore = Math.max(...results.map(r => r.correctCount));
        const lowestScore = Math.min(...results.map(r => r.correctCount));
        const passCount = results.filter(r => r.accuracy >= 50).length;
        const failCount = totalStudents - passCount;
        const warningCardStudents = results.filter(r => r.warningCard);

        // Chart data
        const barChartData = results.map(r => ({
            name: (r.studentId as any)?.name || 'N/A',
            correct: r.correctCount,
            wrong: r.wrongCount,
            accuracy: r.accuracy,
        }));

        // Telegram message generation
        const dateStr = new Date(session.createdAt).toLocaleDateString('uz-UZ');
        const groupName = (session.groupId as any)?.name || '';
        let unitTitle = '';
        if (Array.isArray(session.unitIds) && session.unitIds.length > 0) {
            unitTitle = session.unitIds.map((u: any) => u.title || 'Unit').join(', ');
        } else {
            unitTitle = (session.unitId as any)?.title || 'Lug\'at bo\'limlari';
        }

        let telegramLines = [
            `Assalomu Alaykum.`,
            `Bugun darsda lug'atdan Qaysi o'quvchi nechta topgai royxati,`,
            `xar bir o'quvchidan ${session.questionsPerStudent} tadan lug'at so'raladi.`,
            ``,
        ];

        results.forEach((r) => {
            const studentName = (r.studentId as any)?.name || 'Noma\'lum';
            telegramLines.push(`${studentName} ${r.correctCount} ta`);
            telegramLines.push(``);
        });

        if (warningCardStudents.length > 0) {
            telegramLines.push(`Eslatib o'taman 0 ta topgan o'quvchilarga warning card yani ( ogohlatirish kartasi berildi), keyingi darsda lug'atni yaxshiroq yod olib kelinglar.`);
        }

        const telegramMessage = telegramLines.join('\n');

        return NextResponse.json({
            session,
            results,
            stats: {
                totalStudents,
                avgScore,
                avgAccuracy,
                highestScore,
                lowestScore,
                passCount,
                failCount,
                warningCardCount: warningCardStudents.length,
            },
            barChartData,
            telegramMessage,
        });

    } catch (error) {
        console.error('Summary error:', error);
        return NextResponse.json({ message: 'Error fetching summary' }, { status: 500 });
    }
}
