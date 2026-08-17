import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import ShopPurchase from '@/models/ShopPurchase';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    await dbConnect();
    const purchases = await ShopPurchase.find({ teacherId: new mongoose.Types.ObjectId(session.id) })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('studentId', 'name email')
        .lean();
    return NextResponse.json({ purchases });
}