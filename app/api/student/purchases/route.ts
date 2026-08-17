import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import ShopPurchase from '@/models/ShopPurchase';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    await dbConnect();
    const purchases = await ShopPurchase.find({ studentId: new mongoose.Types.ObjectId(session.id) })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    return NextResponse.json({ purchases });
}