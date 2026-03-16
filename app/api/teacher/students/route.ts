import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');
        
        const user = await getServerSession();
        if (!user || user.role !== 'teacher' && user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Optional unitId filtering
        let studentIds: mongoose.Types.ObjectId[] | null = null;
        if (unitId) {
            const StudentUnitAccess = (await import('@/models/StudentUnitAccess')).default;
            const access = await StudentUnitAccess.find({ 
                unitId: new mongoose.Types.ObjectId(unitId) 
            }).select('studentId');
            studentIds = access.map(a => a.studentId);
        }

        // Faqat tasdiqlangan va o'qituvchiga ulangan talabalarni topish
        const query: any = { role: 'student', isVerified: true };
        
        if (studentIds) {
            query._id = { $in: studentIds };
        }

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
        
        return NextResponse.json({ message: 'Error fetching students' }, { status: 500 });
    }
}
