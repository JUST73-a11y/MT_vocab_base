import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import StudentTheme from '@/models/StudentTheme';
import { createApiError } from '@/lib/apiError';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getServerSession();
  if (!s || s.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);
  await dbConnect();
  const t = await StudentTheme.findById(id);
  if (!t || t.studentId.toString() !== s.id) return createApiError('NOT_FOUND', 'Theme not found', 404);
  await StudentTheme.updateMany({ studentId: s.id }, { isEquipped: false });
  t.isEquipped = true;
  await t.save();
  return NextResponse.json(t);
}
