import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import { getServerSession } from '@/lib/serverAuth';
import bcrypt from 'bcryptjs';

/**
 * POST /api/teacher/students/create
 * Teacher creates a new student account with email + name + groupId.
 * The student will have needsPasswordSetup=true and must set their password on first login.
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name, email, groupId } = await req.json();
        if (!name || !email) {
            return NextResponse.json({ message: 'Name and email are required' }, { status: 400 });
        }

        await dbConnect();

        // Verify the group belongs to this teacher
        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group) return NextResponse.json({ message: 'Group not found' }, { status: 404 });
            if (teacher.role !== 'admin' && group.teacherId.toString() !== teacher.id) {
                return NextResponse.json({ message: 'Forbidden — group does not belong to you' }, { status: 403 });
            }
        }

        // Check if email already exists
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return NextResponse.json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' }, { status: 409 });
        }

        // Create a temporary password (will be changed on first login)
        const tempPassword = Math.random().toString(36).slice(2, 10);
        const hashed = await bcrypt.hash(tempPassword, 10);

        const newStudent = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashed,
            visiblePassword: tempPassword,
            role: 'student',
            isVerified: true,
            teacherId: teacher.id,
            needsPasswordSetup: true, // force password setup on first login
            warningCard: false,
        });

        // Add to group if provided
        if (groupId) {
            await GroupMember.findOneAndUpdate(
                { groupId, studentId: newStudent._id },
                { groupId, studentId: newStudent._id, joinedAt: new Date() },
                { upsert: true, new: true }
            );
        }

        return NextResponse.json({
            success: true,
            student: {
                _id: newStudent._id,
                name: newStudent.name,
                email: newStudent.email,
                needsPasswordSetup: true,
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Create student error:', error);
        return NextResponse.json({ message: 'Error creating student' }, { status: 500 });
    }
}
