import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import GroupUnitAccess from '@/models/GroupUnitAccess';
import { getServerSession } from '@/lib/serverAuth';

type Params = Promise<{ id: string }>;

export async function DELETE(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const group = await Group.findById(id);

        if (!group) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }

        // Only owner or admin can delete
        if (teacher.role !== 'admin' && group.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // Cascade delete related data
        await Promise.all([
            GroupMember.deleteMany({ groupId: id }),
            GroupUnitAccess.deleteMany({ groupId: id }),
            Group.findByIdAndDelete(id),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting group' }, { status: 500 });
    }
}
