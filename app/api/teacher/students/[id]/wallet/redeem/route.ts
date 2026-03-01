import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

type Params = Promise<{ id: string }>;

/** GET: Fetch student wallet balance (for teacher) */
export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id: studentId } = await params;
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        await dbConnect();
        const wallet = await Wallet.findOne({ studentId: new mongoose.Types.ObjectId(studentId) }).lean() as any;
        return NextResponse.json({ balance: wallet?.balance ?? 0 });
    } catch {
        return NextResponse.json({ balance: 0 });
    }
}

export async function POST(req: Request, { params }: { params: Params }) {
    try {
        const { id: studentId } = await params;
        const teacher = await getServerSession();
        if (!teacher || teacher.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { amount, reason } = await req.json();
        if (!amount || amount <= 0 || !reason) {
            return NextResponse.json({ message: 'Amount and reason required' }, { status: 400 });
        }

        await dbConnect();

        // Verify student belongs to this teacher
        const student = await User.findOne({
            _id: new mongoose.Types.ObjectId(studentId),
            teacherId: new mongoose.Types.ObjectId(teacher.id),
            role: 'student',
        }).lean();
        if (!student) {
            return NextResponse.json({ message: 'Student not found or not your student' }, { status: 403 });
        }

        // Check balance
        const wallet = await Wallet.findOne({ studentId: new mongoose.Types.ObjectId(studentId) }).lean() as any;
        const currentBalance = wallet?.balance ?? 0;

        if (currentBalance < amount) {
            return NextResponse.json({
                message: `Insufficient balance. Current: ${currentBalance} MT Coin`,
            }, { status: 400 });
        }

        // Create transaction and update wallet
        await CoinTransaction.create({
            studentId: new mongoose.Types.ObjectId(studentId),
            teacherId: new mongoose.Types.ObjectId(teacher.id),
            type: 'REDEEM_TEACHER',
            amount: -amount, // negative: deduction
            meta: { reason },
        });

        const updatedWallet = await Wallet.findOneAndUpdate(
            { studentId: new mongoose.Types.ObjectId(studentId) },
            { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            newBalance: updatedWallet.balance,
            redeemed: amount,
        });
    } catch (error) {
        console.error('[WALLET_REDEEM]', error);
        return NextResponse.json({ message: 'Error processing redemption' }, { status: 500 });
    }
}
