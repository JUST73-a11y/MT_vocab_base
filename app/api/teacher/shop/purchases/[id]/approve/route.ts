import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { approvePurchase } from '@/lib/shopService';

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await context.params;
    const result = await approvePurchase(id, session.id);
    if (!result.success) return NextResponse.json({ code: 'BAD_REQUEST', message: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
}