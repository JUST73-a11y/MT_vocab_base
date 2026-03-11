import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import StudentMistakeWord from '@/models/StudentMistakeWord';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, mistakeId: string }> }
) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id: studentId, mistakeId } = await params;
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ message: 'Invalid student ID' }, { status: 400 });
        }
        if (!mistakeId || !mongoose.Types.ObjectId.isValid(mistakeId)) {
            return NextResponse.json({ message: 'Invalid mistake ID' }, { status: 400 });
        }

        await dbConnect();

        // Ensure the mistake actually belongs to the specified student
        const result = await StudentMistakeWord.findOneAndDelete({ 
            _id: new mongoose.Types.ObjectId(mistakeId), 
            studentId: new mongoose.Types.ObjectId(studentId) 
        });

        if (!result) {
            return NextResponse.json({ message: 'Mistake record not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({ ok: true, deletedId: mistakeId });
    } catch (error) {
        console.error('[TEACHER_STUDENT_MISTAKES_DELETE]', error);
        return NextResponse.json({ message: 'Error deleting mistake' }, { status: 500 });
    }
}
