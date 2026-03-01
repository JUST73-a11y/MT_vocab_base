import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ message: 'Email va kod kiritilishi shart' }, { status: 400 });
        }

        await dbConnect();

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ message: 'Foydalanuvchi topilmadi' }, { status: 404 });
        }

        if (user.isVerified) {
            return NextResponse.json({ message: 'Email allaqachon tasdiqlangan' }, { status: 400 });
        }

        if (!user.otp || user.otp !== otp) {
            return NextResponse.json({ message: "Kod noto'g'ri. Qayta urinib ko'ring." }, { status: 400 });
        }

        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            return NextResponse.json({ message: 'Kod muddati tugagan. Yangi kod so\'rang.' }, { status: 400 });
        }

        // Mark as verified and clear OTP
        user.isVerified = true;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        return NextResponse.json({ message: 'Email muvaffaqiyatli tasdiqlandi!' }, { status: 200 });
    } catch (error: any) {
        console.error('OTP verify error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
