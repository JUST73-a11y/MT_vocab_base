import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || session.role !== 'teacher') {
    return createApiError('UNAUTHORIZED', 'Login required', 401);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return createApiError('BAD_REQUEST', 'Fayl tanlanmadi', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return createApiError('BAD_REQUEST', 'Faqat JPG, PNG, WEBP, GIF yoki SVG rasmlar qabul qilinadi', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return createApiError('BAD_REQUEST', 'Rasm hajmi 5MB dan oshmasligi kerak', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.png';
    const filename = `shop_item_${session.id}_${Date.now()}${ext.toLowerCase()}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'shop');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/shop/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Shop image upload error:', error);
    return createApiError('SERVER_ERROR', 'Rasm yuklashda xatolik yuz berdi', 500);
  }
}