import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import InventoryItem from '@/models/InventoryItem';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    await dbConnect();
    const items = await InventoryItem.find({
        studentId: new mongoose.Types.ObjectId(session.id),
        status: { $ne: 'USED' },
    }).sort({ acquiredAt: -1 }).lean();
    return NextResponse.json({ items });
}