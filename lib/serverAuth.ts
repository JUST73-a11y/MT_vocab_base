import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function getServerSession() {
    try {
        const token = (await cookies()).get('token')?.value;
        if (!token) return null;

        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || 'default-secret-key-change-me'
        );

        const { payload } = await jwtVerify(token, secret);

        await dbConnect();
        const user = await User.findById(payload.id).select('-password');

        if (!user) return null;

        return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
        };
    } catch (e) {
        return null;
    }
}
