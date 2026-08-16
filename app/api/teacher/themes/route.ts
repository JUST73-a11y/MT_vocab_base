import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import TeacherTheme from '@/models/TeacherTheme';
import { sanitizeThemeConfig } from '@/lib/theme/themeEngine';
import { createApiError } from '@/lib/apiError';

export async function GET() {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  await dbConnect();
  const themes = await TeacherTheme.find({ teacherId: session.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(themes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  await dbConnect();
  const count = await TeacherTheme.countDocuments({ teacherId: session.id });
  if (count >= 15) return createApiError('FORBIDDEN', 'Maximum 15 themes allowed', 403);
  let body: any;
  try { body = await req.json(); } catch { return createApiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '';
  if (!name) return createApiError('BAD_REQUEST', 'Theme name is required', 400);
  const config = sanitizeThemeConfig(body.config ?? {});
  const theme = await TeacherTheme.create({
    teacherId: session.id,
    name,
    config,
    isEquipped: false,
    source: 'TEACHER',
  });
  return NextResponse.json(theme, { status: 201 });
}