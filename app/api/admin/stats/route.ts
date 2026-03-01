import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const userAction = await getServerSession();
        if (!userAction || userAction.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await dbConnect();

        const [totalUsers, teachers, students, totalUnits] = await Promise.all([
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ role: 'teacher', isVerified: true }),
            User.countDocuments({ role: 'student', isVerified: true }),
            Unit.countDocuments(),
        ]);

        // Get recent verified users
        const recentUsers = await User.find({ isVerified: true })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password');

        return NextResponse.json({
            stats: {
                totalUsers,
                teachers,
                students,
                totalUnits,
            },
            recentUsers,
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
    }
}
