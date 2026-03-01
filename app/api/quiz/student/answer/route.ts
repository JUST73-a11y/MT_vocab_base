import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import QuizAttempt from '@/models/QuizAttempt';
import QuizAnswer from '@/models/QuizAnswer';
import GroupQuizSession from '@/models/GroupQuizSession';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import DailyStudentStats from '@/models/DailyStudentStats';
import SessionScore from '@/models/SessionScore';
import mongoose from 'mongoose';
import { getServerSession } from '@/lib/serverAuth';
/** Utility to generate 3 unique options, ensuring one is exactly the target word */
function buildQuestionData(word: any, allWords: any[]) {
    const pool = allWords.filter(w => w._id.toString() !== word._id.toString());
    const shuffledPool = pool.sort(() => Math.random() - 0.5);

    const distractors: typeof pool = [];
    for (const w of shuffledPool) {
        const dupEn = distractors.some(d => d.englishWord.toLowerCase() === w.englishWord.toLowerCase());
        const dupUz = distractors.some(d => d.uzbekTranslation.toLowerCase() === w.uzbekTranslation.toLowerCase());
        const dupWordEn = w.englishWord.toLowerCase() === word.englishWord.toLowerCase();
        const dupWordUz = w.uzbekTranslation.toLowerCase() === word.uzbekTranslation.toLowerCase();

        if (!dupEn && !dupUz && !dupWordEn && !dupWordUz) {
            distractors.push(w);
        }
        if (distractors.length >= 2) break;
    }

    while (distractors.length < 2) {
        distractors.push({ _id: `fb_${distractors.length}`, englishWord: '— — —', uzbekTranslation: '— — —' });
    }

    // 4. Construct raw options and shuffle
    const rawOptions = [
        { enText: word.englishWord, uzText: word.uzbekTranslation, isTarget: true },
        { enText: distractors[0].englishWord, uzText: distractors[0].uzbekTranslation, isTarget: false },
        { enText: distractors[1].englishWord, uzText: distractors[1].uzbekTranslation, isTarget: false },
    ];

    // Safely shuffle into a new array
    const shuffledOptions = [...rawOptions].sort(() => Math.random() - 0.5);

    // 5. Assign clean IDs (opt_0, opt_1, opt_2) and locate the correct one
    let targetOptionId = '';
    const formattedOptions = shuffledOptions.map((opt, index) => {
        const id = `opt_${index}`;
        if (opt.isTarget) targetOptionId = id;
        return { id, enText: opt.enText, uzText: opt.uzText };
    });

    return {
        clientQuestion: {
            wordId: String(word._id),
            enText: word.englishWord,
            uzText: word.uzbekTranslation,
            phonetic: word.phonetic || null,
            options: formattedOptions,
        },
        correctOptionId: targetOptionId
    };
}

/** Calculate coins for a completed attempt */
function calculateCoins(correctCount: number, answeredCount: number): number {
    let coins = correctCount; // 1 coin per correct answer
    const accuracy = answeredCount > 0 ? (correctCount / answeredCount) * 100 : 0;
    if (accuracy >= 80 && answeredCount >= 10) {
        coins += 5; // accuracy bonus
    }
    return coins;
}

