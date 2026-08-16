import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== 'student') {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return createApiError('BAD_REQUEST', 'Fayl tanlanmadi', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return createApiError('BAD_REQUEST', 'Faqat JPG, PNG, WEBP yoki GIF rasmlar qabul qilinadi', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return createApiError('BAD_REQUEST', 'Rasm hajmi 3MB dan oshmasligi kerak', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get extension
    const ext = path.extname(file.name) || '.webp';
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext.toLowerCase()) ? ext.toLowerCase() : '.webp';
    const filename = `theme_bg_${session.id}_${Date.now()}${cleanExt}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'themes');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/themes/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Theme background upload error:', error);
    return createApiError('SERVER_ERROR', 'Rasm yuklashda xatolik yuz berdi', 500);
  }
}