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
import StudentMistakeWord from '@/models/StudentMistakeWord';
import StudentGameProfile, { LEVELS } from '@/models/StudentGameProfile';
import StudentStreak from '@/models/StudentStreak';
import mongoose from 'mongoose';
import { getServerSession } from '@/lib/serverAuth';
/** Utility to generate 3 unique options, ensuring one is exactly the target word */
function buildQuestionData(word: any, allWords: any[]) {
    // 1. Gather pool excluding the target word
    const pool = allWords.filter(w => w._id.toString() !== word._id.toString());
    const shuffledPool = pool.map(w => ({ w, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ w }) => w);

    // 2. Select exactly 2 distinct distractors
    const distractors: typeof pool = [];
    for (const w of shuffledPool) {
        // Ensure no exact English or Uzbek duplicates in our carefully selected distractors
        const dupEn = distractors.some(d => d.englishWord.toLowerCase() === w.englishWord.toLowerCase());
        const dupUz = distractors.some(d => d.uzbekTranslation.toLowerCase() === w.uzbekTranslation.toLowerCase());
        const dupWordEn = w.englishWord.toLowerCase() === word.englishWord.toLowerCase();
        const dupWordUz = w.uzbekTranslation.toLowerCase() === word.uzbekTranslation.toLowerCase();

        if (!dupEn && !dupUz && !dupWordEn && !dupWordUz) {
            distractors.push(w);
        }
        if (distractors.length >= 2) break;
    }

    // 3. Fallback if pool is too small (rare)
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
    const shuffledOptions = rawOptions.map(opt => ({ opt, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ opt }) => opt);

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
        
    }
}

import { checkRateLimit, incrementFailedAttempt } from '@/lib/rateLimiter';

