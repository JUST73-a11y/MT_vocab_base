import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import GroupMember from '@/models/GroupMember';
import Word from '@/models/Word';
import User from '@/models/User';
import Group from '@/models/Group';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

/** Fisher-Yates shuffle for word pool */
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * POST /api/teacher/vocab-game/session
 * Start a new live classroom vocab game session.
 * Preserves roster order and initializes participants.
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

        const questionsPerStudent = body.questionsPerStudent || 6;
        const timerDuration = body.timerDuration || 10;
        const noSave = !!body.noSave;

        if (!groupId || unitIds.length === 0) {
            return NextResponse.json({ message: 'groupId va kamida bitta bo\'lim (unitIds) talab qilinadi' }, { status: 400 });
        }

        await dbConnect();

        // Verify group belongs to teacher
        const group = await Group.findById(groupId);
        if (!group) return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
        if (teacher.role !== 'admin' && group.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Ruxsat berilmagan guruh' }, { status: 403 });
        }

        // Get all group members and sort in natural roster/alphabetical order
        const members = await GroupMember.find({ groupId }).populate({
            path: 'studentId',
            select: 'name studentId email warningCard'
        });

        if (!members.length) {
            return NextResponse.json({ message: 'Bu guruhda o\'quvchilar yo\'q' }, { status: 400 });
        }

        const absentStudentIds: string[] = Array.isArray(body.absentStudentIds) ? body.absentStudentIds : [];
        
        // Filter valid students and preserve fixed roster order
        const validMembers = members
            .filter((m: any) => m.studentId)
            .sort((a: any, b: any) => (a.studentId.name || '').localeCompare(b.studentId.name || ''));

        const presentMembers = validMembers.filter((m: any) => !absentStudentIds.includes(m.studentId._id.toString()));

        if (presentMembers.length === 0) {
            return NextResponse.json({ message: 'Tanlangan guruhda barcha o\'quvchilar yo\'q deb belgilangan' }, { status: 400 });
        }

        const presentStudentIds = presentMembers.map((m: any) => m.studentId._id);

        // Check that selected units have words
        const sessionObjIds = unitIds.map((id: string) => new mongoose.Types.ObjectId(id));
        const allAvailableWords = await Word.find({ unitId: { $in: sessionObjIds } })
            .select('englishWord uzbekTranslation phonetic emoji')
            .lean();

        if (allAvailableWords.length === 0) {
            return NextResponse.json({ message: 'Tanlangan bo\'limlarda so\'zlar mavjud emas' }, { status: 400 });
        }

        const shuffledWordsPool = shuffle(allAvailableWords);
        const sessionWords = shuffledWordsPool.slice(0, questionsPerStudent);
        const initialUsedIds = sessionWords.map((w: any) => w._id);

        // Build rich participant structures
        const participants = presentMembers.map((m: any) => ({
            studentId: m.studentId._id,
            customStudentId: m.studentId.studentId || '',
            studentNameSnapshot: m.studentId.name || 'Noma\'lum',
            joinedAt: new Date(),
            isLate: false,
            status: 'present',
            currentQuestionIndex: 0,
            questionsAsked: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            accuracy: 0,
        }));

        const session = await VocabGameSession.create({
            teacherId: teacher.id,
            groupId,
            unitId: unitIds[0],
            unitIds: unitIds,
            questionsPerStudent,
            timerDuration,
            noSave,
            status: 'ACTIVE',
            participants,
            studentOrder: presentStudentIds,
            currentStudentIndex: 0,
            usedWordIds: initialUsedIds,
        });

        // First student info
        const firstStudentDoc = presentMembers[0].studentId;

        return NextResponse.json({
            session: {
                _id: session._id,
                groupId,
                groupName: group.name,
                unitId: unitIds[0],
                unitIds: unitIds,
                questionsPerStudent: session.questionsPerStudent,
                timerDuration: session.timerDuration,
                noSave: session.noSave,
                status: session.status,
                participants: session.participants,
                studentOrder: session.studentOrder,
                currentStudentIndex: 0,
                totalStudents: presentStudentIds.length,
            },
            currentStudent: {
                _id: firstStudentDoc._id,
                name: firstStudentDoc.name,
                studentId: firstStudentDoc.studentId,
                email: firstStudentDoc.email,
                warningCard: firstStudentDoc.warningCard,
            },
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

        const query: any = teacher.role === 'admin' ? {} : { teacherId: teacher.id };
        if (groupId) query.groupId = groupId;

        const sessions = await VocabGameSession.find(query)
            .populate('groupId', 'name')
            .populate('unitId', 'title')
            .populate({ path: 'unitIds', select: 'title' })
            .sort({ createdAt: -1 })
            .limit(100);

        return NextResponse.json(sessions);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching sessions' }, { status: 500 });
    }
}
