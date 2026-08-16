import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import TeacherTheme from '@/models/TeacherTheme';
import { sanitizeThemeConfig } from '@/lib/theme/themeEngine';
import { createApiError } from '@/lib/apiError';
import mongoose from 'mongoose';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return createApiError('BAD_REQUEST', 'Invalid theme ID', 400);
  await dbConnect();
  const theme = await TeacherTheme.findOne({ _id: id, teacherId: session.id }).lean();
  if (!theme) return createApiError('NOT_FOUND', 'Theme not found', 404);
  return NextResponse.json(theme);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return createApiError('BAD_REQUEST', 'Invalid theme ID', 400);
  let body: any;
  try { body = await req.json(); } catch { return createApiError('BAD_REQUEST', 'Invalid JSON', 400); }
  await dbConnect();
  const updateData: any = {};
  if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim().slice(0, 50);
  if (body.config) updateData.config = sanitizeThemeConfig(body.config);
  const theme = await TeacherTheme.findOneAndUpdate(
    { _id: id, teacherId: session.id },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();
  if (!theme) return createApiError('NOT_FOUND', 'Theme not found', 404);
  return NextResponse.json(theme);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return createApiError('BAD_REQUEST', 'Invalid theme ID', 400);
  await dbConnect();
  const theme = await TeacherTheme.findOneAndDelete({ _id: id, teacherId: session.id });
  if (!theme) return createApiError('NOT_FOUND', 'Theme not found', 404);
  return NextResponse.json({ success: true });
}