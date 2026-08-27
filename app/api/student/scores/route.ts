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

export async function GET() {
    try {
        const sessionUser = await getServerSession();
        if (!sessionUser || sessionUser.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Fetch full user document to ensure authenticated name
        const studentDoc = await User.findById(sessionUser.id).select('name email');
        const studentName = studentDoc?.name || sessionUser.name || 'O‘quvchi';

        // Find student group membership
        const membership = await GroupMember.findOne({
            studentId: new mongoose.Types.ObjectId(sessionUser.id)
        });

        if (!membership) {
            return NextResponse.json({ hasGroup: false, message: 'No group found for student' });
        }

        const groupId = membership.groupId;
        const group = await Group.findById(groupId).populate('teacherId', 'name');

        if (!group) {
            return NextResponse.json({ hasGroup: false, message: 'Group not found' });
        }

        // Get all members of this group
        const groupMembers = await GroupMember.find({ groupId });
        const memberUserIds = groupMembers.map(m => m.studentId);

        const allStudents = await User.find({
            _id: { $in: memberUserIds },
            role: 'student'
        }).select('name email');

        // Get classroom score events for this group
        const events = await ClassroomScoreEvent.find({ groupId }).sort({ createdAt: -1 }).limit(500).lean();

        const { startOfToday, startOfWeek, startOfMonth } = getDateBoundaries();

        // Metrics dictionary
        const metrics: Record<string, { today: number; week: number; month: number; lifetime: number; categories: Record<string, number> }> = {};
        allStudents.forEach(s => {
            metrics[s._id.toString()] = {
                today: 0,
                week: 0,
                month: 0,
                lifetime: 0,
                categories: {
                    homework: 0,
                    vocab: 0,
                    grammar: 0,
                    participation: 0,
                    behavior: 0,
                    quiz: 0,
                    game: 0,
                    bonus: 0,
                    penalty: 0,
                    other: 0
                }
            };
        });

        events.forEach((ev: any) => {
            const sId = ev.studentId.toString();
            if (!metrics[sId]) return;

            const evDate = new Date(ev.createdAt);
            const pts = Number(ev.points) || 0;
            const cat = ev.category || 'other';

            metrics[sId].lifetime += pts;

            if (evDate >= startOfMonth) {
                metrics[sId].month += pts;
            }
            if (evDate >= startOfWeek) {
                metrics[sId].week += pts;
            }
            if (evDate >= startOfToday) {
                metrics[sId].today += pts;
            }

            if (metrics[sId].categories[cat] !== undefined) {
                metrics[sId].categories[cat] += pts;
            } else {
                metrics[sId].categories.other += pts;
            }
        });

        // Group Leaderboard sorted by lifetime & week XP
        const leaderboard = allStudents.map(s => ({
            id: s._id.toString(),
            name: s.name,
            isCurrentStudent: s._id.toString() === sessionUser.id,
            todayXP: metrics[s._id.toString()]?.today || 0,
            weekXP: metrics[s._id.toString()]?.week || 0,
            monthXP: metrics[s._id.toString()]?.month || 0,
            lifetimeXP: metrics[s._id.toString()]?.lifetime || 0,
            categories: metrics[s._id.toString()]?.categories || {}
        })).sort((a, b) => b.lifetimeXP - a.lifetimeXP || b.weekXP - a.weekXP);

        // Find current student rank
        const studentIndex = leaderboard.findIndex(s => s.isCurrentStudent);
        const studentRank = studentIndex >= 0 ? studentIndex + 1 : 1;

        const myMetrics = metrics[sessionUser.id] || {
            today: 0,
            week: 0,
            month: 0,
            lifetime: 0,
            categories: {
                homework: 0, vocab: 0, grammar: 0, participation: 0,
                behavior: 0, quiz: 0, game: 0, bonus: 0, penalty: 0, other: 0
            }
        };

        // Logged-in student's personal events history (up to 200 past events)
        const myEvents = events
            .filter((ev: any) => ev.studentId.toString() === sessionUser.id)
            .slice(0, 200)
            .map((ev: any) => ({
                id: ev._id.toString(),
                points: ev.points,
                category: ev.category || 'other',
                reason: ev.reason || '',
                isReversal: !!ev.isReversal,
                createdAt: ev.createdAt
            }));

        const recentEvents = myEvents.slice(0, 20);

        return NextResponse.json({
            hasGroup: true,
            studentName,
            group: {
                id: group._id.toString(),
                name: group.name,
                level: group.level,
                teacherName: (group.teacherId as any)?.name || 'O‘qituvchi',
                totalMembers: allStudents.length
            },
            studentScore: {
                rank: studentRank,
                totalStudents: allStudents.length,
                todayXP: myMetrics.today,
                weekXP: myMetrics.week,
                monthXP: myMetrics.month,
                lifetimeXP: myMetrics.lifetime,
                categories: myMetrics.categories
            },
            leaderboard,
            myEvents,
            recentEvents
        });
    } catch (error) {
        console.error('Student scores GET error:', error);
        return NextResponse.json({ message: 'Error fetching scores' }, { status: 500 });
    }
}