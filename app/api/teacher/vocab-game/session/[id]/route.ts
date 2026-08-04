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

type Params = Promise<{ id: string }>;

/**
 * GET /api/teacher/vocab-game/session/[id]
 * Get a specific session with all results and student details.
 */
export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const session = await VocabGameSession.findById(id)
            .populate('groupId', 'name')
            .populate('unitId', 'title');

        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // Get results
        const results = await VocabGameResult.find({ sessionId: id })
            .populate('studentId', 'name email warningCard')
            .sort({ rank: 1 });

        // For active sessions: who is the current student + words for them
        let currentStudent = null;
        let words: any[] = [];
        if (session.status === 'ACTIVE') {
            const currentStudentId = session.studentOrder[session.currentStudentIndex];
            if (currentStudentId) {
                currentStudent = await User.findById(currentStudentId).select('name email warningCard');
                const allWords = await Word.find({ unitId: session.unitId }).select('englishWord uzbekTranslation phonetic');
                words = shuffle(allWords).slice(0, session.questionsPerStudent);
            }
        }

        return NextResponse.json({
            session,
            results,
            currentStudent,
            words,
            totalStudents: session.studentOrder.length,
            finishedCount: results.length,
        });
    } catch (error) {
        console.error('Get session error:', error);
        return NextResponse.json({ message: 'Error fetching session' }, { status: 500 });
    }
}

/**
 * PATCH /api/teacher/vocab-game/session/[id]
 * End the session or update notes.
 */
export async function PATCH(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const session = await VocabGameSession.findById(id);
        if (!session) return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { status, notes } = await req.json();
        if (status) session.status = status;
        if (notes !== undefined) session.notes = notes;
        if (status === 'ENDED') session.endedAt = new Date();
        await session.save();

        return NextResponse.json({ success: true, session });
    } catch (error) {
        return NextResponse.json({ message: 'Error updating session' }, { status: 500 });
    }
}
