import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import StudentMistakeWord from '@/models/StudentMistakeWord';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: studentId } = await params;
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
        }

        await dbConnect();

        // Fetch mistakes and populate the word details
        const mistakes = await StudentMistakeWord.find({ studentId })
            .populate('wordId', 'englishWord uzbekTranslation phonetic')
            .sort({ lastWrongAt: -1 })
            .lean();

        return NextResponse.json({ mistakes });
    } catch (error) {
        console.error('[TEACHER_STUDENT_MISTAKES]', error);
        return NextResponse.json({ message: 'Error fetching mistakes' }, { status: 500 });
    }
}
