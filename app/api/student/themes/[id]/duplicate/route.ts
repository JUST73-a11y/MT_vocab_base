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
  const count = await StudentTheme.countDocuments({ studentId: s.id });
  if (count >= 10) return createApiError('FORBIDDEN', 'Max 10 themes', 403);
  const src = await StudentTheme.findById(id);
  if (!src || src.studentId.toString() !== s.id) return createApiError('NOT_FOUND', 'Theme not found', 404);
  const copy = await StudentTheme.create({
    studentId: s.id,
    name: src.name + ' Copy',
    config: JSON.parse(JSON.stringify(src.config)),
    isEquipped: false,
    source: 'STUDENT',
  });
  return NextResponse.json(copy, { status: 201 });
}
