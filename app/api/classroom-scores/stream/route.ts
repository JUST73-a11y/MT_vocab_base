import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { scoreEmitter } from '@/lib/classroomScoreEngine';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    const user = await getServerSession();
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    if (!groupId) {
        return new NextResponse('groupId is required', { status: 400 });
    }

    await dbConnect();

    // Verify permission: teacher owns group OR student is in group
    if (user.role === 'teacher' || user.role === 'admin') {
        const group = await Group.findById(groupId);
        if (!group || (user.role !== 'admin' && group.teacherId.toString() !== user.id)) {
            return new NextResponse('Forbidden', { status: 403 });
        }
    } else {
        const isMember = await GroupMember.findOne({
            groupId: new mongoose.Types.ObjectId(groupId),
            studentId: new mongoose.Types.ObjectId(user.id)
        });
        if (!isMember) {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', groupId })}\n\n`));

            const listener = (data: any) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch (e) {}
            };

            const eventName = `group_${groupId}`;
            scoreEmitter.on(eventName, listener);

            const interval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': keep-alive\n\n'));
                } catch (e) {
                    clearInterval(interval);
                }
            }, 25000);

            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                scoreEmitter.off(eventName, listener);
                try {
                    controller.close();
                } catch (e) {}
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}