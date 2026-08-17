import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import StudentTheme from '@/models/StudentTheme';
import { sanitizeThemeConfig } from '@/lib/theme/themeEngine';
import { createApiError } from '@/lib/apiError';
import { checkEntitlement } from '@/lib/entitlements';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);
  await dbConnect();
  const themes = await StudentTheme.find({ studentId: session.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json(themes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);

  // Backend entitlement check — never trust the client
  const access = await checkEntitlement(session.id, 'THEME_CREATOR');
  if (!access.active) {
    return NextResponse.json(
      { code: 'THEME_CREATOR_ACCESS_REQUIRED', message: 'Theme Creator access required. Purchase it from the Shop.' },
      { status: 403 }
    );
  }

  await dbConnect();
  const count = await StudentTheme.countDocuments({ studentId: session.id });
  if (count >= 10) return createApiError('FORBIDDEN', 'Maximum 10 themes allowed', 403);
  let body: any;
  try { body = await req.json(); } catch { return createApiError('BAD_REQUEST', 'Invalid JSON', 400); }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '';
  if (!name) return createApiError('BAD_REQUEST', 'Theme name is required', 400);
  const config = sanitizeThemeConfig(body.config ?? {});
  const theme = await StudentTheme.create({ studentId: session.id, name, config, isEquipped: false, source: 'STUDENT' });
  return NextResponse.json(theme, { status: 201 });
}

