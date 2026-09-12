import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import { getNextStudentId } from '@/models/Counter';
import { getServerSession } from '@/lib/serverAuth';
import bcrypt from 'bcryptjs';

/**
 * POST /api/teacher/students/create
 * Creates a loginless classroom student with permanent server-generated Student ID (M00001+).
 * Accepts: { firstName, lastName, groupId } or backward-compatible { name, email, groupId }
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { firstName, lastName, groupId, email, name } = body;

        let finalFirstName = (firstName || '').trim();
        let finalLastName = (lastName || '').trim();
        let fullName = '';

        if (finalFirstName || finalLastName) {
            fullName = [finalFirstName, finalLastName].filter(Boolean).join(' ').trim();
        } else if (name && typeof name === 'string') {
            fullName = name.trim();
            const parts = fullName.split(' ');
            finalFirstName = parts[0] || '';
            finalLastName = parts.slice(1).join(' ') || '';
        }

        if (!fullName) {
            return NextResponse.json({ message: 'Talaba ismi va familiyasi kiritilishi shart' }, { status: 400 });
        }

        if (!groupId) {
            return NextResponse.json({ message: 'Guruh tanlanishi shart' }, { status: 400 });
        }

        await dbConnect();

        // Verify the group exists and belongs to this teacher
        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json({ message: 'Guruh topilmadi' }, { status: 404 });
        }
        if (teacher.role !== 'admin' && group.teacherId.toString() !== teacher.id) {
            return NextResponse.json({ message: 'Ruxsat berilmagan guruh' }, { status: 403 });
        }

        // Generate permanent unique server-side Student ID (M00001, M00002, etc.)
        const permanentStudentId = await getNextStudentId();

        // Use supplied email or generate an internal synthetic email
        let studentEmail = email ? email.toLowerCase().trim() : `${permanentStudentId.toLowerCase()}@classroom.local`;

        // Check if custom email exists
        if (email) {
            const existingUser = await User.findOne({ email: studentEmail });
            if (existingUser) {
                return NextResponse.json({ message: 'Bu email allaqachon mavjud' }, { status: 409 });
            }
        }

        const dummyPassword = Math.random().toString(36).slice(2, 12);
        const hashedPassword = await bcrypt.hash(dummyPassword, 8);

        const isLoginless = body.isClassroomStudent !== undefined ? Boolean(body.isClassroomStudent) : !email;

        const newStudent = await User.create({
            name: fullName,
            firstName: finalFirstName,
            lastName: finalLastName,
            studentId: permanentStudentId,
            email: studentEmail,
            password: hashedPassword,
            visiblePassword: dummyPassword,
            role: 'student',
            isVerified: true,
            isClassroomStudent: isLoginless,
            teacherId: teacher.id,
            needsPasswordSetup: !isLoginless,
            warningCard: false,
        });

        // Add to group immediately
        await GroupMember.findOneAndUpdate(
            { groupId, studentId: newStudent._id },
            { groupId, studentId: newStudent._id, joinedAt: new Date() },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            student: {
                _id: newStudent._id,
                studentId: newStudent.studentId,
                name: newStudent.name,
                firstName: newStudent.firstName,
                lastName: newStudent.lastName,
                email: newStudent.email,
                isClassroomStudent: true,
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Create student error:', error);
        return NextResponse.json({ message: error.message || 'Error creating student' }, { status: 500 });
    }
}
