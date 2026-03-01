import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import QuizAttempt from '@/models/QuizAttempt';
import GroupQuizSession from '@/models/GroupQuizSession';
import { getServerSession } from '@/lib/serverAuth';

/** Utility to generate 3 unique options, ensuring one is exactly the target word */
function buildQuestionData(word: any, allWords: any[]) {
    // 1. Gather pool excluding the target word
    const pool = allWords.filter(w => w._id.toString() !== word._id.toString());
    const shuffledPool = pool.sort(() => Math.random() - 0.5);

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

export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        let { unitIds, sessionId, mode = 'STUDENT_SELF', timeLimitSec = 10 } = await req.json();

        await dbConnect();

        // If GROUP_SESSION, override units and timer strictly based on the session record
        if (sessionId && mode === 'GROUP_SESSION') {
            const session = await GroupQuizSession.findById(sessionId).lean() as any;
            if (!session) {
                return NextResponse.json({ message: 'Session not found' }, { status: 404 });
            }
            if (session.status !== 'ACTIVE') {
                return NextResponse.json({ message: 'Session is no longer active' }, { status: 400 });
            }
            timeLimitSec = session.timeLimitSec || 10;
            if (session.unitIds && session.unitIds.length > 0) {
                unitIds = session.unitIds.map((uid: any) => uid.toString());
            }
        }

        if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
            return NextResponse.json({ message: 'Valid unitIds required' }, { status: 400 });
        }

        const allWords = await Word.find({ unitId: { $in: unitIds } }).lean();
        if (allWords.length === 0) {
            return NextResponse.json({ message: 'No words found in selected units' }, { status: 400 });
        }

        // Create the attempt entry in DB
        const wordIdsList = allWords.map(w => w._id);
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

        // Pick a random starting word
        const startingWord = allWords[Math.floor(Math.random() * allWords.length)];
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
            total: allWords.length,
            timeLimitSec,
        });

    } catch (error) {
        console.error('[QUIZ_START] Error:', error);
        return NextResponse.json({ message: 'Error starting quiz' }, { status: 500 });
    }
}