/** Award MT Coins — creates CoinTransaction + upserts Wallet balance */
async function awardCoins(studentId: string, attemptId: string, correctCount: number, answeredCount: number, coins: number) {
    if (coins <= 0) return;
    try {
        await CoinTransaction.create({
            studentId: new mongoose.Types.ObjectId(studentId),
            type: 'EARN_QUIZ',
            amount: coins,
            meta: { attemptId, correctCount, answeredCount },
        });
        await Wallet.findOneAndUpdate(
            { studentId: new mongoose.Types.ObjectId(studentId) },
            { $inc: { balance: coins }, $set: { updatedAt: new Date() } },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error('[AWARD_COINS] Failed:', err);
    }
}

export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const { attemptId, wordId, modeAtAnswerTime = 'EN' } = payload;

        // Standardize input parsing robustly
        const optId = payload.selectedOption || payload.selectedOptionId || null;
        const servedAtRaw = payload.servedAt;
        const timeLimitSec = parseInt(payload.timeLimitSec) || 10;

        if (!attemptId || !wordId) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        await dbConnect();

        const attempt = await QuizAttempt.findById(attemptId).lean() as any;
        if (!attempt) return NextResponse.json({ message: 'Attempt not found' }, { status: 404 });
        if (attempt.studentId.toString() !== student.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const word = await Word.findById(wordId).lean() as any;
        if (!word) return NextResponse.json({ message: 'Word not found' }, { status: 404 });

        // PREVENT DOUBLE SUBMISSION EXPLOIT
        if ((attempt.usedWordIds || []).some((id: any) => id.toString() === wordId)) {
            return NextResponse.json({ message: 'Already answered' }, { status: 400 });
        }

        // 1. TIMEOUT VERIFICATION (LATENCY AWARE)
        const qMemo = (attempt as any)._qMemo || {};
        const memoizedData = qMemo[wordId];

        if (!memoizedData) {
            return NextResponse.json({ message: 'Question not found in attempt' }, { status: 400 });
        }

        // Handle both old versions (string) and new versions (object with timestamp)
        const storedCorrectId = typeof memoizedData === 'string' ? memoizedData : memoizedData.opt;
        const serverServedAt = typeof memoizedData === 'object' && memoizedData.servedAt ? new Date(memoizedData.servedAt) : (servedAtRaw ? new Date(servedAtRaw) : null);

        const now = new Date();
        const timeElapsedMs = serverServedAt ? (now.getTime() - serverServedAt.getTime()) : Infinity;

        // ANTI-CHEAT: Minimum human reaction time threshold
        const ANTI_CHEAT_MIN_MS = 500;
        const isBotSpeed = timeElapsedMs < ANTI_CHEAT_MIN_MS;

        // If the client explicitly sent null, or it took WAY too long to arrive, it's a timeout.
        const graceBufferMs = optId ? 6000 : 2000;
        const strictlyTimeout = !optId || (timeElapsedMs > (timeLimitSec * 1000) + graceBufferMs);

        // 2. CORRECTNESS VERIFICATION
        // It is ONLY correct if it is NOT a timeout AND NOT bot speed AND the ID matches
        const isCorrect = !strictlyTimeout && !isBotSpeed && !!optId && (String(optId) === String(storedCorrectId));

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[QUIZ_ANSWER] wordId=${wordId} | opt=${optId} | stored=${storedCorrectId} | elapsed=${timeElapsedMs}ms`);
            console.log(`[QUIZ_ANSWER] Result -> timeout: ${strictlyTimeout} | correct: ${isCorrect} | botSpeed: ${isBotSpeed}`);
        }

        // 3. PERSIST THE ANSWER
        const unitId = word.unitId || null;
        await QuizAnswer.create({
            attemptId,
            studentId: student.id,
            unitId,
            wordId,
            wordSnapshot: { en: word.englishWord, uz: word.uzbekTranslation },
            selectedOption: optId || 'timeout',
            selectedText: optId || 'timeout',
            isCorrect,
            isTimeout: strictlyTimeout,
            modeAtAnswerTime,
            servedAt: serverServedAt || undefined,
            answeredAt: now,
        }).catch(err => {
            console.error('[QUIZ_ANSWER] DB creation failed:', err);
            throw err;
        });

        const newCorrectCount = (attempt.correctCount || 0) + (isCorrect ? 1 : 0);
        const newAnsweredCount = (attempt.answeredCount || 0) + 1;

        // ── PERFORMANCE OPTIMIZATION: INCREMENTAL STATS ──
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }); // YYYY-MM-DD
        const unitIdStr = unitId ? String(unitId) : null;

        const timeToAdd = (timeElapsedMs && timeElapsedMs !== Infinity && timeElapsedMs > 0) ? (timeElapsedMs / 1000) : 0;

        const dailyUpdate: any = {
            $inc: {
                wordsSeen: 1,
                correct: isCorrect ? 1 : 0,
                timeSpentSeconds: timeToAdd
            }
        };
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[QUIZ_STATS_UPDATE] studentId=${student.id} | timeToAdd=${timeToAdd}s`);
        }
        if (unitIdStr) {
            dailyUpdate.$inc[`unitStats.${unitIdStr}.seen`] = 1;
            if (isCorrect) dailyUpdate.$inc[`unitStats.${unitIdStr}.correct`] = 1;
        }

        await DailyStudentStats.findOneAndUpdate(
            { studentId: student.id, date: todayStr },
            dailyUpdate,
            { upsert: true }
        ).catch(err => console.error('[DAILY_STATS] Update failed:', err));

        if (attempt.mode === 'GROUP_SESSION' && attempt.sessionId) {
            const currentScore = await SessionScore.findOne({ sessionId: attempt.sessionId, studentId: student.id });
            const sNewCorrect = (currentScore?.correctCount || 0) + (isCorrect ? 1 : 0);
            const sNewAnswered = (currentScore?.answeredCount || 0) + 1;
            const sNewAccuracy = Math.round((sNewCorrect / sNewAnswered) * 100);

            await SessionScore.findOneAndUpdate(
                { sessionId: attempt.sessionId, studentId: student.id },
                {
                    $set: { correctCount: sNewCorrect, answeredCount: sNewAnswered, accuracy: sNewAccuracy, lastAnsweredAt: now }
                },
                { upsert: true }
            ).catch(err => console.error('[SESSION_SCORE] Update failed:', err));
        }
        // ───────────────────────────────────────────────

        // 4. PREPARE NEXT STEP OR END QUIZ
        const allWords = await Word.find({ unitId: { $in: attempt.unitIds } }).lean();
        let usedWordIds = attempt.usedWordIds || [];
        usedWordIds.push(wordId);

        const usedSet = new Set<string>(usedWordIds.map((id: any) => id.toString()));
        let remainingWords = allWords.filter((w: any) => !usedSet.has(w._id.toString()));

        let sessionActive = true;

        // ENDLESS GROUP QUIZ LOGIC
        if (attempt.mode === 'GROUP_SESSION' && attempt.sessionId) {
            const groupSession = await GroupQuizSession.findById(attempt.sessionId).lean() as any;
            if (!groupSession || groupSession.status !== 'ACTIVE') {
                sessionActive = false;
            } else if (remainingWords.length === 0) {
                // The session is STILL active, but words ran out! 
                // We don't want to show an 'end screen' because teacher hasn't stopped it.
                // We will reset usedWordIds conceptually (or pick any random word) so the loop continues.
                remainingWords = allWords; // Serve from the entire pool again endlessly!
            }
        } else if (remainingWords.length === 0) {
            // Self-study quizzes just end naturally.
            sessionActive = false;
        }

        let nextClientQuestion = null;
        let coinsEarned = 0;
        const updateDoc: any = {
            $push: { usedWordIds: wordId },
            $set: {
                correctCount: newCorrectCount,
                answeredCount: newAnsweredCount,
            }
        };

        if (sessionActive && remainingWords.length > 0) {
            // Serve the next question
            const nextWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
            const { clientQuestion, correctOptionId } = buildQuestionData(nextWord, allWords);

            const newServedAt = new Date();
            nextClientQuestion = {
                ...clientQuestion,
                servedAt: newServedAt.toISOString(),
                timeLimitSec
            };

            // Atomically overwrite the memo for the NEW word alongside server timestamp
            updateDoc.$set[`_qMemo.${clientQuestion.wordId}`] = {
                opt: correctOptionId,
                servedAt: newServedAt.getTime()
            };
        } else {
            // End the attempt
            updateDoc.$set.endedAt = new Date();
            coinsEarned = calculateCoins(newCorrectCount, newAnsweredCount);
            updateDoc.$set.coinsEarned = coinsEarned;
            awardCoins(student.id, attemptId, newCorrectCount, newAnsweredCount, coinsEarned);
        }

        await QuizAttempt.findByIdAndUpdate(attemptId, updateDoc);

        return NextResponse.json({
            isCorrect,
            isTimeout: strictlyTimeout,
            correctOptionId: storedCorrectId,
            correctWordId: wordId,
            correctEnText: word.englishWord,
            correctUzText: word.uzbekTranslation,
            nextQuestion: nextClientQuestion,
            quizDone: !sessionActive,
            coinsEarned: !sessionActive ? coinsEarned : undefined,
            stats: {
                correct: newCorrectCount,
                answered: newAnsweredCount,
                total: sessionActive ? attempt.wordIds?.length || newAnsweredCount : newAnsweredCount
            },
        });

    } catch (error) {
        console.error('[QUIZ_ANSWER] Major Error:', error);
        return NextResponse.json({ message: 'Error processing answer' }, { status: 500 });
    }
}
