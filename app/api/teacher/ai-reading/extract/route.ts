/**
 * POST /api/teacher/ai-reading/extract
 *
 * AI Reading Vocabulary Extractor — Teacher endpoint.
 * Accepts file upload or raw text, runs AI extraction pipeline,
 * returns structured vocabulary results for teacher review.
 *
 * FLOW: Upload → Validate → Extract text → AI analysis → Return results
 * Nothing is saved to Word collection here — teacher must confirm via /save.
 *
 * Rate limit: AI_RATE_LIMIT_TEACHER requests per hour (default 10).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import AIExtractionSession from '@/models/AIExtractionSession';
import { validateFile, extractTextFromBuffer } from '@/lib/vocab/documentTextExtractor';
import { extractVocabularyFromDocument } from '@/lib/vocab/aiReadingExtractor';
import { isGeminiConfigured } from '@/lib/vocab/geminiClient';

export const dynamic = 'force-dynamic';
// Large files need more time — increase serverless timeout
export const maxDuration = 120;

const RATE_LIMIT_PER_HOUR = parseInt(process.env.AI_RATE_LIMIT_TEACHER ?? '10');

export async function POST(req: NextRequest) {
  const startMs = Date.now();

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json({ error: 'AI xizmati sozlanmagan (GEMINI_API_KEY yo\'q)' }, { status: 503 });
    }

    await dbConnect();

    // ── Rate limiting ─────────────────────────────────────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await AIExtractionSession.countDocuments({
      userId: user.id,
      createdAt: { $gte: oneHourAgo },
      status: { $in: ['done', 'processing'] },
    });
    if (recentCount >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: `Soatlik limit: ${RATE_LIMIT_PER_HOUR} ta so'rov. Bir ozdan keyin urinib ko'ring.` },
        { status: 429 }
      );
    }

    // ── Parse request (multipart or JSON) ─────────────────────────────────
    const contentType = req.headers.get('content-type') ?? '';
    let documentText = '';
    let originalName = 'manual_text';
    let mimeType = 'text/plain';
    let sizeBytes = 0;
    let pageCount: number | undefined;
    let extractionMethod = 'plaintext';

    let requestedCount = 30;
    let cefr = 'B2';
    let includePhrases = false;
    let includeIdeas = false;

    if (contentType.includes('multipart/form-data')) {
      // ── File upload ────────────────────────────────────────────────────
      const form = await req.formData();
      const file = form.get('file') as File | null;
      requestedCount = parseInt(String(form.get('requestedCount') ?? '30'));
      cefr           = String(form.get('cefr') ?? 'B2');
      includePhrases = form.get('includePhrases') === 'true';
      includeIdeas   = form.get('includeIdeas')   === 'true';

      if (!file) {
        return NextResponse.json({ error: 'Fayl tanlanmagan' }, { status: 400 });
      }

      mimeType  = file.type || 'application/octet-stream';
      sizeBytes = file.size;
      originalName = file.name;

      // Validate
      const validation = validateFile(mimeType, sizeBytes, originalName);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Extract text
      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const extracted = await extractTextFromBuffer(buffer, mimeType, file.name);

      documentText    = extracted.text;
      pageCount       = extracted.pageCount;
      extractionMethod = extracted.method;

      if (!documentText.trim()) {
        return NextResponse.json(
          { error: 'Fayldan matn ajratib bo\'lmadi. Fayl bo\'sh yoki o\'qib bo\'lmaydigan formatda.' },
          { status: 422 }
        );
      }
    } else {
      // ── Raw text ───────────────────────────────────────────────────────
      const body = await req.json();
      documentText   = String(body.text ?? '').trim();
      requestedCount = parseInt(String(body.requestedCount ?? '30'));
      cefr           = String(body.cefr ?? 'B2');
      includePhrases = Boolean(body.includePhrases);
      includeIdeas   = Boolean(body.includeIdeas);

      if (!documentText) {
        return NextResponse.json({ error: 'Matn kiritilmagan' }, { status: 400 });
      }
      sizeBytes = Buffer.byteLength(documentText, 'utf8');
    }

    // ── Validate settings ─────────────────────────────────────────────────
    const VALID_CEFR = ['A1','A2','B1','B2','C1','C2','Mixed','Any'];
    if (!VALID_CEFR.includes(cefr)) cefr = 'B2';
    if (requestedCount < 5)   requestedCount = 10;
    if (requestedCount > 200) requestedCount = 100;

    // ── Create session record ─────────────────────────────────────────────
    const session = await AIExtractionSession.create({
      userId:   user.id,
      userRole: user.role,
      status:   'processing',
      settings: { requestedCount, cefr, includePhrases, includeIdeas, mode: 'reading' },
      sourceDocument: {
        originalName,
        mimeType,
        sizeBytes,
        pageCount,
        extractionMethod,
      },
    });

    // ── Run AI extraction ─────────────────────────────────────────────────
    let result;
    try {
      result = await extractVocabularyFromDocument(documentText, {
        requestedCount,
        cefr: cefr as any,
        includePhrases,
        includeIdeas,
        mode: 'reading',
      });
    } catch (aiErr: any) {
      console.error('❌ AI Extraction Error:', aiErr?.message || aiErr);
      await AIExtractionSession.findByIdAndUpdate(session._id, {
        status: 'failed',
        error: aiErr?.message ?? 'AI xatoligi',
        processingMs: Date.now() - startMs,
      });
      return NextResponse.json(
        { error: aiErr?.message || 'AI tahlil muvaffaqiyatsiz bo\'ldi. Iltimos, qayta urinib ko\'ring.', sessionId: String(session._id) },
        { status: 502 }
      );
    }

    const processingMs = Date.now() - startMs;

    // ── Update session with results ───────────────────────────────────────
    await AIExtractionSession.findByIdAndUpdate(session._id, {
      status: 'done',
      result: {
        vocabulary: result.vocabulary,
        phrases:    result.phrases,
        ideas:      result.ideas,
        totalFound: result.metadata.totalFound,
        message:    result.metadata.message,
      },
      processingMs,
      tokensUsed: result.metadata.tokensUsed,
    });

    return NextResponse.json({
      sessionId:  String(session._id),
      vocabulary: result.vocabulary,
      phrases:    result.phrases,
      ideas:      result.ideas,
      metadata: {
        totalFound:   result.metadata.totalFound,
        message:      result.metadata.message,
        processingMs,
        sourceDocument: {
          originalName,
          mimeType,
          sizeBytes,
          pageCount,
          extractionMethod,
        },
      },
    });

  } catch (error: any) {
    console.error('AI Reading extract error:', error);
    return NextResponse.json({ error: error.message || 'Serverda xatolik' }, { status: 500 });
  }
}
