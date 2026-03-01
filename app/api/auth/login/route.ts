import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { checkRateLimit, incrementFailedAttempt, resetRateLimit } from '@/lib/rateLimiter';
import { sendSecurityAlert } from '@/lib/mailer';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Missing credentials' },
                { status: 400 }
            );
        }

        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const rateKey = `login_${ip}_${email}`;
        const limit = checkRateLimit(rateKey);

        if (!limit.allowed) {
            return NextResponse.json(
                { message: `Too many attempts. Locked out for ${limit.retryAfter} seconds.` },
                { status: 429 }
            );
        }

        await dbConnect();

        let user = await User.findOne({ email });

        const adminAllowlist = process.env.ADMIN_EMAIL_ALLOWLIST || '';
        const adminInitialPass = process.env.ADMIN_INITIAL_PASSWORD || '';

        // --- SINGLE ADMIN ALLOWLIST INITIALIZATION ---
        if (email === adminAllowlist && adminAllowlist !== '') {
            if (!user) {
                if (!adminInitialPass) {
                    return NextResponse.json({ message: 'Server setup error: Missing ADMIN_INITIAL_PASSWORD' }, { status: 500 });
                }
                const hashed = await bcrypt.hash(adminInitialPass, 10);
                user = await User.create({
                    name: 'Super Admin',
                    email: email,
                    password: hashed,
                    plainTextPassword: 'redacted',
                    role: 'admin',
                    status: 'active',
                    isVerified: true
                });
            } else if (user.role !== 'admin') {
                await user.updateOne({ role: 'admin' });
                user.role = 'admin';
            }
        }
        // --- END SINGLE ADMIN LOGIC ---

        if (!user) {
            const locked = incrementFailedAttempt(rateKey);
            if (locked) {
                await sendSecurityAlert('Bruteforce Attack Detected', `<p>Multiple failed login attempts detected for email: <b>${email}</b></p><p>IP Address: <b>${ip}</b></p><p>Time: ${new Date().toISOString()}</p>`, `bf_${ip}`);
            }
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Enforce strong password match for ALL users (no bypasses allowed)
        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const locked = incrementFailedAttempt(rateKey);
            if (locked) {
                await sendSecurityAlert('Bruteforce Attack Detected', `<p>Multiple failed password attempts for user: <b>${email}</b></p><p>IP Address: <b>${ip}</b></p><p>Time: ${new Date().toISOString()}</p>`, `bf_${email}`);
            }
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Login successful, clean up record
        resetRateLimit(rateKey);

        // Only block if this is a brand-new unverified registration (has active OTP)
        // Old accounts (isVerified:false but no otp) are auto-approved
        if (user.isVerified === false) {
            if (user.otp) {
                // New user with pending OTP — must verify email
                return NextResponse.json(
                    { message: 'EMAIL_NOT_VERIFIED' },
                    { status: 403 }
                );
            } else {
                // Old account without OTP — auto-verify and allow login
                await user.updateOne({ isVerified: true });
            }
        }

        // Update last login timestamp
        await user.updateOne({ lastLoginAt: new Date() });

        // Fetch profile data to include in JWT for middleware
        let teacherId = user.teacherId;
        let teacherCode = user.teacherCode;

        if (user.role === 'student') {
            const StudentProfile = (await import('@/models/StudentProfile')).default;
            const profile = await StudentProfile.findOne({ userId: user._id });
            if (profile) teacherId = profile.teacherId?.toString();
        } else if (user.role === 'teacher') {
            const TeacherProfile = (await import('@/models/TeacherProfile')).default;
            const profile = await TeacherProfile.findOne({ userId: user._id });
            if (profile) teacherCode = profile.teacherCode;
        }

        // Create JWT
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || 'default-secret-key-change-me'
        );
        const token = await new SignJWT({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            teacherId: teacherId || null,
            teacherCode: teacherCode || null
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(secret);

        // Return user info and token (in a real app, set cookie here)
        // For MVP, returning token in body is fine, implementing HttpOnly cookie is better but more complex for client fetch
        // Let's set a cookie for middleware protection, but also return user data

        const response = NextResponse.json(
            {
                message: 'Login successful',
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    totalWordsSeen: user.totalWordsSeen,
                    createdAt: user.createdAt
                }
            },
            { status: 200 }
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
