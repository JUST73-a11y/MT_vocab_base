import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'teacher' && user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Faqat tasdiqlangan va o'qituvchiga ulangan talabalarni topish
        const query: any = { role: 'student', isVerified: true };
        if (user.role === 'teacher') {
            query.teacherId = {
                $in: [
                    user.id,
                    new mongoose.Types.ObjectId(user.id)
                ]
            };
        }

        const students = await User.find(query)
            .select('name email status lastLoginAt createdAt totalWordsSeen')
            .sort({ createdAt: -1 });

        return NextResponse.json(students);
    } catch (error) {
        console.error('[TEACHER STUDENTS GET] Error:', error);
        return NextResponse.json({ message: 'Error fetching students' }, { status: 500 });
    }
}
