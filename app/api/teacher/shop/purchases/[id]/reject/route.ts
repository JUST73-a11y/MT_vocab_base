import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { rejectPurchase } from '@/lib/shopService';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await context.params;
    let note = '';
    try { const b = await req.json(); note = b.note || ''; } catch { /**/ }
    const result = await rejectPurchase(id, session.id, note);
    if (!result.success) return NextResponse.json({ code: 'BAD_REQUEST', message: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
}