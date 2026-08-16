import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import TeacherTheme from '@/models/TeacherTheme';
import { createApiError } from '@/lib/apiError';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  let body: any;
  try { body = await req.json(); } catch { return createApiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const { themeId } = body;
  if (!themeId || !mongoose.Types.ObjectId.isValid(themeId)) {
    return createApiError('BAD_REQUEST', 'Valid themeId required', 400);
  }
  await dbConnect();
  const count = await TeacherTheme.countDocuments({ teacherId: session.id });
  if (count >= 15) return createApiError('FORBIDDEN', 'Maximum 15 themes allowed', 403);
  const source = await TeacherTheme.findOne({ _id: themeId, teacherId: session.id }).lean();
  if (!source) return createApiError('NOT_FOUND', 'Source theme not found', 404);

  const duplicate = await TeacherTheme.create({
    teacherId: session.id,
    name: `${(source as any).name} (Nusxa)`.slice(0, 50),
    config: (source as any).config,
    isEquipped: false,
    source: 'TEACHER',
  });
  return NextResponse.json(duplicate, { status: 201 });
}