export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const rateKey = `quiz_submit_${student.id}_${ip}`;
        const limit = checkRateLimit(rateKey);

        if (!limit.allowed) {
            return NextResponse.json(
                { message: `Too many attempts. Locked out for ${limit.retryAfter} seconds.` },
                { status: 429 }
            );
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
            // Logs removed for production security
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
            
            throw err;
        });

        // ── TRACK MISTAKES for Yodlash page ──────────────────────────────────
        if (!isCorrect) {
            StudentMistakeWord.findOneAndUpdate(
                { studentId: new mongoose.Types.ObjectId(student.id), wordId: new mongoose.Types.ObjectId(wordId) },
                {
                    $inc: { wrongCount: 1 },
                    $set: { lastWrongAt: now, unitId: unitId || undefined },
                    $setOnInsert: { createdAt: now, isLearned: false },
                },
                { upsert: true }
            ).catch(() => {});
        } else if (attempt.mode === 'REVIEW_WRONGS') {
            // "Xatoni quizda topsa ochib ketsin" 
            // Mark as learned if corrected during Stage 2 review
            StudentMistakeWord.findOneAndUpdate(
                { studentId: new mongoose.Types.ObjectId(student.id), wordId: new mongoose.Types.ObjectId(wordId) },
                { $set: { isLearned: true, lastCorrectedAt: now } }
            ).catch(() => {});
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── AWARD XP for correct answers (fire-and-forget)
        if (isCorrect) {
            (async () => {
                try {
                    let gameProfile = await StudentGameProfile.findOne({ studentId: student.id });
                    if (!gameProfile) gameProfile = new StudentGameProfile({ studentId: student.id });
                    gameProfile.xp = (gameProfile.xp || 0) + 1;
                    gameProfile.totalCorrect = (gameProfile.totalCorrect || 0) + 1;
                    if (attempt.mode === 'REVIEW_WRONGS') {
                        gameProfile.totalMistakesFixed = (gameProfile.totalMistakesFixed || 0) + 1;
                    }
                    // Compute level
                    let newLevel = 1;
                    for (const l of LEVELS) { if (gameProfile.xp >= l.xpNeeded) newLevel = l.level; }
                    gameProfile.level = newLevel;
                    await gameProfile.save();
                } catch (e) {  }
            })();
        }

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
        
        if (unitIdStr) {
            dailyUpdate.$inc[`unitStats.${unitIdStr}.seen`] = 1;
            if (isCorrect) dailyUpdate.$inc[`unitStats.${unitIdStr}.correct`] = 1;
        }

        // Fire-and-forget stats update to avoid blocking response
        DailyStudentStats.findOneAndUpdate(
            { studentId: student.id, date: todayStr },
            dailyUpdate,
            { upsert: true }
        ).catch(() => {});

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
            ).catch(() => {});
        }
        // ───────────────────────────────────────────────

        // 4. PREPARE NEXT STEP OR END QUIZ
        let usedWordIds = attempt.usedWordIds || [];
        usedWordIds.push(wordId);
        const usedSet = new Set<string>(usedWordIds.map((id: any) => id.toString()));

        let remainingWordIds = (attempt.wordIds || []).filter((id: any) => !usedSet.has(id.toString()));
        let sessionActive = true;
        let isEndlessReset = false;

        // ENDLESS GROUP QUIZ LOGIC
        if (attempt.mode === 'GROUP_SESSION' && attempt.sessionId) {
            const groupSession = await GroupQuizSession.findById(attempt.sessionId).select('status').lean() as any;
            if (!groupSession || groupSession.status !== 'ACTIVE') {
                sessionActive = false;
            } else if (remainingWordIds.length === 0) {
                // The session is STILL active, but words ran out! 
                // We will reset usedWordIds so the loop continues.
                remainingWordIds = attempt.wordIds || [];
                isEndlessReset = true;
            }
        } else if (remainingWordIds.length === 0) {
            // Self-study quizzes just end naturally.
            sessionActive = false;
        }

        let nextClientQuestion = null;
        let coinsEarned = 0;
        const updateDoc: any = {
            $set: {
                correctCount: newCorrectCount,
                answeredCount: newAnsweredCount,
            }
        };

        if (isEndlessReset) {
            updateDoc.$set.usedWordIds = [wordId]; // Reset usedWordIds to only current word
        } else {
            updateDoc.$push = { usedWordIds: wordId };
        }

        if (sessionActive && remainingWordIds.length > 0) {
            // Serve the next question efficiently
            const nextWordId = remainingWordIds[Math.floor(Math.random() * remainingWordIds.length)];
            const nextWord = await Word.findById(nextWordId).lean() as any;
            
            // Get distractors fast using aggregate sample
            const unitObjectIds = (attempt.unitIds || []).map((id: any) => new mongoose.Types.ObjectId(id));
            const distractors = await Word.aggregate([
                { $match: { unitId: { $in: unitObjectIds }, _id: { $ne: nextWord._id } } },
                { $sample: { size: 4 } }
            ]);
            
            const pool = [nextWord, ...distractors];
            const { clientQuestion, correctOptionId } = buildQuestionData(nextWord, pool);

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

            // Fetch all wrong answers for this attempt (to identify if review is needed)
            const otherWrongAnswers = await QuizAnswer.find({ attemptId, isCorrect: false }).lean();
            const currentWrongId = !isCorrect ? [wordId] : [];
            const allWrongWordIds = [...new Set([...otherWrongAnswers.map(a => a.wordId.toString()), ...currentWrongId])];

            // REVIEW_WRONGS mode: award pending coins from source if review is complete
            if (attempt.mode === 'REVIEW_WRONGS') {
                coinsEarned = 0;
                updateDoc.$set.coinsEarned = 0;

                // If this was a review of a specific attempt with pending rewards
                if (attempt.sourceAttemptId) {
                    const sourceAttempt = await QuizAttempt.findById(attempt.sourceAttemptId);
                    if (sourceAttempt && (sourceAttempt as any).pendingCoins > 0) {
                        const pendingCoins = (sourceAttempt as any).pendingCoins;
                        await awardCoins(student.id, attemptId, sourceAttempt.correctCount, sourceAttempt.answeredCount, pendingCoins);
                        
                        // Clear pending coins in source and mark reward as granted here
                        await QuizAttempt.findByIdAndUpdate(attempt.sourceAttemptId, { $set: { pendingCoins: 0 } });
                        updateDoc.$set.coinsEarned = pendingCoins; 
                        coinsEarned = pendingCoins;
                    }
                }
            } else {
                const calculatedCoins = calculateCoins(newCorrectCount, newAnsweredCount);
                
                // If there are mistakes, hold the coins
                if (allWrongWordIds.length > 0) {
                    updateDoc.$set.pendingCoins = calculatedCoins;
                    updateDoc.$set.coinsEarned = 0;
                    coinsEarned = 0; // Don't show as earned in UI yet
                } else {
                    coinsEarned = calculatedCoins;
                    updateDoc.$set.coinsEarned = coinsEarned;
                    await awardCoins(student.id, attemptId, newCorrectCount, newAnsweredCount, coinsEarned);
                }
            }

            // Expose for the response block
            (attempt as any)._allWrongWordIds = allWrongWordIds;

            // ── TRIGGER STREAK on quiz end (fire-and-forget)
            (async () => {
                try {
                    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
                    let streak = await StudentStreak.findOne({ studentId: student.id });
                    if (!streak) {
                        await StudentStreak.create({ studentId: student.id, currentStreak: 1, longestStreak: 1, lastActivityDate: today, totalActiveDays: 1 });
                    } else if (streak.lastActivityDate !== today) {
                        const prevDate = new Date(today);
                        prevDate.setDate(prevDate.getDate() - 1);
                        const prevStr = prevDate.toISOString().slice(0, 10);
                        const isContinued = streak.lastActivityDate === prevStr;
                        streak.currentStreak = isContinued ? streak.currentStreak + 1 : 1;
                        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
                        streak.lastActivityDate = today;
                        streak.totalActiveDays = (streak.totalActiveDays || 0) + 1;
                        await streak.save();
                    }
                    // Award streak XP bonus
                    const streakXpBonus = streak?.currentStreak === 7 ? 20 : streak?.currentStreak === 3 ? 5 : 0;
                    if (streakXpBonus > 0) {
                        await StudentGameProfile.findOneAndUpdate(
                            { studentId: student.id },
                            { $inc: { xp: streakXpBonus } },
                            { upsert: true }
                        );
                    }
                    // Increment quiz counter
                    await StudentGameProfile.findOneAndUpdate(
                        { studentId: student.id },
                        { $inc: { totalQuizzes: 1 } },
                        { upsert: true }
                    );
                } catch (e) {  }
            })();
        }

        await QuizAttempt.findByIdAndUpdate(attemptId, updateDoc);

        // Calculate pending coins for UI display if just finished
        const allWrongs = (attempt as any)._allWrongWordIds || [];
        let pendingCoinsDisplay: number | undefined;
        if (!sessionActive && allWrongs.length > 0) {
            // Find what we just set in updateDoc
            pendingCoinsDisplay = updateDoc.$set.pendingCoins;
        }

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
            pendingCoins: pendingCoinsDisplay,
            isReviewMode: attempt.mode === 'REVIEW_WRONGS',
            wrongWordIds: !sessionActive ? allWrongs : undefined,
            stats: {
                correct: newCorrectCount,
                answered: newAnsweredCount,
                total: sessionActive ? attempt.wordIds?.length || newAnsweredCount : newAnsweredCount
            },
        });

    } catch (error) {
        
        return NextResponse.json({ message: 'Error processing answer' }, { status: 500 });
    }
}
