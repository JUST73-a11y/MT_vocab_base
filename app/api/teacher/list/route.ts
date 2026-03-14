import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Find all teachers except the current user
        const teachers = await User.find({
            role: 'teacher',
            status: 'active',
            _id: { $ne: user.id }
        })
        .select('name email teacherCode')
        .sort({ name: 1 })
        .lean();

        return NextResponse.json(teachers);
    } catch (error) {
        console.error('[API GET TEACHER LIST] Error:', error);
        return NextResponse.json({ message: 'Error fetching teacher list' }, { status: 500 });
    }
}
