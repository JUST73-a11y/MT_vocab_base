import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import Wallet from '@/models/Wallet';
import { getServerSession } from '@/lib/serverAuth';

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const teacher = await getServerSession();

        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Ruxsat yo\'q' }, { status: 401 });
        }

        await dbConnect();

        // 1. Verify group ownership
        const group = await Group.findById(id).lean();
        if (!group) {
            return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
        }

        if (teacher.role !== 'admin' && String(group.teacherId) !== teacher.id) {
            return NextResponse.json({ message: 'Guruh sizniki emas' }, { status: 403 });
        }

        // 2. Fetch all members of this group
        const groupMembersDocs = await GroupMember.find({ groupId: id }).select('studentId').lean();

        if (!groupMembersDocs || groupMembersDocs.length === 0) {
            return NextResponse.json({ success: true, count: 0 }); // Nothing to reset
        }

        const memberIds = groupMembersDocs.map((m: any) => m.studentId);

        // 3. Reset balances to 0 for all these members
        const result = await Wallet.updateMany(
            { studentId: { $in: memberIds } },
            { $set: { balance: 0, updatedAt: new Date() } }
        );

        return NextResponse.json({ success: true, count: result.modifiedCount });
    } catch (error: any) {
        console.error('[GROUP_RESET]', error);
        return NextResponse.json({ message: 'Reytingni nollashda xatolik yuz berdi' }, { status: 500 });
    }
}
