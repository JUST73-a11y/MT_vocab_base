import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/serverAuth';

export async function PUT(req: Request) {
    try {
        const sessionUser = await getServerSession();
        if (!sessionUser) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ message: 'Barcha maydonlarni to\'ldiring' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ message: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak' }, { status: 400 });
        }

        await dbConnect();

        const userDoc = await User.findById(sessionUser.id);
        if (!userDoc) {
            return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
        }

        const isMatch = await bcrypt.compare(currentPassword, userDoc.password);
        if (!isMatch) {
            return NextResponse.json({ message: 'Joriy parol noto\'g\'ri kiritildi' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(sessionUser.id, { password: hashedPassword });

        return NextResponse.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi' });
    } catch (e: any) {
        console.error('Password update error:', e);
        return NextResponse.json({ message: 'Parolni o\'zgartirishda xatolik', error: e.message }, { status: 500 });
    }
}
