import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import ShopItem from '@/models/ShopItem';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();

    const student = await User.findById(session.id).lean() as any;
    if (!student?.teacherId) {
        return NextResponse.json({ items: [] });
    }

    const teacherId = student.teacherId;

    // Fetch all active items belonging to student's teacher
    const allItems = await ShopItem.find({ teacherId, isActive: true }).sort({ createdAt: -1 }).lean();

    // Get student's group memberships for GROUP visibility filter
    const memberships = await GroupMember.find({
        userId: new mongoose.Types.ObjectId(session.id),
    }).lean() as any[];
    const myGroupIds = memberships.map((m: any) => m.groupId.toString());

    // Filter by visibility
    const visible = allItems.filter((item: any) => {
        if (item.visibilityType === 'ALL') return true;
        if (item.visibilityType === 'STUDENT') {
            return item.studentIds.some((id: any) => id.toString() === session.id);
        }
        if (item.visibilityType === 'GROUP') {
            return item.groupIds.some((gid: any) => myGroupIds.includes(gid.toString()));
        }
        return false;
    });

    return NextResponse.json({ items: visible });
}
