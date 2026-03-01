import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import GroupUnitAccess from '@/models/GroupUnitAccess';
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

        const memberCount = await GroupMember.countDocuments({ groupId: id });
        const unitCount = await GroupUnitAccess.countDocuments({ groupId: id });

        // Calculate active students (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const memberDocs = await GroupMember.find({ groupId: id }).select('studentId');
        const studentIds = memberDocs.map(m => m.studentId);

        const students = await User.find(
            { _id: { $in: studentIds } },
            'name email lastLoginAt totalWordsSeen'
        ).lean();

        const activeStudentsCount = students.filter(s => {
            return s.lastLoginAt && new Date(s.lastLoginAt) >= sevenDaysAgo;
        }).length;

        const mostActiveList = [...students]
            .filter(s => s.lastLoginAt)
            .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
            .slice(0, 3);

        const mostWordsList = [...students]
            .sort((a, b) => (b.totalWordsSeen || 0) - (a.totalWordsSeen || 0))
            .slice(0, 3);

        const stats = {
            membersCount: memberCount,
            unitsAssignedCount: unitCount,
            activeStudentsCount: activeStudentsCount,
            leaderboards: {
                mostActive: mostActiveList,
                mostWords: mostWordsList
            }
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('[GROUP STATS GET] Error:', error);
        return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
    }
}
