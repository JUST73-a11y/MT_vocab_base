import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import VocabGameResult from '@/models/VocabGameResult';
import GroupMember from '@/models/GroupMember';
import Word from '@/models/Word';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import Group from '@/models/Group';
import Unit from '@/models/Unit';
import mongoose from 'mongoose';

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Automatically keep only the latest 3 sessions for a specific group */
async function cleanupOldSessionsForGroup(groupId: string) {
    try {
        const sessions = await VocabGameSession.find({ groupId })
            .sort({ createdAt: -1 })
            .select('_id');

        if (sessions.length > 3) {
            const oldSessions = sessions.slice(3);
            const oldSessionIds = oldSessions.map(s => s._id);

            // Delete corresponding results
            await VocabGameResult.deleteMany({ sessionId: { $in: oldSessionIds } });
            // Delete old session documents
            await VocabGameSession.deleteMany({ _id: { $in: oldSessionIds } });
        }
    } catch (err) {
        console.error('Error cleaning old group sessions:', err);
    }
}

/**
 * POST /api/teacher/vocab-game/session
 * Start a new vocab game session.
 * Body: { groupId, unitId, questionsPerStudent }
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const groupId = body.groupId;
        let unitIds: string[] = [];
        if (Array.isArray(body.unitIds) && body.unitIds.length > 0) {
            unitIds = body.unitIds;
        } else if (body.unitId) {
            unitIds = Array.isArray(body.unitId) ? body.unitId : [body.unitId];
        }

        const questionsPerStudent = body.questionsPerStudent;
        const timerDuration = body.timerDuration || 10;
        const noSave = !!body.noSave;

        if (!groupId || unitIds.length === 0) {
            return NextResponse.json({ message: 'groupId and at least one unit (unitIds) required' }, { status: 400 });
        }

        await dbConnect();

        // Get all students in the group
        const members = await GroupMember.find({ groupId }).select('studentId');
        if (!members.length) {
            return NextResponse.json({ message: 'No students in this group' }, { status: 400 });
        }

        const absentStudentIds = Array.isArray(body.absentStudentIds) ? body.absentStudentIds : [];
        const presentStudentIds = members
            .map(m => m.studentId.toString())
            .filter(id => !absentStudentIds.includes(id));

        if (presentStudentIds.length === 0) {
            return NextResponse.json({ message: 'Tanlangan guruhda barcha o\'quvchilar yo\'q deb belgilangan' }, { status: 400 });
        }

        // Check that selected units have words
        const wordCount = await Word.countDocuments({ unitId: { $in: unitIds } });
        if (wordCount === 0) {
            return NextResponse.json({ message: 'Tanlangan bo\'limlarda so\'zlar mavjud emas' }, { status: 400 });
        }

        const shuffledStudents = shuffle(presentStudentIds);

        const sessionObjIds = unitIds.map((id: string) => new mongoose.Types.ObjectId(id));
        const allAvailableWords = await Word.find({ unitId: { $in: sessionObjIds } }).select('englishWord uzbekTranslation phonetic').lean();
        const shuffledWordsPool = shuffle(allAvailableWords);
        const countNeeded = questionsPerStudent || 6;
        const sessionWords = shuffledWordsPool.slice(0, countNeeded);
        const initialUsedIds = sessionWords.map((w: any) => w._id);

        const session = await VocabGameSession.create({
            teacherId: teacher.id,
            groupId,
            unitId: unitIds[0],
            unitIds: unitIds,
            questionsPerStudent: questionsPerStudent || 6,
            timerDuration,
            noSave,
            status: 'ACTIVE',
            studentOrder: shuffledStudents,
            currentStudentIndex: 0,
            usedWordIds: initialUsedIds,
        });

        // Keep only the latest 3 saved sessions for this group (run in background)
        if (!noSave) {
            cleanupOldSessionsForGroup(groupId).catch(e => console.error(e));
        }

        // Pre-fetch the first student's info
        const firstStudentId = shuffledStudents[0];
        const firstStudent = await User.findById(firstStudentId).select('name email warningCard');

        return NextResponse.json({
            session: {
                _id: session._id,
                groupId,
                unitId: unitIds[0],
                unitIds: unitIds,
                questionsPerStudent: session.questionsPerStudent,
                timerDuration: session.timerDuration,
                noSave: session.noSave,
                status: session.status,
                studentOrder: shuffledStudents,
                currentStudentIndex: 0,
                totalStudents: shuffledStudents.length,
            },
            currentStudent: firstStudent,
            words: sessionWords,
        }, { status: 201 });

    } catch (error: any) {
        console.error('Start vocab session error:', error);
        return NextResponse.json({ message: 'Error starting session' }, { status: 500 });
    }
}

/**
 * GET /api/teacher/vocab-game/session
 * Get session history for this teacher (all past sessions).
 */
export async function GET(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get('groupId');

        await dbConnect();

        const query: any = teacher.role === 'admin' ? { noSave: { $ne: true } } : { teacherId: teacher.id, noSave: { $ne: true } };
        if (groupId) query.groupId = groupId;

        const sessions = await VocabGameSession.find(query)
            .populate('groupId', 'name')
            .populate('unitId', 'title')
            .sort({ createdAt: -1 })
            .limit(50);

        return NextResponse.json(sessions);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching sessions' }, { status: 500 });
    }
}
