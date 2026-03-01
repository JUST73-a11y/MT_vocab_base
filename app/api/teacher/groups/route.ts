import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import GroupUnitAccess from '@/models/GroupUnitAccess';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const query = teacher.role === 'admin' ? {} : { teacherId: teacher.id };
        const groups = await Group.find(query).populate('teacherId', 'name email').sort({ createdAt: -1 });

        // Enrich with counts
        const enrichedGroups = await Promise.all(groups.map(async (group) => {
            const memberCount = await GroupMember.countDocuments({ groupId: group._id });
            const unitCount = await GroupUnitAccess.countDocuments({ groupId: group._id });
            return {
                ...group.toObject(),
                id: group._id.toString(),
                memberCount,
                unitCount
            };
        }));

        return NextResponse.json(enrichedGroups);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching groups' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await req.json();
        if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

        await dbConnect();
        const newGroup = await Group.create({
            teacherId: teacher.id,
            name
        });

        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Error creating group' }, { status: 500 });
    }
}
