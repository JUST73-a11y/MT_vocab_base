import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import VocabGameResult from '@/models/VocabGameResult';
import QuestionResult from '@/models/QuestionResult';
import { getServerSession } from '@/lib/serverAuth';

import mongoose from 'mongoose';
import Group from '@/models/Group';
import Unit from '@/models/Unit';
import User from '@/models/User';

type Params = Promise<{ id: string }>;

/**
 * GET /api/teacher/vocab-game/summary/[id]
 * Returns full session summary with roster order, QuestionResult analytics, difficult words, and weak words.
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
            .populate('groupId', 'name telegramChatId')
            .populate('unitId', 'title')
            .populate({ path: 'unitIds', select: 'title', strictPopulate: false });

        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const results = await VocabGameResult.find({ sessionId: id })
            .populate('studentId', 'name studentId email warningCard')
            .lean();

        // Fetch all QuestionResult records for this session
        const questionResults = await QuestionResult.find({ sessionId: id }).lean();

        // Map question results per student (guarantee zero duplicates per student)
        const studentQuestionMap = new Map<string, { correct: any[]; wrong: any[]; seenCorrect: Set<string>; seenWrong: Set<string> }>();
        const wordStatsMap = new Map<string, { englishWord: string; uzbekTranslation: string; totalAsked: number; correctCount: number; wrongCount: number; accuracy: number }>();

        for (const qr of questionResults) {
            const sId = qr.studentId?.toString();
            if (sId) {
                if (!studentQuestionMap.has(sId)) {
                    studentQuestionMap.set(sId, { correct: [], wrong: [], seenCorrect: new Set(), seenWrong: new Set() });
                }
                const eng = (qr.wordSnapshot?.englishWord || 'Unknown').trim();
                const engKey = eng.toLowerCase();

                const wordItem = {
                    englishWord: eng,
                    uzbekTranslation: qr.wordSnapshot?.uzbekTranslation || '',
                    phonetic: qr.wordSnapshot?.phonetic || '',
                    emoji: qr.wordSnapshot?.emoji || '',
                    result: qr.result,
                };

                const studentData = studentQuestionMap.get(sId)!;
                if (qr.result === 'correct') {
                    if (!studentData.seenCorrect.has(engKey)) {
                        studentData.seenCorrect.add(engKey);
                        studentData.correct.push(wordItem);
                    }
                } else {
                    if (!studentData.seenWrong.has(engKey)) {
                        studentData.seenWrong.add(engKey);
                        studentData.wrong.push(wordItem);
                    }
                }
            }

            // Word difficulty stats
            const wordKey = (qr.wordSnapshot?.englishWord || qr.vocabularyId?.toString() || 'Unknown').trim().toLowerCase();
            if (!wordStatsMap.has(wordKey)) {
                wordStatsMap.set(wordKey, {
                    englishWord: qr.wordSnapshot?.englishWord || 'Unknown',
                    uzbekTranslation: qr.wordSnapshot?.uzbekTranslation || '',
                    totalAsked: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    accuracy: 0,
                });
            }
            const ws = wordStatsMap.get(wordKey)!;
            ws.totalAsked++;
            if (qr.result === 'correct') ws.correctCount++;
            else ws.wrongCount++;
        }

        // Most Difficult Words sorted ascending by accuracy
        const difficultWords = Array.from(wordStatsMap.values())
            .map(ws => ({
                ...ws,
                accuracy: ws.totalAsked > 0 ? Math.round((ws.correctCount / ws.totalAsked) * 100) : 0,
            }))
            .sort((a, b) => a.accuracy - b.accuracy || b.wrongCount - a.wrongCount);

        // Attach question breakdowns to each student result
        const enhancedResults = results.map((r: any) => {
            const sId = r.studentId?._id?.toString() || r.studentId?.toString();
            const qData = studentQuestionMap.get(sId) || { correct: [], wrong: [] };
            return {
                ...r,
                correctWords: qData.correct,
                wrongWords: qData.wrong, // Weak words / Needs Practice
            };
        });

        // Strict Roster Order preservation: preserve order from session.studentOrder or student name
        const studentOrderMap = new Map((session.studentOrder || []).map((sId: any, idx: number) => [sId.toString(), idx]));
        
        enhancedResults.sort((a: any, b: any) => {
            const sIdA = a.studentId?._id?.toString() || a.studentId?.toString();
            const sIdB = b.studentId?._id?.toString() || b.studentId?.toString();
            const idxA = studentOrderMap.has(sIdA) ? (studentOrderMap.get(sIdA) ?? 999) : 999;
            const idxB = studentOrderMap.has(sIdB) ? (studentOrderMap.get(sIdB) ?? 999) : 999;
            return Number(idxA) - Number(idxB);
        });

        if (!enhancedResults.length) {
            return NextResponse.json({
                session,
                results: [],
                stats: null,
                difficultWords: [],
                telegramMessage: '',
            });
        }

        // Compute aggregate stats
        const totalStudents = enhancedResults.length;
        const totalQuestions = enhancedResults.reduce((s: number, r: any) => s + (r.questionsAsked || 0), 0);
        const totalCorrect = enhancedResults.reduce((s: number, r: any) => s + (r.correctCount || 0), 0);
        const totalWrong = enhancedResults.reduce((s: number, r: any) => s + (r.wrongCount || 0), 0);
        const avgScore = totalStudents > 0 ? Math.round(totalCorrect / totalStudents) : 0;
        const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const highestScore = Math.max(...enhancedResults.map((r: any) => r.correctCount || 0));
        const lowestScore = Math.min(...enhancedResults.map((r: any) => r.correctCount || 0));
        const passCount = enhancedResults.filter((r: any) => (r.accuracy || 0) >= 50).length;
        const failCount = totalStudents - passCount;
        const warningCardStudents = enhancedResults.filter((r: any) => r.warningCard);

        // Chart data
        const barChartData = enhancedResults.map((r: any) => ({
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
            `📊 VOCABULARY SESSION REPORT`,
            `👥 Guruh: ${groupName}`,
            `📚 Bo'lim: ${unitTitle}`,
            `📅 Sana: ${dateStr}`,
            `🎯 Umumiy aniqlik: ${avgAccuracy}% (${totalCorrect}/${totalQuestions})`,
            ``,
            `📋 O'quvchilar natijalari:`,
        ];

        enhancedResults.forEach((r: any, idx: number) => {
            if (idx > 0) {
                telegramLines.push(``);
            }
            const studentName = (r.studentId as any)?.name || 'Noma\'lum';
            telegramLines.push(`• ${studentName} — ${r.correctCount}/${r.questionsAsked} (${r.accuracy}%)`);

            const correctList = (r.correctWords || []).map((w: any) => w.englishWord).filter(Boolean);
            const wrongList = (r.wrongWords || []).map((w: any) => w.englishWord).filter(Boolean);

            if (correctList.length > 0) {
                telegramLines.push(`  ✅ To'g'ri: ${correctList.join(', ')}`);
            }
            if (wrongList.length > 0) {
                telegramLines.push(`  ❌ Topa olmadi: ${wrongList.join(', ')}`);
            }
        });

        if (warningCardStudents.length > 0) {
            telegramLines.push(``);
            telegramLines.push(`⚠️ Eslatib o'tamiz: 0 ta topgan o'quvchilarga ogohlantirish kartasi berildi.`);
        }

        const telegramMessage = telegramLines.join('\n');

        return NextResponse.json({
            session,
            results: enhancedResults,
            stats: {
                totalStudents,
                totalQuestions,
                totalCorrect,
                totalWrong,
                avgScore,
                avgAccuracy,
                highestScore,
                lowestScore,
                passCount,
                failCount,
                warningCardCount: warningCardStudents.length,
            },
            difficultWords,
            barChartData,
            telegramMessage,
        });

    } catch (error: any) {
        console.error('Summary error:', error);
        return NextResponse.json({ message: error.message || 'Error fetching summary' }, { status: 500 });
    }
}
