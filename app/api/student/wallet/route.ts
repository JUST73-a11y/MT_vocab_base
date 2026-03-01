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
        console.error('[STUDENT_WALLET]', error);
        return NextResponse.json({ message: 'Error fetching wallet' }, { status: 500 });
    }
}
