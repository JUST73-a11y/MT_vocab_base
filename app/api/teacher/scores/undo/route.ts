import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import Group from '@/models/Group';
import { undoClassroomScoreEvent } from '@/lib/classroomScoreEngine';

export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { groupId, eventId } = body;

        if (!groupId) {
            return NextResponse.json({ message: 'groupId is required' }, { status: 400 });
        }

        await dbConnect();

        // Verify group ownership
        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }
        if (teacher.role !== 'admin' && group.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'You do not own this group' }, { status: 403 });
        }

        const result = await undoClassroomScoreEvent({
            teacherId: teacher.id,
            groupId,
            eventId
        });

        return NextResponse.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Undo score error:', error);
        return NextResponse.json({ message: error.message || 'Error reversing score event' }, { status: 500 });
    }
}