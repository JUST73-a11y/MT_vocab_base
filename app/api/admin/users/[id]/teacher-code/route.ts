import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import TeacherProfile from '@/models/TeacherProfile';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionUser = await getServerSession();
        if (!sessionUser || sessionUser.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { teacherCode } = await req.json();
        if (!teacherCode) {
            return NextResponse.json({ message: 'Teacher code required' }, { status: 400 });
        }

        const normalizedCode = teacherCode.trim().toUpperCase();
        if (normalizedCode.length < 3) {
            return NextResponse.json({ message: 'Kod juda qisqa' }, { status: 400 });
        }

        await dbConnect();
        const { id: targetUserId } = await params;

        // Verify user exists and is a teacher
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        if (targetUser.role !== 'teacher') {
            return NextResponse.json({ message: 'User is not a teacher' }, { status: 400 });
        }

        // Check uniqueness across TeacherProfile
        const existing = await TeacherProfile.findOne({
            teacherCode: normalizedCode,
            userId: { $ne: targetUserId }
        });
        if (existing) {
            return NextResponse.json({ message: 'Ushbu kod allaqachon band' }, { status: 409 });
        }

        // Update TeacherProfile
        await TeacherProfile.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(targetUserId) },
            { $set: { teacherCode: normalizedCode, status: 'active' } },
            { upsert: true, returnDocument: 'after' }
        );

        // Update User model for legacy/redundancy
        targetUser.teacherCode = normalizedCode;
        await targetUser.save();

        return NextResponse.json({
            message: 'O\'qituvchi kodi muvaffaqiyatli o\'zgartirildi',
            teacherCode: normalizedCode
        });

    } catch (error) {
        console.error('Error updating teacher code:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
