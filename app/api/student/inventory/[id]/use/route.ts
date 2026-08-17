import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import InventoryItem from '@/models/InventoryItem';
import StudentEnergy from '@/models/StudentEnergy';
import mongoose from 'mongoose';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    const { id } = await context.params;
    await dbConnect();

    const item = await InventoryItem.findOne({
        _id: new mongoose.Types.ObjectId(id),
        studentId: new mongoose.Types.ObjectId(session.id),
        status: 'AVAILABLE',
    });
    if (!item) return NextResponse.json({ code: 'NOT_FOUND', message: 'Item not found or already used' }, { status: 404 });

    // Apply effect based on type
    if (item.itemType === 'ENERGY_STACK') {
        const energyAmount = item.metadata?.energyAmount ?? 10;
        await StudentEnergy.findOneAndUpdate(
            { studentId: new mongoose.Types.ObjectId(session.id) },
            { $inc: { energy: energyAmount } },
            { upsert: true }
        );
    }

    item.status = 'USED';
    item.usedAt = new Date();
    await item.save();

    return NextResponse.json({ success: true, usedItem: item });
}