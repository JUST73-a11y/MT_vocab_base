import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import StudentMistakeWord from '@/models/StudentMistakeWord';
import Word from '@/models/Word';
import Unit from '@/models/Unit';
import User from '@/models/User';
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

        // Prevent Next.js from tree-shaking unused Mongoose models
        // needed for .populate() in serverless environments
        Word.init();
        Unit.init();
        User.init();

        // Fetch mistakes and populate the word details
        const mistakes = await StudentMistakeWord.find({ studentId })
            .populate('wordId', 'englishWord uzbekTranslation phonetic')
            .sort({ lastWrongAt: -1 })
            .lean();

        return NextResponse.json({ mistakes });
    } catch (error: any) {
        
        return NextResponse.json({ message: error.message || 'Error fetching mistakes' }, { status: 500 });
    }
}
