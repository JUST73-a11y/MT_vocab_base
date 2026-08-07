import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import TeacherMessage from '@/models/TeacherMessage';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function GET() {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        
        const messages = await TeacherMessage.find()
            .populate('senderId', 'name email')
            .populate('receiverId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(messages);
    } catch (e: any) {
        return NextResponse.json({ message: 'Error fetching admin messages', error: e.message }, { status: 500 });
    }
}
