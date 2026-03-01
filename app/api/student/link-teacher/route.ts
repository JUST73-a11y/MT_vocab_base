import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import StudentProfile from '@/models/StudentProfile';
import TeacherProfile from '@/models/TeacherProfile';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';
import mongoose from 'mongoose';

export async function POST(req: Request) {
    try {
        const sessionUser = await getServerSession();
        if (!sessionUser || sessionUser.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { teacherCode } = await req.json();
        if (!teacherCode) {
            return createApiError('BAD_REQUEST', 'Teacher code required', 400);
        }

        await dbConnect();
        const studentId = sessionUser.id;
        const normalizedCode = teacherCode.trim().toUpperCase();

        // Find teacher by code in TeacherProfile first
        let tProfiles = await TeacherProfile.find({
            teacherCode: normalizedCode,
            status: 'active'
        }).sort({ updatedAt: -1, createdAt: -1 });

        let tProfile = tProfiles.length > 0 ? tProfiles[0] : null;

        let teacherId = null;

        if (tProfile) {
            teacherId = tProfile.userId;
        } else {
            // Fallback: check User model directly
            const tUser = await User.findOne({
                teacherCode: normalizedCode,
                role: 'teacher',
                status: 'active'
            });
            if (tUser) {
                teacherId = tUser._id;
            } else {
                return createApiError('TEACHER_NOT_FOUND', 'O\'qituvchi kodi noto\'g\'ri yozilgan yoki faol emas', 404);
            }
        }

        // Update StudentProfile
        await StudentProfile.findOneAndUpdate(
            { userId: studentId },
            {
                userId: studentId,
                teacherId: teacherId,
                joinedAt: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );

        // Update User model for easy access/legacy
        await User.findByIdAndUpdate(studentId, { teacherId: teacherId ? new mongoose.Types.ObjectId(teacherId.toString()) : null });

        return NextResponse.json({
            message: 'O\'qituvchiga muvaffaqiyatli ulandingiz!',
            teacherId
        });

    } catch (error) {
        console.error('Error linking teacher:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
