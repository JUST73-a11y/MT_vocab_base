import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import QuizAttempt from '@/models/QuizAttempt';
import GroupQuizSession from '@/models/GroupQuizSession';
import StudentEnergy, { MAX_ENERGY, ENERGY_REFILL_HOURS } from '@/models/StudentEnergy';
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

    // Safely shuffle into a new array to prevent reference loss
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

export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        let { unitIds, sessionId, mode = 'STUDENT_SELF', timeLimitSec = 10, questionCount, wrongWordIds, sourceAttemptId } = await req.json();

        await dbConnect();

        // ── ENERGY CHECK (Deduct for self-study and group quizzes)
        if (mode === 'STUDENT_SELF' || mode === 'GROUP_SESSION' || mode === 'GROUP_ASSIGNED') {
            let energyDoc = await StudentEnergy.findOne({ studentId: student.id });
            if (!energyDoc) {
                energyDoc = await StudentEnergy.create({ studentId: student.id, energy: MAX_ENERGY, lastRefilledAt: new Date() });
            } else {
                const refillMs = ENERGY_REFILL_HOURS * 3600000;
                if (Date.now() - energyDoc.lastRefilledAt.getTime() >= refillMs) {
                    energyDoc.energy = MAX_ENERGY;
                    energyDoc.lastRefilledAt = new Date();
                    await energyDoc.save();
                }
            }
            if (energyDoc.energy <= 0) {
                const nextMs = Math.max(0, ENERGY_REFILL_HOURS * 3600000 - (Date.now() - energyDoc.lastRefilledAt.getTime()));
                const secs = Math.ceil(nextMs / 1000);
                return NextResponse.json({
                    message: 'Energiya tugadi',
                    error: 'NO_ENERGY',
                    nextRefillSec: secs,
                    nextRefillHours: Math.floor(secs / 3600),
                    nextRefillMins: Math.floor((secs % 3600) / 60),
                }, { status: 429 });
            }
            energyDoc.energy -= 1;
            energyDoc.totalUsed = (energyDoc.totalUsed || 0) + 1;
            await energyDoc.save();
        }

        // ── REVIEW_WRONGS (Stage 2) ──────────────────────────────────────────
        if (mode === 'REVIEW_WRONGS' && wrongWordIds && wrongWordIds.length > 0) {
            const reviewWords = await Word.find({ _id: { $in: wrongWordIds } }).lean();
            if (reviewWords.length === 0) {
                return NextResponse.json({ message: 'No words found for review' }, { status: 400 });
            }

            // Collect unique unitIds from the wrong words
            const reviewUnitIds = [...new Set(reviewWords.map((w: any) => w.unitId?.toString()).filter(Boolean))];
            const allWordsForOptions = await Word.find({ unitId: { $in: reviewUnitIds } }).lean();

            const shuffledReview = [...reviewWords].sort(() => Math.random() - 0.5);
            const wordIdsList = shuffledReview.map(w => w._id);

            const attempt = await QuizAttempt.create({
                studentId: student.id,
                sourceAttemptId: sourceAttemptId || undefined,
                unitIds: reviewUnitIds,
                mode: 'REVIEW_WRONGS',
                wordIds: wordIdsList,
                usedWordIds: [],
                correctCount: 0,
                answeredCount: 0,
                coinsEarned: 0,
                _qMemo: {},
            });

            const startingWord = shuffledReview[0];
            const { clientQuestion, correctOptionId } = buildQuestionData(startingWord, allWordsForOptions.length >= 3 ? allWordsForOptions : reviewWords);
            const servedAt = new Date();

            await QuizAttempt.findByIdAndUpdate(attempt._id, {
                $set: { [`_qMemo.${clientQuestion.wordId}`]: { opt: correctOptionId, servedAt: servedAt.getTime() } }
            });

            return NextResponse.json({
                attemptId: attempt._id.toString(),
                question: { ...clientQuestion, servedAt: servedAt.toISOString(), timeLimitSec },
                total: wordIdsList.length,
                timeLimitSec,
                isReviewMode: true,
            });
        }

        // ── GROUP_SESSION / GROUP_ASSIGNED ────────────────────────────────────
        if (sessionId && (mode === 'GROUP_SESSION' || mode === 'GROUP_ASSIGNED')) {
            const session = await GroupQuizSession.findById(sessionId).lean() as any;
            if (!session) {
                return NextResponse.json({ message: 'Session not found' }, { status: 404 });
            }
            if (mode === 'GROUP_SESSION' && session.status !== 'ACTIVE') {
                return NextResponse.json({ message: 'Session is no longer active' }, { status: 400 });
            }
            if (mode === 'GROUP_ASSIGNED' && !['PUBLISHED', 'ACTIVE'].includes(session.status)) {
                return NextResponse.json({ message: 'Quiz is not available' }, { status: 400 });
            }
            timeLimitSec = session.timeLimitSec || 10;
            questionCount = session.questionCount || 20;
            if (session.unitIds && session.unitIds.length > 0) {
                unitIds = session.unitIds.map((uid: any) => uid.toString());
            }
        }

        // ── Standard flow (STUDENT_SELF / GROUP) ─────────────────────────────
        if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
            return NextResponse.json({ message: 'Valid unitIds required' }, { status: 400 });
        }

        const allWords = await Word.find({ unitId: { $in: unitIds } }).lean();
        if (allWords.length === 0) {
            return NextResponse.json({ message: 'No words found in selected units' }, { status: 400 });
        }

        const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
        const selectedWords = questionCount ? shuffledWords.slice(0, Number(questionCount)) : shuffledWords;
        const wordIdsList = selectedWords.map(w => w._id);

        // Create the attempt entry in DB
        const attempt = await QuizAttempt.create({
            studentId: student.id,
            sessionId: sessionId || undefined,
            unitIds: unitIds,
            mode: mode,
            wordIds: wordIdsList,
            usedWordIds: [], // Empty to start
            correctCount: 0,
            answeredCount: 0,
            _qMemo: {}, // Initialize plain object
        });

        // Pick a random starting word from the selected subset
        const startingWord = selectedWords[Math.floor(Math.random() * selectedWords.length)];
        const { clientQuestion, correctOptionId } = buildQuestionData(startingWord, allWords);

        const servedAt = new Date();

        // Securely memoize the correct answer mapping alongside the server timestamp
        await QuizAttempt.findByIdAndUpdate(attempt._id, {
            $set: {
                [`_qMemo.${clientQuestion.wordId}`]: {
                    opt: correctOptionId,
                    servedAt: servedAt.getTime(),
                }
            }
        });

        return NextResponse.json({
            attemptId: attempt._id.toString(),
            question: {
                ...clientQuestion,
                servedAt: servedAt.toISOString(),
                timeLimitSec
            },
            total: wordIdsList.length,
            timeLimitSec,
        });

    } catch (error) {
        
        return NextResponse.json({ message: 'Error starting quiz' }, { status: 500 });
    }
}
