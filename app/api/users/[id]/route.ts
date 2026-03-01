import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { totalWordsSeen } = await req.json();
        await dbConnect();

        const user = await User.findByIdAndUpdate(id, { totalWordsSeen }, { returnDocument: 'after' });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
    }
}
