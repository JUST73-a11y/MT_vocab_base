import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import DailyStudentStats from '@/models/DailyStudentStats';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';

export async function GET() {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

        const [user, wallet, todayStats, unitCount] = await Promise.all([
            User.findById(student.id).lean(),
            Wallet.findOne({ studentId: student.id }).lean(),
            DailyStudentStats.findOne({ studentId: student.id, date: todayStr }).lean(),
            Unit.countDocuments({ teacherId: (student as any).teacherId })
        ]);

        const todayAccuracy = todayStats?.wordsSeen
            ? Math.round((todayStats.correct / todayStats.wordsSeen) * 100)
            : 0;

        return NextResponse.json({
            todayWords: todayStats?.wordsSeen || 0,
            todayCorrect: todayStats?.correct || 0,
            todayAccuracy: todayAccuracy,
            totalWords: (user as any)?.totalWordsSeen || 0,
            mtCoins: (wallet as any)?.balance || 0,
            availableUnits: unitCount,
        });
    } catch (error) {
        console.error('[DASHBOARD_SUMMARY]', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
