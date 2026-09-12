import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import VocabGameSession from '@/models/VocabGameSession';
import GroupMember from '@/models/GroupMember';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

type Params = Promise<{ id: string }>;

/**
 * POST /api/teacher/vocab-game/session/[id]/add-student
 * Dynamically adds an eligible group student to an active session without resetting current progress.
 * Body: { studentId: string }
 */
export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const { id: sessionId } = await params;
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
            return NextResponse.json({ message: 'Noto\'g\'ri sessiya ID' }, { status: 400 });
        }

        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { studentId } = await req.json();
        if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
            return NextResponse.json({ message: 'studentId talab qilinadi' }, { status: 400 });
        }

        await dbConnect();

        const session = await VocabGameSession.findById(sessionId);
        if (!session) {
            return NextResponse.json({ message: 'Sessiya topilmadi' }, { status: 404 });
        }

        if (teacher.role !== 'admin' && session.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Ruxsat berilmagan sessiya' }, { status: 403 });
        }

        if (session.status !== 'ACTIVE') {
            return NextResponse.json({ message: 'Sessiya faol emas (yakunlangan yoki to\'xtatilgan)' }, { status: 400 });
        }

        // Verify student belongs to this group
        const groupMembership = await GroupMember.findOne({
            groupId: session.groupId,
            studentId: new mongoose.Types.ObjectId(studentId)
        });

        if (!groupMembership) {
            return NextResponse.json({ message: 'O\'quvchi ushbu guruhga tegishli emas' }, { status: 400 });
        }

        // Check if student is already in session
        const alreadyParticipant = (session.participants || []).some(
            (p: any) => p.studentId.toString() === studentId
        );
        const inOrder = (session.studentOrder || []).some(
            (sId: any) => sId.toString() === studentId
        );

        if (alreadyParticipant || inOrder) {
            return NextResponse.json({ message: 'O\'quvchi allaqachon sessiyaga qo\'shilgan' }, { status: 409 });
        }

        const studentUser = await User.findById(studentId).select('name studentId email warningCard');
        if (!studentUser) {
            return NextResponse.json({ message: 'O\'quvchi foydalanuvchisi topilmadi' }, { status: 404 });
        }

        const newParticipant = {
            studentId: studentUser._id,
            customStudentId: studentUser.studentId || '',
            studentNameSnapshot: studentUser.name || 'Noma\'lum',
            joinedAt: new Date(),
            isLate: true,
            status: 'present',
            currentQuestionIndex: 0,
            questionsAsked: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            accuracy: 0,
        };

        session.participants.push(newParticipant);
        session.studentOrder.push(studentUser._id);
        await session.save();

        return NextResponse.json({
            success: true,
            message: `${studentUser.name} muvaffaqiyatli qo'shildi`,
            participant: newParticipant,
            session: {
                _id: session._id,
                status: session.status,
                participants: session.participants,
                studentOrder: session.studentOrder,
                currentStudentIndex: session.currentStudentIndex,
                totalStudents: session.studentOrder.length,
            }
        }, { status: 200 });

    } catch (error: any) {
        console.error('Add late student error:', error);
        return NextResponse.json({ message: error.message || 'Error adding student' }, { status: 500 });
    }
}
