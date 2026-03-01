import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import nodemailer from 'nodemailer';

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendResetEmail(email: string, name: string, otp: string) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    await transporter.sendMail({
        from: `"MT_vocab" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Parolni tiklash kodi — MT_vocab',
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f1a;color:#fff;padding:32px;border-radius:16px;">
                <h2 style="color:#818cf8;margin-bottom:8px;">MT_vocab</h2>
                <p style="color:#94a3b8;">Salom, <strong>${name}</strong>!</p>
                <p style="color:#94a3b8;">Parolni tiklash uchun quyidagi kodni kiriting:</p>
                <div style="background:#1e1e3a;border:2px solid #4f46e5;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <span style="font-size:40px;font-weight:900;letter-spacing:8px;color:#a5b4fc;">${otp}</span>
                </div>
                <p style="color:#64748b;font-size:13px;">Kod <strong>10 daqiqa</strong> ichida amal qiladi. Agar siz parolni tiklashni so'ramagan bo'lsangiz, bu xatni e'tiborsiz qoldiring.</p>
            </div>
        `,
    });
}

// POST /api/auth/forgot-password - send OTP
export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) return NextResponse.json({ message: 'Email kiritilmagan' }, { status: 400 });

        await dbConnect();
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ message: 'Bu email bilan foydalanuvchi topilmadi' }, { status: 404 });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await user.updateOne({ otp, otpExpiry });
        await sendResetEmail(email, user.name, otp);

        return NextResponse.json({ message: 'Kod emailga yuborildi' });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ message: error.message || 'Server xatosi' }, { status: 500 });
    }
}

// PATCH /api/auth/forgot-password - verify OTP and reset password
export async function PATCH(req: Request) {
    try {
        const { email, otp, newPassword } = await req.json();
        if (!email || !otp || !newPassword) {
            return NextResponse.json({ message: "Barcha maydonlarni to'ldiring" }, { status: 400 });
        }
        if (newPassword.length < 8) {
            return NextResponse.json({ message: 'Parol kamida 8 ta belgi bo\'lishi kerak' }, { status: 400 });
        }

        await dbConnect();
        const user = await User.findOne({ email });
        if (!user) return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
        if (!user.otp || user.otp !== otp) return NextResponse.json({ message: "Kod noto'g'ri" }, { status: 400 });
        if (user.otpExpiry && new Date() > user.otpExpiry) return NextResponse.json({ message: 'Kod muddati tugagan' }, { status: 400 });

        const bcrypt = (await import('bcryptjs')).default;
        const hashed = await bcrypt.hash(newPassword, 10);

        await user.updateOne({
            password: hashed,
            plainTextPassword: newPassword,
            otp: null,
            otpExpiry: null,
            isVerified: true,
        });

        return NextResponse.json({ message: 'Parol muvaffaqiyatli yangilandi' });
    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json({ message: error.message || 'Server xatosi' }, { status: 500 });
    }
}
