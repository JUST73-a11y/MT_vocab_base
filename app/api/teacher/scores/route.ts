import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import User from '@/models/User';
import ClassroomScoreEvent from '@/models/ClassroomScoreEvent';
import { getDateBoundaries } from '@/lib/classroomScoreEngine';
import mongoose from 'mongoose';

export async function GET(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // 1. Get teacher groups
        const groupQuery = teacher.role === 'admin' ? {} : { teacherId: teacher.id };
        const groups = await Group.find(groupQuery).sort({ name: 1 });

        if (!groups.length) {
            return NextResponse.json({ groups: [], selectedGroup: null, students: [], events: [] });
        }

        const { searchParams } = new URL(req.url);
        const reqGroupId = searchParams.get('groupId');
        const selectedGroup = groups.find(g => g._id.toString() === reqGroupId) || groups[0];
        const selectedGroupId = selectedGroup._id.toString();

        // 2. Get students in selected group in explicit roster order
        const groupMembers = await GroupMember.find({
            groupId: new mongoose.Types.ObjectId(selectedGroupId)
        });
        const studentIds = groupMembers.map(m => m.studentId);

        const fetchedStudents = await User.find({
            _id: { $in: studentIds },
            role: 'student'
        }).select('name email status');

        // Order students exactly according to GroupMember roster order
        const studentMap = new Map(fetchedStudents.map(s => [s._id.toString(), s]));
        const students = studentIds
            .map(id => studentMap.get(id.toString()))
            .filter((s): s is NonNullable<typeof s> => s !== undefined);

        // 3. Get all score events for selected group
        const events = await ClassroomScoreEvent.find({
            groupId: new mongoose.Types.ObjectId(selectedGroupId)
        }).sort({ createdAt: -1 }).limit(500).lean();

        const { startOfToday, startOfWeek, startOfMonth } = getDateBoundaries();

        // 4. Calculate metrics per student
        const studentMetrics: Record<string, any> = {};
        students.forEach(s => {
            studentMetrics[s._id.toString()] = {
                todayXP: 0,
                weekXP: 0,
                monthXP: 0,
                lifetimeXP: 0,
                categories: {
                    homework: 0,
                    vocab: 0,
                    grammar: 0,
                    participation: 0,
                    behavior: 0,
                    game: 0,
                    quiz: 0,
                    bonus: 0,
                    penalty: 0,
                    other: 0
                },
                checks: {
                    homework: false,
                    vocab: false,
                    grammar: false,
                    participation: false,
                    behavior: false
                }
            };
        });

        // Compute XP from events
        events.forEach((ev: any) => {
            const sId = ev.studentId.toString();
            if (!studentMetrics[sId]) return;

            const evDate = new Date(ev.createdAt);
            const pts = Number(ev.points) || 0;
            const cat = ev.category || 'other';

            studentMetrics[sId].lifetimeXP += pts;

            if (evDate >= startOfMonth) {
                studentMetrics[sId].monthXP += pts;
            }
            if (evDate >= startOfWeek) {
                studentMetrics[sId].weekXP += pts;
            }
            if (evDate >= startOfToday) {
                studentMetrics[sId].todayXP += pts;
            }

            // Always update categories XP Breakdown for the student
            if (cat in studentMetrics[sId].categories) {
                studentMetrics[sId].categories[cat] += pts;
            } else {
                studentMetrics[sId].categories.other += pts;
            }

            if (evDate >= startOfToday && cat in studentMetrics[sId].checks) {
                studentMetrics[sId].checks[cat] = true;
            }
        });

        const studentsWithMetrics = students.map(s => ({
            id: s._id.toString(),
            name: s.name,
            email: s.email,
            ...studentMetrics[s._id.toString()]
        }));

        return NextResponse.json({
            groups: groups.map(g => ({ id: g._id.toString(), name: g.name, level: g.level })),
            selectedGroup: { id: selectedGroup._id.toString(), name: selectedGroup.name, level: selectedGroup.level },
            students: studentsWithMetrics,
            recentEvents: events.slice(0, 30).map((ev: any) => ({
                id: ev._id.toString(),
                studentId: ev.studentId.toString(),
                points: ev.points,
                category: ev.category,
                reason: ev.reason,
                isReversal: ev.isReversal,
                reversalOf: ev.reversalOf ? ev.reversalOf.toString() : null,
                createdAt: ev.createdAt
            }))
        });
    } catch (error) {
        console.error('Teacher scores GET error:', error);
        return NextResponse.json({ message: 'Error fetching scores' }, { status: 500 });
    }
}