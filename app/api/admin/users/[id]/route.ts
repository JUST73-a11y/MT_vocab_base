import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import Session from '@/models/Session';
import bcrypt from 'bcryptjs';
import { getServerSession } from '@/lib/serverAuth';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userAction = await getServerSession();
        if (!userAction || userAction.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();
        const body = await req.json();

        // ── Password reset ──
        if (body.newPassword) {
            if (body.newPassword.length < 6) {
                return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });
            }

            // Validate admin secret
            const ADMIN_SECRET = process.env.ADMIN_SECRET;
            if (!ADMIN_SECRET || body.adminSecret !== ADMIN_SECRET) {
                return NextResponse.json({ message: 'Admin Secret noto\'g\'ri' }, { status: 401 });
            }

            const hashed = await bcrypt.hash(body.newPassword, 10);
            const user = await User.findByIdAndUpdate(
                id,
                { password: hashed, plainTextPassword: body.newPassword, isVerified: true, otp: null, otpExpiry: null },
                { returnDocument: 'after' }
            ).select('-password');

            if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
            return NextResponse.json({ message: 'Password reset successfully', user });
        }

        // ── Status update ──
        const { status } = body;
        if (!['active', 'blocked'].includes(status)) {
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { status },
            { returnDocument: 'after' }
        ).select('-password');

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
    }
}


export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userAction = await getServerSession();
        if (!userAction || userAction.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();
        const userId = id;

        // 1. Delete user
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // 2. Cleanup related data if needed
        // If it's a teacher, DO NOT delete their units and words as requested by admin.
        // The units will remain in the system.

        // If it's a student, delete their sessions
        if (user.role === 'student') {
            await Session.deleteMany({ studentId: userId });
        }

        return NextResponse.json({ message: 'User and related data deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ message: 'Error deleting user' }, { status: 500 });
    }
}
