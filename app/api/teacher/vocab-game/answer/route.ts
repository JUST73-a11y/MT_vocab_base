import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import VocabGameResult from '@/models/VocabGameResult';
import QuestionResult from '@/models/QuestionResult';
import Word from '@/models/Word';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * POST /api/teacher/vocab-game/answer
 * Submit the student score, save QuestionResult for every word, update participants, and advance.
 * Body: { sessionId, studentId, correctCount, wrongCount, wordIds, questionAnswers, totalTimeMs }
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId, studentId, correctCount = 0, wrongCount = 0, wordIds = [], questionAnswers = [], totalTimeMs = 0 } = body;

        if (!sessionId || !studentId) {
            return NextResponse.json({ message: 'sessionId and studentId are required' }, { status: 400 });
        }

        await dbConnect();

        const session = await VocabGameSession.findById(sessionId);
        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (session.status !== 'ACTIVE') {
            return NextResponse.json({ message: 'Session is not active' }, { status: 400 });
        }

        const studentUser = await User.findById(studentId).select('name studentId email warningCard');
        const studentName = studentUser?.name || 'Noma\'lum';
        const customStudentId = studentUser?.studentId || '';

        const maxQ = session.questionsPerStudent || 6;
        const safeCorrect = Math.min(maxQ, Math.max(0, Number(correctCount) || 0));
        const safeWrong = Math.min(maxQ - safeCorrect, Math.max(0, Number(wrongCount) || 0));
        const questionsAsked = safeCorrect + safeWrong;
        const accuracy = questionsAsked > 0 ? Math.round((safeCorrect / questionsAsked) * 100) : 0;
        const isWarningCard = safeCorrect === 0 && questionsAsked > 0;
        const finalTimeMs = totalTimeMs || 0;

        // Fetch Word details to guarantee exact snapshot persistence
        const words = await Word.find({ _id: { $in: wordIds } }).lean();
        const wordsMap = new Map(words.map((w: any) => [w._id.toString(), w]));

        // 1. Save detailed QuestionResult records for every asked word (clean prior duplicates first)
        await QuestionResult.deleteMany({
            sessionId: session._id,
            studentId: new mongoose.Types.ObjectId(studentId),
        });

        if (Array.isArray(questionAnswers) && questionAnswers.length > 0) {
            const questionResultDocs = questionAnswers.map((qa: any, idx: number) => {
                const wordDoc: any = wordsMap.get(qa.wordId?.toString()) || {};
                return {
                    sessionId: session._id,
                    studentId: new mongoose.Types.ObjectId(studentId),
                    customStudentId,
                    studentNameSnapshot: studentName,
                    groupId: session.groupId,
                    teacherId: session.teacherId,
                    vocabularyId: new mongoose.Types.ObjectId(qa.wordId),
                    wordSnapshot: {
                        englishWord: qa.englishWord || wordDoc.englishWord || 'Unknown',
                        uzbekTranslation: qa.uzbekTranslation || wordDoc.uzbekTranslation || 'Noma\'lum',
                        phonetic: qa.phonetic || wordDoc.phonetic || '',
                        emoji: qa.emoji || wordDoc.emoji || '',
                    },
                    result: qa.result === 'correct' ? 'correct' : 'wrong',
                    responseTimeMs: qa.responseTimeMs || 0,
                    questionIndex: idx,
                    askedAt: new Date(),
                };
            });

            await QuestionResult.insertMany(questionResultDocs).catch(err => console.error('Error inserting QuestionResults:', err));
        } else if (wordIds.length > 0) {
            // Fallback if questionAnswers array wasn't provided directly
            const questionResultDocs = wordIds.map((wId: string, idx: number) => {
                const wordDoc: any = wordsMap.get(wId.toString()) || {};
                const isCorrect = idx < correctCount;
                return {
                    sessionId: session._id,
                    studentId: new mongoose.Types.ObjectId(studentId),
                    customStudentId,
                    studentNameSnapshot: studentName,
                    groupId: session.groupId,
                    teacherId: session.teacherId,
                    vocabularyId: new mongoose.Types.ObjectId(wId),
                    wordSnapshot: {
                        englishWord: wordDoc.englishWord || 'Unknown',
                        uzbekTranslation: wordDoc.uzbekTranslation || 'Noma\'lum',
                        phonetic: wordDoc.phonetic || '',
                        emoji: wordDoc.emoji || '',
                    },
                    result: isCorrect ? 'correct' : 'wrong',
                    responseTimeMs: 0,
                    questionIndex: idx,
                    askedAt: new Date(),
                };
            });
            await QuestionResult.insertMany(questionResultDocs).catch(err => console.error('Error inserting QuestionResults:', err));
        }

        // 2. Save / Update VocabGameResult for student
        await VocabGameResult.findOneAndUpdate(
            { sessionId, studentId },
            {
                sessionId,
                studentId,
                groupId: session.groupId,
                teacherId: session.teacherId,
                unitId: session.unitId,
                questionsAsked,
                correctCount: safeCorrect,
                wrongCount: safeWrong,
                accuracy,
                warningCard: isWarningCard,
                wordIds: wordIds || [],
                rank: 0,
                totalTimeMs: finalTimeMs,
                performanceScore: 0,
            },
            { upsert: true, new: true }
        );

        // 3. Update participant subrecord in session
        if (Array.isArray(session.participants)) {
            const pIdx = session.participants.findIndex((p: any) => p.studentId.toString() === studentId);
            if (pIdx !== -1) {
                session.participants[pIdx].questionsAsked = questionsAsked;
                session.participants[pIdx].correctAnswers = safeCorrect;
                session.participants[pIdx].wrongAnswers = safeWrong;
                session.participants[pIdx].accuracy = accuracy;
                session.participants[pIdx].status = 'completed';
            }
        }

        // Update warning card on user profile (only if not in noSave mode)
        if (isWarningCard && !session.noSave) {
            await User.findByIdAndUpdate(studentId, { warningCard: true });
        }

        // Advance to next student in roster
        const nextIndex = session.currentStudentIndex + 1;
        const isFinished = nextIndex >= session.studentOrder.length;

        session.currentStudentIndex = nextIndex;
        if (isFinished) {
            session.status = 'ENDED';
            session.endedAt = new Date();

            // Calculate ranks fast with bulkWrite
            const allResults = await VocabGameResult.find({ sessionId });
            for (let i = 0; i < allResults.length; i++) {
                const r = allResults[i];
                const accScore = (r.accuracy || 0) * 0.7;
                const avgMs = r.questionsAsked > 0 ? (r.totalTimeMs || 0) / r.questionsAsked : 0;
                let speedScore = Math.max(0, 100 - (avgMs / 100));
                let timeScore = Math.max(0, 100 - ((r.totalTimeMs || 0) / 1000));
                r.performanceScore = Math.round(accScore + (speedScore * 0.2) + (timeScore * 0.1));
            }

            allResults.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));

            if (allResults.length > 0) {
                const bulkOps = allResults.map((resDoc, idx) => ({
                    updateOne: {
                        filter: { _id: resDoc._id },
                        update: {
                            rank: idx + 1,
                            performanceScore: resDoc.performanceScore,
                        },
                    },
                }));
                await VocabGameResult.bulkWrite(bulkOps);
            }
        }

        // Return next student info if not finished
        let nextStudent = null;
        let nextWords: any[] = [];
        if (!isFinished) {
            const nextStudentId = session.studentOrder[nextIndex];
            const nextUser = await User.findById(nextStudentId).select('name studentId email warningCard');
            if (nextUser) {
                nextStudent = {
                    _id: nextUser._id,
                    name: nextUser.name,
                    studentId: nextUser.studentId,
                    email: nextUser.email,
                    warningCard: nextUser.warningCard,
                };
            }

            const targetUnitIds = (session.unitIds && session.unitIds.length > 0)
                ? session.unitIds
                : [session.unitId];

            const alreadyUsed = (session.usedWordIds || []).map((id: any) => id.toString());
            const countNeeded = session.questionsPerStudent || 6;

            let unusedWords = await Word.find({
                unitId: { $in: targetUnitIds },
                _id: { $nin: alreadyUsed },
            }).select('englishWord uzbekTranslation phonetic emoji').lean();

            let pickedWords: any[] = [];

            if (unusedWords.length >= countNeeded) {
                pickedWords = shuffle(unusedWords).slice(0, countNeeded);
            } else {
                pickedWords = shuffle(unusedWords);
                const allUnitWords = await Word.find({ unitId: { $in: targetUnitIds } })
                    .select('englishWord uzbekTranslation phonetic emoji')
                    .lean();
                const pickedIds = new Set(pickedWords.map((w: any) => w._id.toString()));
                const fillerCandidates = allUnitWords.filter((w: any) => !pickedIds.has(w._id.toString()));
                const fillerWords = shuffle(fillerCandidates).slice(0, countNeeded - pickedWords.length);

                pickedWords = [...pickedWords, ...fillerWords];
                session.usedWordIds = [];
            }

            const newWordIds = pickedWords.map((w: any) => w._id);
            session.usedWordIds = [...(session.usedWordIds || []), ...newWordIds];
            nextWords = pickedWords;
        }

        // Single clean atomic save
        await session.save();

        return NextResponse.json({
            success: true,
            isFinished,
            nextStudent,
            nextWords,
            session: {
                _id: session._id,
                status: session.status,
                participants: session.participants,
                currentStudentIndex: session.currentStudentIndex,
                totalStudents: session.studentOrder.length,
            },
        });

    } catch (error: any) {
        console.error('Answer submit error:', error);
        return NextResponse.json({ message: error.message || 'Error submitting answer' }, { status: 500 });
    }
}
