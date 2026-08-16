import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import StudentTheme from '@/models/StudentTheme';
import { createApiError } from '@/lib/apiError';

export async function POST() {
  const s = await getServerSession();
  if (!s || s.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);
  await dbConnect();
  await StudentTheme.updateMany({ studentId: s.id }, { isEquipped: false });
  return NextResponse.json({ success: true });
}
