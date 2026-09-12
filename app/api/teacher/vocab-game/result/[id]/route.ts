import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameResult from '@/models/VocabGameResult';
import VocabGameSession from '@/models/VocabGameSession';
import QuestionResult from '@/models/QuestionResult';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

type Params = Promise<{ id: string }>;

/**
 * PATCH /api/teacher/vocab-game/result/[id]
 * Allows teacher to:
 * 1. Edit a student's score (correctCount, questionsAsked)
 * 2. Toggle a specific word's status (toggleWord: 'book', newResult: 'correct' | 'wrong')
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid result ID' }, { status: 400 });
        }

        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { correctCount, questionsAsked, toggleWord, newResult } = body;

        await dbConnect();

        const result = await VocabGameResult.findById(id);
        if (!result) {
            return NextResponse.json({ message: 'Result not found' }, { status: 404 });
        }

        let validCorrect = result.correctCount || 0;
        let validQuestions = result.questionsAsked || 6;
        let validWrong = result.wrongCount || 0;
        let accuracy = result.accuracy || 0;
        let warningCard = result.warningCard || false;

        // Word-level toggle: change a specific word from wrong -> correct or correct -> wrong
        if (toggleWord) {
            const qr = await QuestionResult.findOne({
                sessionId: result.sessionId,
                studentId: result.studentId,
                'wordSnapshot.englishWord': new RegExp(`^${toggleWord.trim()}$`, 'i')
            });

            if (qr) {
                qr.result = newResult || (qr.result === 'correct' ? 'wrong' : 'correct');
                await qr.save();
            }

            const correctCountNow = await QuestionResult.countDocuments({
                sessionId: result.sessionId,
                studentId: result.studentId,
                result: 'correct',
            });
            const wrongCountNow = await QuestionResult.countDocuments({
                sessionId: result.sessionId,
                studentId: result.studentId,
                result: 'wrong',
            });

            validCorrect = correctCountNow;
            validWrong = wrongCountNow;
            validQuestions = Math.max(1, correctCountNow + wrongCountNow);
            accuracy = Math.round((validCorrect / validQuestions) * 100);
            warningCard = validCorrect === 0;

            result.correctCount = validCorrect;
            result.wrongCount = validWrong;
            result.questionsAsked = validQuestions;
            result.accuracy = accuracy;
            result.warningCard = warningCard;
            await result.save();
        } else if (typeof correctCount === 'number' && typeof questionsAsked === 'number') {
            validQuestions = Math.max(1, questionsAsked);
            validCorrect = Math.max(0, Math.min(correctCount, validQuestions));
            validWrong = validQuestions - validCorrect;
            accuracy = Math.round((validCorrect / validQuestions) * 100);
            warningCard = validCorrect === 0;

            result.correctCount = validCorrect;
            result.questionsAsked = validQuestions;
            result.wrongCount = validWrong;
            result.accuracy = accuracy;
            result.warningCard = warningCard;
            await result.save();
        } else {
            return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
        }

        // Update session participant record if session exists
        const session = await VocabGameSession.findById(result.sessionId);
        if (session && Array.isArray(session.participants)) {
            const pIdx = session.participants.findIndex(
                (p: any) => p.studentId.toString() === result.studentId.toString()
            );
            if (pIdx !== -1) {
                session.participants[pIdx].correctAnswers = validCorrect;
                session.participants[pIdx].questionsAsked = validQuestions;
                session.participants[pIdx].wrongAnswers = validWrong;
                session.participants[pIdx].accuracy = accuracy;
                await session.save();
            }
        }

        // Update warningCard on User profile if needed
        if (!session?.noSave) {
            await User.findByIdAndUpdate(result.studentId, { warningCard });
        }

        return NextResponse.json({
            success: true,
            result: {
                _id: result._id,
                correctCount: validCorrect,
                questionsAsked: validQuestions,
                wrongCount: validWrong,
                accuracy,
                warningCard,
            },
        });
    } catch (error: any) {
        console.error('Update result error:', error);
        return NextResponse.json({ message: error.message || 'Error updating result' }, { status: 500 });
    }
}
