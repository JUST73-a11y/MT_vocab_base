import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const student = await getServerSession();
        if (!student) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        let wallet = await Wallet.findOne({ studentId: student.id }).lean();
        if (!wallet) {
            wallet = await Wallet.create({ studentId: student.id, balance: 0 });
        }

        return NextResponse.json({ success: true, wallet });
    } catch (e: any) {
        return NextResponse.json({ message: 'Wallet error', error: e.message }, { status: 500 });
    }
}
