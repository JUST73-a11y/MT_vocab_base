import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        await dbConnect();

        let updateDoc: any = {};
        if (body.incrementWords) {
            updateDoc = { $inc: { totalWordsSeen: body.incrementWords } };
        } else if (body.totalWordsSeen !== undefined && body.totalWordsSeen !== null && !isNaN(body.totalWordsSeen)) {
            updateDoc = { totalWordsSeen: body.totalWordsSeen };
        }

        const user = await User.findByIdAndUpdate(id, updateDoc, { new: true });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating user' }, { status: 500 });
    }
}
