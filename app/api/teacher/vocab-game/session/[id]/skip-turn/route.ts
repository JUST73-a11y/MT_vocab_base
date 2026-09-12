import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
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

type Params = Promise<{ id: string }>;

/**
 * POST /api/teacher/vocab-game/session/[id]/skip-turn
 * Skip or defer the current student's turn in an active vocab game session.
 * Body: { action: 'defer' | 'skip_absent' }
 * - 'defer': moves current student to the end of studentOrder so they can answer when they return.
 * - 'skip_absent': marks current student as absent and removes from studentOrder.
 */
export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const { id: sessionId } = await params;
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
            return NextResponse.json({ message: "Noto'g'ri sessiya ID" }, { status: 400 });
        }

        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const action = body.action === 'skip_absent' ? 'skip_absent' : 'defer';

        await dbConnect();

        const session = await VocabGameSession.findById(sessionId);
        if (!session) {
            return NextResponse.json({ message: 'Sessiya topilmadi' }, { status: 404 });
        }

        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Ruxsat berilmagan sessiya' }, { status: 403 });
        }

        if (session.status !== 'ACTIVE') {
            return NextResponse.json({ message: "Sessiya faol emas (yakunlangan yoki to'xtatilgan)" }, { status: 400 });
        }

        const currentIndex = session.currentStudentIndex;
        if (currentIndex < 0 || currentIndex >= session.studentOrder.length) {
            return NextResponse.json({ message: "O'quvchi navbati topilmadi" }, { status: 400 });
        }

        const remainingStudentsCount = session.studentOrder.length - currentIndex;

        if (action === 'defer') {
            if (remainingStudentsCount <= 1) {
                return NextResponse.json({
                    message: "Bu navbatdagi oxirgi o'quvchi. Keyingi o'quvchi yo'q. Agar o'quvchi kelmasa, sessiyani yakunlashingiz mumkin.",
                    canFinish: true,
                }, { status: 400 });
            }

            // Move current student to the end of studentOrder
            const [deferredId] = session.studentOrder.splice(currentIndex, 1);
            session.studentOrder.push(deferredId);

            // Update participant in session
            const pIdx = session.participants.findIndex((p: any) => p.studentId.toString() === deferredId.toString());
            if (pIdx !== -1) {
                session.participants[pIdx].status = 'present';
                session.participants[pIdx].currentQuestionIndex = 0;
            }
        } else {
            // action === 'skip_absent'
            const [absentId] = session.studentOrder.splice(currentIndex, 1);
            const pIdx = session.participants.findIndex((p: any) => p.studentId.toString() === absentId.toString());
            if (pIdx !== -1) {
                session.participants[pIdx].status = 'absent';
            }
        }

        // Check if finished
        const isFinished = currentIndex >= session.studentOrder.length;
        if (isFinished) {
            session.status = 'ENDED';
            session.endedAt = new Date();
            await session.save();

            return NextResponse.json({
                success: true,
                isFinished: true,
                message: "Barcha o'quvchilar yakunladi!",
                session: {
                    _id: session._id,
                    status: session.status,
                    participants: session.participants,
                    studentOrder: session.studentOrder,
                    currentStudentIndex: session.currentStudentIndex,
                    totalStudents: session.studentOrder.length,
                }
            });
        }

        // Next student is now at session.currentStudentIndex
        const nextStudentId = session.studentOrder[currentIndex];
        const nextUser = await User.findById(nextStudentId).select('name studentId email warningCard');

        const nextStudent = nextUser ? {
            _id: nextUser._id,
            name: nextUser.name,
            studentId: nextUser.studentId,
            email: nextUser.email,
            warningCard: nextUser.warningCard,
        } : null;

        // Pick fresh words for next student
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

        await session.save();

        return NextResponse.json({
            success: true,
            isFinished: false,
            action,
            nextStudent,
            nextWords: pickedWords,
            session: {
                _id: session._id,
                status: session.status,
                participants: session.participants,
                studentOrder: session.studentOrder,
                currentStudentIndex: session.currentStudentIndex,
                totalStudents: session.studentOrder.length,
            },
        });

    } catch (error: any) {
        console.error('Skip turn error:', error);
        return NextResponse.json({ message: error.message || 'Xatolik yuz berdi' }, { status: 500 });
    }
}
