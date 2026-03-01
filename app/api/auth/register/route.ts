import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email: string, name: string, otp: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"VocabTeacher" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Email tasdiqlash kodi — VocabTeacher',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f1a;color:#fff;padding:32px;border-radius:16px;">
                <h2 style="color:#818cf8;margin-bottom:8px;">VocabTeacher</h2>
                <p style="color:#94a3b8;">Salom, <strong>${name}</strong>!</p>
                <p style="color:#94a3b8;">Email manzilingizni tasdiqlash uchun quyidagi kodni kiriting:</p>
                <div style="background:#1e1e3a;border:2px solid #4f46e5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <span style="font-size:40px;font-weight:900;letter-spacing:8px;color:#a5b4fc;">${otp}</span>
                </div>
                <p style="color:#64748b;font-size:13px;">Kod <strong>10 daqiqa</strong> ichida amal qiladi. Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p>
            </div>
        `,
    });
}

function generateTeacherCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'T-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function POST(req: Request) {
    try {
        const { name, email, password, role, teacherCode } = await req.json();

        if (!name || !email || !password || !role) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        await dbConnect();

        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.isVerified) {
            return NextResponse.json({ message: 'User already exists' }, { status: 409 });
        }

        let assignedTeacherId: string | undefined = undefined;
        let generatedTeacherCode: string | undefined = undefined;

        if (role === 'student') {
            if (teacherCode) {
                const teacher = await User.findOne({ teacherCode: teacherCode.toUpperCase(), role: 'teacher' });
                if (!teacher) {
                    return NextResponse.json({ message: 'Invalid teacher code' }, { status: 400 });
                }
                assignedTeacherId = teacher._id.toString();
            }
        } else if (role === 'teacher') {
            // Check if this unverified email already has a code
            if (existingUser && existingUser.role === 'teacher' && existingUser.teacherCode) {
                generatedTeacherCode = existingUser.teacherCode;
            } else {
                // Ensure unique teacher code
                let unique = false;
                while (!unique) {
                    generatedTeacherCode = generateTeacherCode();
                    const coll = await User.findOne({ teacherCode: generatedTeacherCode });
                    if (!coll) unique = true;
                }
            }
        }

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        if (existingUser && !existingUser.isVerified) {
            // Resend OTP to existing unverified user
            existingUser.otp = otp;
            existingUser.otpExpiry = otpExpiry;
            // Update role/teacher if they changed it during retry
            existingUser.role = role;
            if (role === 'student' && assignedTeacherId) existingUser.teacherId = assignedTeacherId;
            if (role === 'teacher' && generatedTeacherCode) existingUser.teacherCode = generatedTeacherCode;
            await existingUser.save();
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);

            const userData: any = {
                name,
                email,
                password: hashedPassword,
                plainTextPassword: password,
                role,
                isVerified: false,
                otp,
                otpExpiry,
            };

            if (assignedTeacherId) userData.teacherId = assignedTeacherId;
            if (generatedTeacherCode) userData.teacherCode = generatedTeacherCode;

            await User.create(userData);
        }

        await sendOTPEmail(email, name, otp);

        return NextResponse.json({ message: 'OTP sent to email' }, { status: 200 });
    } catch (error: any) {
        console.error('Register/OTP error:', error);
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}
