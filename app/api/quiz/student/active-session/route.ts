import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import GroupQuizSession from '@/models/GroupQuizSession';
import GroupMember from '@/models/GroupMember';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // 1. Find groups this student belongs to
        const groupMemberships = await GroupMember.find({ studentId: student.id }).select('groupId');
        const groupIds = groupMemberships.map(gm => gm.groupId);

        if (groupIds.length === 0) {
            return NextResponse.json({ session: null });
        }

        // 2. Find an ACTIVE session for any of these groups
        // We sort by createdAt -1 to get the most recent one if multiple (though UI prevents multiple active)
        const session = await GroupQuizSession.findOne({
            groupId: { $in: groupIds },
            status: 'ACTIVE',
            $or: [
                { endsAt: { $gt: new Date() } },
                { endsAt: { $exists: false } }
            ]
        })
            .populate('groupId', 'name')
            .populate('teacherId', 'name')
            .sort({ createdAt: -1 })
            .lean() as any;

        if (!session) {
            return NextResponse.json({ session: null });
        }

        return NextResponse.json({
            session: {
                id: session._id.toString(),
                groupName: session.groupId?.name || 'Guruh',
                teacherName: session.teacherId?.name || "O'qituvchi",
                unitIds: session.unitIds,
                timeLimitSec: session.timeLimitSec,
                questionCount: session.questionCount,
                startsAt: session.startsAt,
                endsAt: session.endsAt,
            }
        });

    } catch (error) {
        console.error('Active session check error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
