import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import TeacherMessage from '@/models/TeacherMessage';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'sent';

        await dbConnect();
        
        if (type === 'sent') {
            const messages = await TeacherMessage.find({ senderId: user.id })
                .populate('receiverId', 'name email')
                .sort({ createdAt: -1 })
                .lean();
            return NextResponse.json(messages);
        }

        return NextResponse.json([]);
    } catch (e: any) {
        return NextResponse.json({ message: 'Error fetching messages', error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { receiverId, message } = await req.json();

        if (!receiverId || !message) {
            return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
        }

        await dbConnect();
        
        const newMessage = await TeacherMessage.create({
            senderId: user.id,
            receiverId,
            message
        });

        return NextResponse.json(newMessage, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error sending message', error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || user.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

        await dbConnect();
        
        // Ensure only sender can delete
        const result = await TeacherMessage.findOneAndDelete({ _id: id, senderId: user.id });
        if (!result) return NextResponse.json({ message: 'Not found or not authorized' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error deleting message', error: e.message }, { status: 500 });
    }
}
