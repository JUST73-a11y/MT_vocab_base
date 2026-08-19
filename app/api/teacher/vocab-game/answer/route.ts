import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import VocabGameResult from '@/models/VocabGameResult';
import Word from '@/models/Word';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

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
 * Submit the final score for a student in the session, then advance to next student.
 * Body: { sessionId, studentId, correctCount, wrongCount, wordIds }
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId, studentId, correctCount, wrongCount, wordIds, totalTimeMs } = await req.json();
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

        const questionsAsked = (correctCount || 0) + (wrongCount || 0);
        const accuracy = questionsAsked > 0 ? Math.round((correctCount / questionsAsked) * 100) : 0;
        const isWarningCard = correctCount === 0;
        const finalTimeMs = totalTimeMs || 0;

        // Save result
        const existingResult = await VocabGameResult.findOne({ sessionId, studentId });
        if (!existingResult) {
            await VocabGameResult.create({
                sessionId,
                studentId,
                groupId: session.groupId,
                teacherId: session.teacherId,
                unitId: session.unitId,
                questionsAsked,
                correctCount: correctCount || 0,
                wrongCount: wrongCount || 0,
                accuracy,
                warningCard: isWarningCard,
                wordIds: wordIds || [],
                rank: 0, // will be updated after session ends
                totalTimeMs: finalTimeMs,
                performanceScore: 0 // will be calculated after session ends
            });
        }

        // Update warning card on user profile (only if not in noSave mode)
        if (isWarningCard && !session.noSave) {
            await User.findByIdAndUpdate(studentId, { warningCard: true });
        }

        // Advance to next student
        const nextIndex = session.currentStudentIndex + 1;
        const isFinished = nextIndex >= session.studentOrder.length;

        session.currentStudentIndex = nextIndex;
        if (isFinished) {
            session.status = 'ENDED';
            session.endedAt = new Date();

            // Update ranks based on Performance Score
            const allResults = await VocabGameResult.find({ sessionId });
            for (let i = 0; i < allResults.length; i++) {
                const r = allResults[i];
                const accScore = (r.accuracy || 0) * 0.7; // Max 70
                
                const avgMs = r.questionsAsked > 0 ? (r.totalTimeMs || 0) / r.questionsAsked : 0;
                // speedScore: 10 seconds per question is 0. 0 seconds is 100.
                let speedScore = Math.max(0, 100 - (avgMs / 100)); // Max 100
                // totalScore: 100 seconds is 0. 0 seconds is 100.
                let timeScore = Math.max(0, 100 - ((r.totalTimeMs || 0) / 1000)); // Max 100

                const finalScore = Math.round(accScore + (speedScore * 0.2) + (timeScore * 0.1));
                r.performanceScore = finalScore;
            }

            // Sort by performance score descending
            allResults.sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
            
            for (let i = 0; i < allResults.length; i++) {
                await VocabGameResult.findByIdAndUpdate(allResults[i]._id, { 
                    rank: i + 1,
                    performanceScore: allResults[i].performanceScore
                });
            }
        }
        await session.save();

        // Return next student info if not finished
        let nextStudent = null;
        let nextWords: any[] = [];
        if (!isFinished) {
            const nextStudentId = session.studentOrder[nextIndex];
            nextStudent = await User.findById(nextStudentId).select('name email warningCard');

            const targetUnitIds = (session.unitIds && session.unitIds.length > 0)
                ? session.unitIds
                : [session.unitId];

            const alreadyUsed = (session.usedWordIds || []).map((id: any) => id.toString());
            const countNeeded = session.questionsPerStudent || 6;

            // Fetch words from unit(s) that have NOT been used yet in this session
            let unusedWords = await Word.find({
                unitId: { $in: targetUnitIds },
                _id: { $nin: alreadyUsed }
            }).select('englishWord uzbekTranslation phonetic').lean();

            let pickedWords: any[] = [];

            if (unusedWords.length >= countNeeded) {
                pickedWords = shuffle(unusedWords).slice(0, countNeeded);
            } else {
                // If unused words are fewer than needed, pick all remaining unused words...
                pickedWords = shuffle(unusedWords);

                // ...and reset usedWordIds pool to pick the remaining balance from all unit words
                const allUnitWords = await Word.find({ unitId: { $in: targetUnitIds } }).select('englishWord uzbekTranslation phonetic').lean();
                const pickedIds = new Set(pickedWords.map((w: any) => w._id.toString()));
                const fillerCandidates = allUnitWords.filter((w: any) => !pickedIds.has(w._id.toString()));
                const fillerWords = shuffle(fillerCandidates).slice(0, countNeeded - pickedWords.length);

                pickedWords = [...pickedWords, ...fillerWords];
                // Reset usedWordIds to current new batch
                session.usedWordIds = [];
            }

            // Track newly picked word IDs in session
            const newWordIds = pickedWords.map((w: any) => w._id);
            session.usedWordIds = [...(session.usedWordIds || []), ...newWordIds];
            await session.save();

            nextWords = pickedWords;
        }

        return NextResponse.json({
            success: true,
            isFinished,
            nextStudent,
            nextWords,
            session: {
                _id: session._id,
                status: session.status,
                currentStudentIndex: session.currentStudentIndex,
                totalStudents: session.studentOrder.length,
            }
        });

    } catch (error: any) {
        console.error('Answer submit error:', error);
        return NextResponse.json({ message: 'Error submitting answer' }, { status: 500 });
    }
}
