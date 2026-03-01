import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;

        const members = await GroupMember.find({ groupId: id }).populate({
            path: 'studentId',
            select: 'name email status lastLoginAt'
        });

        // Format for response
        const formattedMembers = members.map((m: any) => ({
            id: m.studentId._id,
            name: m.studentId.name,
            email: m.studentId.email,
            status: m.studentId.status,
            lastLoginAt: m.studentId.lastLoginAt,
            joinedAt: m.joinedAt
        }));

        return NextResponse.json(formattedMembers);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching members' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { studentIds } = await req.json(); // Array of student IDs to BE in the group
        if (!Array.isArray(studentIds)) {
            return NextResponse.json({ message: 'Invalid studentIds format' }, { status: 400 });
        }

        await dbConnect();
        const { id } = await params;

        // 1. Remove members not in the new list
        await GroupMember.deleteMany({
            groupId: id,
            studentId: { $nin: studentIds }
        });

        // 2. Add members that are not already in the group
        const existingMembers = await GroupMember.find({ groupId: id }).select('studentId');
        const existingIds = existingMembers.map(m => m.studentId.toString());

        const newIds = studentIds.filter((idVal: string) => !existingIds.includes(idVal));
        const newMembers = newIds.map(studentId => ({
            groupId: id,
            studentId
        }));

        if (newMembers.length > 0) {
            await GroupMember.insertMany(newMembers);
        }

        return NextResponse.json({ message: 'Members updated successfully' });
    } catch (error) {
        console.error('[GROUP MEMBERS POST] Error:', error);
        return NextResponse.json({ message: 'Error updating members' }, { status: 500 });
    }
}
