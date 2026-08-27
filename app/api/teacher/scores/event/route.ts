import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import Group from '@/models/Group';
import { addClassroomScoreEvent } from '@/lib/classroomScoreEngine';

export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { studentId, groupId, points, category, reason } = body;

        if (!studentId || !groupId || typeof points !== 'number') {
            return NextResponse.json({ message: 'studentId, groupId and points required' }, { status: 400 });
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

        const newEvent = await addClassroomScoreEvent({
            studentId,
            groupId,
            teacherId: teacher.id,
            points,
            category: category || 'other',
            reason: reason || 'Darsdagi faollik',
            source: 'live_score'
        });

        return NextResponse.json({ success: true, event: newEvent });
    } catch (error: any) {
        console.error('Add score event error:', error);
        return NextResponse.json({ message: error.message || 'Error adding score event' }, { status: 500 });
    }
}