import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');
        const date = searchParams.get('date');

        if (!studentId || !date) {
            return NextResponse.json({ message: 'Missing params' }, { status: 400 });
        }

        if (user.role === 'student' && user.id !== studentId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();
        const session = await Session.findOne({ studentId, date }).lean();
        return NextResponse.json(session || null);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching session' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { studentId, date, wordsSeen = [] } = await req.json();

        if (user.role === 'student' && user.id !== studentId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        await dbConnect();

        const session = await Session.create({
            studentId,
            date,
            wordsSeen,
            wordsCount: wordsSeen.length
        });

        return NextResponse.json(session, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Error creating session' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { sessionId, wordsSeen, timeSpentSeconds = 0 } = await req.json();
        const studentId = user.id;

        await dbConnect();

        const session = await Session.findByIdAndUpdate(sessionId, {
            wordsSeen,
            wordsCount: wordsSeen.length
        }, { returnDocument: 'after' });

        if (!session) {
            return NextResponse.json({ message: 'Session not found' }, { status: 404 });
        }

        // Increment time spent in DailyStudentStats
        if (timeSpentSeconds > 0) {
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
            await import('@/models/DailyStudentStats').then(m => m.default.findOneAndUpdate(
                { studentId: session.studentId, date: todayStr },
                { $inc: { timeSpentSeconds: timeSpentSeconds } },
                { upsert: true }
            )).catch(err => console.error('[SESSION_TIME_UPDATE] Failed:', err));
        }

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating session' }, { status: 500 });
    }
}
