import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import CoinTransaction from '@/models/CoinTransaction';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const gifts = await CoinTransaction.find({
            studentId: session.id,
            type: 'REDEEM_TEACHER',
            'meta.reason': { $exists: true, $ne: '' } // Ensure a reason was provided
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json({ gifts });

    } catch (error) {
        console.error('[STUDENT_GIFTS]', error);
        return NextResponse.json({ message: 'Error fetching gifts', gifts: [] }, { status: 500 });
    }
}
