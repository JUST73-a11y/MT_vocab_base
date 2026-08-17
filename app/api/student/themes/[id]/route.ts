import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import StudentTheme from '@/models/StudentTheme';
import { sanitizeThemeConfig } from '@/lib/theme/themeEngine';
import { createApiError } from '@/lib/apiError';
import { checkEntitlement } from '@/lib/entitlements';

async function getOwned(id: string, studentId: string) {
  const t = await StudentTheme.findById(id);
  if (!t || t.studentId.toString() !== studentId) return null;
  return t;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getServerSession();
  if (!s || s.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);
  await dbConnect();
  const t = await getOwned(id, s.id);
  if (!t) return createApiError('NOT_FOUND', 'Theme not found', 404);
  return NextResponse.json(t);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getServerSession();
  if (!s || s.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);

  // Editing requires active Theme Creator entitlement
  const access = await checkEntitlement(s.id, 'THEME_CREATOR');
  if (!access.active) {
    return NextResponse.json(
      { code: 'THEME_CREATOR_ACCESS_REQUIRED', message: 'Theme Creator access required to edit themes. Purchase it from the Shop.' },
      { status: 403 }
    );
  }

  await dbConnect();
  const t = await getOwned(id, s.id);
  if (!t) return createApiError('NOT_FOUND', 'Theme not found', 404);
  let body: any;
  try { body = await req.json(); } catch { return createApiError('BAD_REQUEST', 'Invalid JSON', 400); }
  if (body.name !== undefined) {
    const n = typeof body.name === 'string' ? body.name.trim().slice(0, 50) : '';
    if (!n) return createApiError('BAD_REQUEST', 'Name cannot be empty', 400);
    t.name = n;
  }
  if (body.config !== undefined) t.config = sanitizeThemeConfig(body.config);
  await t.save();
  return NextResponse.json(t);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getServerSession();
  if (!s || s.role !== 'student') return createApiError('UNAUTHORIZED', 'Login required', 401);
  await dbConnect();
  const t = await getOwned(id, s.id);
  if (!t) return createApiError('NOT_FOUND', 'Theme not found', 404);
  if (t.isEquipped) await StudentTheme.updateMany({ studentId: s.id }, { isEquipped: false });
  await StudentTheme.deleteOne({ _id: id });
  return NextResponse.json({ success: true });
}
