import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import GroupQuizSession from '@/models/GroupQuizSession';
import { getServerSession } from '@/lib/serverAuth';

type Params = Promise<{ id: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
    try {
        const { id } = await params;
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = 10;

        const [sessions, total] = await Promise.all([
            GroupQuizSession.find({ groupId: id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            GroupQuizSession.countDocuments({ groupId: id }),
        ]);

        return NextResponse.json({ sessions, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching sessions' }, { status: 500 });
    }
}
