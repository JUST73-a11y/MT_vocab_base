import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import TeacherProfile from '@/models/TeacherProfile';
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

        const body = await req.json().catch(() => ({}));
        const { role } = body;
        if (!['student', 'teacher', 'admin'].includes(role)) {
            return createApiError('BAD_REQUEST', 'Invalid role', 400);
        }

        await dbConnect();
        const { id: targetUserId } = await params;

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return createApiError('NOT_FOUND', 'User not found', 404);
        }

        // If promoting to teacher, handle TeacherProfile
        if (role === 'teacher' && targetUser.role !== 'teacher') {
            let teacherCode = body.teacherCode;

            if (teacherCode) {
                teacherCode = teacherCode.trim().toUpperCase();
                const existing = await TeacherProfile.findOne({ teacherCode });
                if (existing) {
                    return createApiError('CONFLICT', 'This code is already used', 409);
                }
                const existingUserCode = await User.findOne({ teacherCode });
                if (existingUserCode) {
                    return createApiError('CONFLICT', 'This code is already used by a user', 409);
                }
            } else {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let unique = false;

                while (!unique) {
                    teacherCode = 'T-';
                    for (let i = 0; i < 6; i++) {
                        teacherCode += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    const existing = await TeacherProfile.findOne({ teacherCode });
                    if (!existing) {
                        const existingUserCode = await User.findOne({ teacherCode });
                        if (!existingUserCode) unique = true;
                    }
                }
            }

            await TeacherProfile.findOneAndUpdate(
                { userId: new mongoose.Types.ObjectId(targetUserId) },
                { $set: { teacherCode, status: 'active' } },
                { upsert: true, returnDocument: 'after' }
            );

            // Also update the User model if teacherCode is still there for legacy compatibility
            targetUser.teacherCode = teacherCode;
        }

        targetUser.role = role;
        await targetUser.save();

        return NextResponse.json({
            message: `User ${targetUser.email} role updated to ${role}`,
            teacherCode: role === 'teacher' ? targetUser.teacherCode : undefined
        });

    } catch (error: any) {
        console.error('Error updating role:', error);
        return createApiError('SERVER_ERROR', error.message || 'Server error', 500);
    }
}
