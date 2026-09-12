import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import VocabGameResult from '@/models/VocabGameResult';
import QuestionResult from '@/models/QuestionResult';
import Group from '@/models/Group';
import Unit from '@/models/Unit';
import User from '@/models/User';
import mongoose from 'mongoose';

type Params = Promise<{ id: string }>;

/**
 * GET /api/teacher/vocab-game/report/[id]
 * Standardized data endpoint for Telegram Bot and PNG Session Report image generation.
 */
export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid session ID' }, { status: 400 });
        }

        await dbConnect();

        const _dummyG = Group;
        const _dummyU = Unit;
        const _dummyUsr = User;

        const session = await VocabGameSession.findById(id)
            .populate('groupId', 'name level course')
            .populate('unitId', 'title')
            .populate({ path: 'unitIds', select: 'title' });

        if (!session) {
            return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        }

        const results = await VocabGameResult.find({ sessionId: id })
            .populate('studentId', 'name studentId email')
            .lean();

        const questionResults = await QuestionResult.find({ sessionId: id }).lean();

        const studentQuestionMap = new Map<string, { correct: any[]; wrong: any[] }>();
        const wordStatsMap = new Map<string, { englishWord: string; uzbekTranslation: string; totalAsked: number; correctCount: number; wrongCount: number }>();

        for (const qr of questionResults) {
            const sId = qr.studentId?.toString();
            if (sId) {
                if (!studentQuestionMap.has(sId)) {
                    studentQuestionMap.set(sId, { correct: [], wrong: [] });
                }
                const wordSnapshot = {
                    englishWord: qr.wordSnapshot?.englishWord || 'Unknown',
                    uzbekTranslation: qr.wordSnapshot?.uzbekTranslation || '',
                    phonetic: qr.wordSnapshot?.phonetic || '',
                };
                if (qr.result === 'correct') {
                    studentQuestionMap.get(sId)!.correct.push(wordSnapshot);
                } else {
                    studentQuestionMap.get(sId)!.wrong.push(wordSnapshot);
                }
            }

            const wordKey = qr.wordSnapshot?.englishWord || 'Unknown';
            if (!wordStatsMap.has(wordKey)) {
                wordStatsMap.set(wordKey, {
                    englishWord: qr.wordSnapshot?.englishWord || 'Unknown',
                    uzbekTranslation: qr.wordSnapshot?.uzbekTranslation || '',
                    totalAsked: 0,
                    correctCount: 0,
                    wrongCount: 0,
                });
            }
            const ws = wordStatsMap.get(wordKey)!;
            ws.totalAsked++;
            if (qr.result === 'correct') ws.correctCount++;
            else ws.wrongCount++;
        }

        // Difficult words
        const difficultWords = Array.from(wordStatsMap.values())
            .map(ws => ({
                ...ws,
                accuracy: ws.totalAsked > 0 ? Math.round((ws.correctCount / ws.totalAsked) * 100) : 0,
            }))
            .sort((a, b) => a.accuracy - b.accuracy);

        // Strict Roster Order preservation
        const studentOrderMap = new Map((session.studentOrder || []).map((sId: any, idx: number) => [sId.toString(), idx]));
        
        const formattedStudents = results.map((r: any) => {
            const sId = r.studentId?._id?.toString() || r.studentId?.toString();
            const qData = studentQuestionMap.get(sId) || { correct: [], wrong: [] };
            return {
                studentId: (r.studentId as any)?.studentId || '',
                name: (r.studentId as any)?.name || 'Noma\'lum',
                score: `${r.correctCount}/${r.questionsAsked}`,
                accuracy: r.accuracy,
                correctCount: r.correctCount,
                wrongCount: r.wrongCount,
                questionsAsked: r.questionsAsked,
                correctWords: qData.correct,
                wrongWords: qData.wrong, // Weak words
            };
        }).sort((a: any, b: any) => {
            const idxA = studentOrderMap.has(a.studentId) ? (studentOrderMap.get(a.studentId) ?? 999) : 999;
            const idxB = studentOrderMap.has(b.studentId) ? (studentOrderMap.get(b.studentId) ?? 999) : 999;
            return Number(idxA) - Number(idxB);
        });

        const totalQuestions = formattedStudents.reduce((s, st) => s + st.questionsAsked, 0);
        const totalCorrect = formattedStudents.reduce((s, st) => s + st.correctCount, 0);
        const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        let unitTitle = '';
        if (Array.isArray(session.unitIds) && session.unitIds.length > 0) {
            unitTitle = session.unitIds.map((u: any) => u.title || 'Unit').join(', ');
        } else {
            unitTitle = (session.unitId as any)?.title || 'Lug\'at bo\'limlari';
        }

        return NextResponse.json({
            success: true,
            report: {
                sessionId: session._id,
                groupName: (session.groupId as any)?.name || '',
                unitTitle,
                date: new Date(session.createdAt).toLocaleDateString('uz-UZ'),
                totalStudents: formattedStudents.length,
                totalQuestions,
                totalCorrect,
                overallAccuracy,
                students: formattedStudents,
                difficultWords: difficultWords.slice(0, 10),
            }
        });

    } catch (error: any) {
        console.error('Report API error:', error);
        return NextResponse.json({ message: error.message || 'Error generating report data' }, { status: 500 });
    }
}
