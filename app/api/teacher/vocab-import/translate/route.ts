/**
 * /api/teacher/vocab-import/translate/route.ts
 * AI translation batch endpoint.
 * Takes an array of English words with no Uzbek translation.
 * Returns suggested translations — NOT auto-applied, shown as ✨ AI to teacher.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import { generateTranslations, isGeminiConfigured } from '@/lib/vocab/geminiClient';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({
        error: 'Gemini API kalit sozlanmagan. .env.local faylga GEMINI_API_KEY qo\'shing.'
      }, { status: 503 });
    }

    const { words } = await req.json() as { words: string[] };

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'So\'zlar ro\'yxati bo\'sh' }, { status: 400 });
    }

    if (words.length > 100) {
      return NextResponse.json({ error: 'Bir vaqtda 100 tadan ko\'p so\'z tarjima qilib bo\'lmaydi' }, { status: 400 });
    }

    const translations = await generateTranslations(words);
    return NextResponse.json({ translations });

  } catch (error: any) {
    console.error('Vocab translate error:', error);
    return NextResponse.json({ error: error.message || 'Tarjima xatosi' }, { status: 500 });
  }
}
