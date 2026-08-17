import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { executePurchase } from '@/lib/shopService';
import mongoose from 'mongoose';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid item ID' }, { status: 400 });
    }
    let body: any = {};
    try { body = await req.json(); } catch { /**/ }
    const now = new Date();
    const minuteKey = session.id + '_' + id + '_' + now.getFullYear() + now.getMonth() + now.getDate() + now.getHours() + now.getMinutes();
    const idempotencyKey = body.idempotencyKey || minuteKey;
    const result = await executePurchase(session.id, id, idempotencyKey);
    if (!result.success) {
        const statusMap: Record<string, number> = { NOT_FOUND: 404, FORBIDDEN: 403, SOLD_OUT: 409, INSUFFICIENT_BALANCE: 402, DUPLICATE: 409, ITEM_INACTIVE: 410 };
        return NextResponse.json({ code: result.code, message: result.error }, { status: statusMap[result.code] || 400 });
    }
    return NextResponse.json(result, { status: 201 });
}