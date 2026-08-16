import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import StudentTheme from '@/models/StudentTheme';
import { createApiError } from '@/lib/apiError';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== 'student') {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  let body: any;
  try { body = await req.json(); } catch { return createApiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const { themeId } = body;
  if (!themeId || !mongoose.Types.ObjectId.isValid(themeId)) {
    return createApiError('BAD_REQUEST', 'Valid themeId required', 400);
  }
  await dbConnect();
  const target = await StudentTheme.findOne({ _id: themeId, studentId: session.id });
  if (!target) return createApiError('NOT_FOUND', 'Theme not found', 404);

  await StudentTheme.updateMany({ studentId: session.id }, { $set: { isEquipped: false } });
  target.isEquipped = true;
  await target.save();
  return NextResponse.json({ success: true, theme: target });
}
