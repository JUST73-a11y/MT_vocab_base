import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Duel from '@/models/Duel';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        const { id } = await params;
        await dbConnect();
        const duel = await Duel.findById(id);
        if (!duel) return createApiError('NOT_FOUND', 'Duel topilmadi', 404);

        if (duel.opponentId.toString() !== session.id) {
            return createApiError('FORBIDDEN', 'Faqat chaqirilgan o\'quvchi rad eta oladi', 403);
        }

        duel.status = 'DECLINED';
        await duel.save();

        return NextResponse.json({ success: true, message: 'Duel rad etildi.' });
    } catch (error: any) {
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}
