import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for high-res wallpapers

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'teacher' && session.role !== 'admin')) {
      return createApiError('UNAUTHORIZED', 'Login required', 401);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return createApiError('BAD_REQUEST', 'Rasm fayli yuborilmadi', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return createApiError('BAD_REQUEST', 'Faqat JPG, PNG, WEBP yoki GIF formatlar ruxsat etilgan', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return createApiError('BAD_REQUEST', 'Rasm hajmi 10MB dan oshmasligi kerak', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert small to medium images directly to Base64 Data URL for 100% instant reliability in dev & prod
    // (Prevents Turbopack dev 404 caching issues with static files created post-startup)
    if (file.size <= 4 * 1024 * 1024) {
      const mimeType = file.type || 'image/jpeg';
      const base64Data = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      return NextResponse.json({ url: dataUrl }, { status: 201 });
    }

    // For larger files, save to public/uploads/themes
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'themes');
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name) || '.jpg';
    const randomName = `teacher_bg_${session.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(uploadsDir, randomName);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/themes/${randomName}`;
    return NextResponse.json({ url: fileUrl }, { status: 201 });
  } catch (error: any) {
    console.error('Teacher theme image upload error:', error);
    return createApiError('SERVER_ERROR', 'Rasmni yuklashda server xatoligi yuz berdi: ' + (error.message || ''), 500);
  }
}