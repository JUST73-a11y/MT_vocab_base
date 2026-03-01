import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import TeacherProfile from '@/models/TeacherProfile';
import StudentProfile from '@/models/StudentProfile';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

// GET — list all users (admin only)
export async function GET(req: Request) {
    try {
        const adminSession = await getServerSession();
        if (!adminSession || adminSession.role !== 'admin') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        await dbConnect();

        // Faqat tasdiqlangan foydalanuvchilarni olish
        const users = await User.find({ isVerified: true }).sort({ createdAt: -1 }).lean();

        // Fetch all profiles and wallets to merge data
        const [teacherProfiles, studentProfiles, wallets] = await Promise.all([
            TeacherProfile.find().lean(),
            StudentProfile.find().lean(),
            Wallet.find().lean()
        ]);

        const mergedUsers = users.map(u => {
            const userIdStr = String(u._id);
            const user = { ...u, id: userIdStr } as any;

            if (user.role === 'teacher') {
                const userProfiles = teacherProfiles.filter(p => String(p.userId) === userIdStr);
                const profile = userProfiles.sort((a, b) => {
                    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                    return timeB - timeA;
                })[0];

                if (profile) user.teacherCode = profile.teacherCode;
                else user.teacherCode = u.teacherCode;
            } else if (user.role === 'student') {
                const userProfiles = studentProfiles.filter(p => String(p.userId) === userIdStr);
                const profile = userProfiles.sort((a, b) => {
                    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                    return timeB - timeA;
                })[0];

                if (profile) user.teacherId = profile.teacherId ? String(profile.teacherId) : null;

                // Add wallet balance
                const wallet = wallets.find(w => String(w.studentId) === userIdStr);
                user.coinBalance = wallet?.balance || 0;
            }
            return user;
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[ADMIN_USERS_GET] Found ${users.length} users, ${wallets.length} wallets. Sample coinBalance: ${mergedUsers.find(u => u.role === 'student')?.coinBalance}`);
        }

        return NextResponse.json(mergedUsers);
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return createApiError('SERVER_ERROR', error.message || 'Error fetching users', 500);
    }
}

// POST — create a teacher account (admin only)
export async function POST(req: Request) {
    try {
        const userAction = await getServerSession();
        if (!userAction || userAction.role !== 'admin') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        await dbConnect();

        const body = await req.json();
        const { name, email, password, adminSecret } = body;

        if (!name || !email || !password || !adminSecret) {
            return createApiError('BAD_REQUEST', 'name, email, password and adminSecret are required', 400);
        }

        // Verify admin secret against environment variable
        if (adminSecret !== process.env.ADMIN_SECRET) {
            return createApiError('UNAUTHORIZED', 'Invalid Admin Secret', 401);
        }

        // Ensure email uniqueness
        const existing = await User.findOne({ email });
        if (existing) {
            return createApiError('CONFLICT', 'Email already in use', 409);
        }

        // Only 'teacher' role can be created via this endpoint
        const bcrypt = (await import('bcryptjs')).default;
        const hashed = await bcrypt.hash(password, 10);

        // Generate teacher code if not provided
        let finalTeacherCode = body.teacherCode;
        if (!finalTeacherCode) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let unique = false;
            while (!unique) {
                let code = 'T-';
                for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                const coll = await User.findOne({ teacherCode: code });
                if (!coll) {
                    finalTeacherCode = code;
                    unique = true;
                }
            }
        } else {
            // Normalize and check uniqueness if provided
            finalTeacherCode = finalTeacherCode.trim().toUpperCase();
            const existingCode = await User.findOne({ teacherCode: finalTeacherCode });
            if (existingCode) {
                return createApiError('CONFLICT', 'This code is already used', 409);
            }
            const existingProfileCode = await import('@/models/TeacherProfile').then(m => m.default.findOne({ teacherCode: finalTeacherCode }));
            if (existingProfileCode) {
                return createApiError('CONFLICT', 'This code is already used in a profile', 409);
            }
        }

        const teacher = await User.create({
            name,
            email,
            password: hashed,
            plainTextPassword: password,
            role: 'teacher',
            teacherCode: finalTeacherCode,
            totalWordsSeen: 0,
            isVerified: true,
        });

        // Create TeacherProfile for consistency
        const TeacherProfile = (await import('@/models/TeacherProfile')).default;
        await TeacherProfile.create({
            userId: teacher._id,
            teacherCode: finalTeacherCode,
            status: 'active'
        });

        return NextResponse.json(
            { message: 'Teacher account created', id: teacher._id, teacherCode: finalTeacherCode },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating teacher:', error);
        return createApiError('SERVER_ERROR', error.message || 'Server error', 500);
    }
}
