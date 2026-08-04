import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/setup-password
 * Called when a teacher-created student logs in for the first time with their Gmail.
 * They verify their email is in the system, then set a new password.
 * Body: { email, newPassword }
 */
export async function POST(req: Request) {
    try {
        const { email, newPassword } = await req.json();
        if (!email || !newPassword) {
            return NextResponse.json({ message: 'Email and newPassword required' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
        }

        await dbConnect();

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            role: 'student',
            needsPasswordSetup: true,
        });

        if (!user) {
            return NextResponse.json({ message: 'Email topilmadi yoki allaqachon sozlangan' }, { status: 404 });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        user.visiblePassword = newPassword;
        user.needsPasswordSetup = false;
        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Parol muvaffaqiyatli o\'rnatildi',
            user: {
                name: user.name,
                email: user.email,
            }
        });
    } catch (error) {
        console.error('Setup password error:', error);
        return NextResponse.json({ message: 'Error setting up password' }, { status: 500 });
    }
}

/**
 * GET /api/auth/setup-password?email=...
 * Check if an email is a valid teacher-created student needing password setup.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        if (!email) return NextResponse.json({ valid: false });

        await dbConnect();
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            role: 'student',
            needsPasswordSetup: true,
        }).select('name email');

        return NextResponse.json({ valid: !!user, name: user?.name || '' });
    } catch (error) {
        return NextResponse.json({ valid: false });
    }
}
