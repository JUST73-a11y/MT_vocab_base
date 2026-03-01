import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/serverAuth';

export async function PUT(req: Request) {
    try {
        const userAction = await getServerSession();
        if (!userAction) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { userId, name, email, password } = await req.json();

        if (!userId) {
            return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
        }

        if (userAction.id !== userId && userAction.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();

        const updates: any = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.password = hashedPassword;
        }

        const user = await User.findByIdAndUpdate(userId, updates, { returnDocument: 'after' });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json({ message: 'Error updating profile' }, { status: 500 });
    }
}
