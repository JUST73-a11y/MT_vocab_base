import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

export async function GET() {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const studentObjId = new mongoose.Types.ObjectId(student.id);

        const [wallet, recentTxs] = await Promise.all([
            Wallet.findOne({ studentId: studentObjId }).lean(),
            CoinTransaction.find({ studentId: studentObjId })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
        ]);

        return NextResponse.json({
            balance: (wallet as any)?.balance ?? 0,
            transactions: recentTxs,
        });
    } catch (error) {
        
        return NextResponse.json({ message: 'Error fetching wallet' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { amount, reason } = await req.json();
        if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
            return NextResponse.json({ message: 'Invalid amount' }, { status: 400 });
        }

        await dbConnect();
        const studentObjId = new mongoose.Types.ObjectId(student.id);

        // 1. Create CoinTransaction (type is EARN_QUIZ to satisfy Mongoose Enum)
        const tx = await CoinTransaction.create({
            studentId: studentObjId,
            type: 'EARN_QUIZ',
            amount: amount,
            meta: { reason: reason || 'O\'yin orqali tanga topildi', isGame: true }
        });

        // 2. Increment Wallet balance (using findOneAndUpdate with upsert)
        const wallet = await Wallet.findOneAndUpdate(
            { studentId: studentObjId },
            { $inc: { balance: amount }, $set: { updatedAt: new Date() } },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            balance: wallet.balance,
            transaction: tx
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error updating wallet' }, { status: 500 });
    }
}
