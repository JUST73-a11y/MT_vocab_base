import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { checkEntitlement } from '@/lib/entitlements';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    const themeCreator = await checkEntitlement(session.id, 'THEME_CREATOR');
    return NextResponse.json({ THEME_CREATOR: themeCreator });
}