import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import TeacherNotification from '@/models/TeacherNotification';
import { getServerSession } from '@/lib/serverAuth';

export async function GET() {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        
        const notifications = await TeacherNotification.find({ teacherId: user.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json(notifications);
    } catch (e: any) {
        return NextResponse.json({ message: 'Error fetching notifications', error: e.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        
        // Mark all as read
        await TeacherNotification.updateMany(
            { teacherId: user.id, isRead: false },
            { $set: { isRead: true } }
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error updating notifications', error: e.message }, { status: 500 });
    }
}
