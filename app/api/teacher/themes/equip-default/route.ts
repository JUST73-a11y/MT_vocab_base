import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import TeacherTheme from '@/models/TeacherTheme';
import { createApiError } from '@/lib/apiError';

export async function POST() {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  await dbConnect();
  await TeacherTheme.updateMany({ teacherId: session.id }, { $set: { isEquipped: false } });
  return NextResponse.json({ success: true, message: 'Reverted to default theme' });
}