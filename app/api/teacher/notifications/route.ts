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

        const messages = await (await import('@/models/TeacherMessage')).default.find({ receiverId: user.id })
            .populate('senderId', 'name')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const mergedMessages = messages.map((m: any) => ({
            _id: m._id,
            type: 'MESSAGE',
            title: `Xabar: ${m.senderId?.name || 'Noma\'lum'}`,
            message: m.message,
            isRead: m.isRead,
            createdAt: m.createdAt,
            studentName: m.senderId?.name || 'Noma\'lum', // mapping for UI compatibility
            unitTitle: 'Shaxsiy xabar' // mapping for UI compatibility
        }));

        const merged = [...notifications, ...mergedMessages]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20);

        return NextResponse.json(merged);
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

        await (await import('@/models/TeacherMessage')).default.updateMany(
            { receiverId: user.id, isRead: false },
            { $set: { isRead: true } }
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error updating notifications', error: e.message }, { status: 500 });
    }
}
