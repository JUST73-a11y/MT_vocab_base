import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import User from '@/models/User';

import TeacherProfile from '@/models/TeacherProfile';
import StudentProfile from '@/models/StudentProfile';

export async function GET(req: Request) {
    try {
        const token = (await cookies()).get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { message: 'Not authenticated' },
                { status: 401 }
            );
        }

        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || 'default-secret-key-change-me'
        );

        try {
            const { payload } = await jwtVerify(token, secret);

            await dbConnect();
            const user = await User.findById(payload.id).select('-password');

            if (!user) {
                return NextResponse.json(
                    { message: 'User not found' },
                    { status: 404 }
                );
            }

            let teacherCode = user.teacherCode;
            let teacherId = user.teacherId;

            if (user.role === 'teacher') {
                const profile = await TeacherProfile.findOne({ userId: user._id });
                if (profile) teacherCode = profile.teacherCode;
            } else if (user.role === 'student') {
                const profile = await StudentProfile.findOne({ userId: user._id });
                if (profile) teacherId = profile.teacherId;
            }

            return NextResponse.json({
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    totalWordsSeen: user.totalWordsSeen,
                    createdAt: user.createdAt,
                    teacherCode,
                    teacherId
                }
            });

        } catch (e) {
            return NextResponse.json(
                { message: 'Invalid token' },
                { status: 401 }
            );
        }

    } catch (error: any) {
        console.error('Session error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    // Logout
    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.delete('token');
    return response;
}
