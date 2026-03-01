import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import StudentProfile from '@/models/StudentProfile';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';
import { createApiError } from '@/lib/apiError';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionUser = await getServerSession();
        if (!sessionUser || sessionUser.role !== 'admin') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        const { teacherId } = await req.json();

        await dbConnect();
        const { id: studentId } = await params;

        // Verify student exists
        const student = await User.findOne({ _id: studentId, role: 'student' });
        if (!student) {
            return createApiError('USER_NOT_FOUND', 'Student not found', 404);
        }

        // Verify teacher exists (if provided)
        if (teacherId) {
            const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
            if (!teacher) {
                return createApiError('TEACHER_NOT_FOUND', 'Teacher not found', 404);
            }
        }

        // Update StudentProfile
        await StudentProfile.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(studentId) },
            {
                $set: {
                    teacherId: teacherId ? new mongoose.Types.ObjectId(teacherId) : null,
                    joinedAt: teacherId ? new Date() : null
                }
            },
            { upsert: true, returnDocument: 'after' }
        );

        // Update User model for easy access
        student.teacherId = teacherId || null;
        await student.save();

        return NextResponse.json({
            message: teacherId ? `Student assigned to teacher` : `Student unassigned from teacher`
        });

    } catch (error) {
        console.error('Error assigning teacher:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
