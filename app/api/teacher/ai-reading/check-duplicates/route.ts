/**
 * POST /api/teacher/ai-reading/check-duplicates
 * Pre-import duplicate detection for AI-extracted vocabulary.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import Unit from '@/models/Unit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const { unitId, words } = await req.json();
    if (!unitId || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'unitId va words[] kerak' }, { status: 400 });
    }

    await dbConnect();

    // Verify unit ownership
    const unit = await Unit.findById(unitId).lean() as any;
    if (!unit) return NextResponse.json({ error: 'Unit topilmadi' }, { status: 404 });
    if (user.role !== 'admin' && unit.createdBy?.toString() !== user.id) {
      return NextResponse.json({ error: 'Bu unit sizga tegishli emas' }, { status: 403 });
    }

    function normalizeForDedup(w: string): string[] {
      const clean = String(w || '').toLowerCase().trim().replace(/[^a-z0-9\s'-]/g, '');
      const variants = [clean];
      // Plural handling
      if (clean.endsWith('ies') && clean.length > 4) variants.push(clean.slice(0, -3) + 'y');
      else if (clean.endsWith('es') && clean.length > 3) variants.push(clean.slice(0, -2));
      else if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 2) variants.push(clean.slice(0, -1));
      return variants;
    }

    const existing = await Word.find({ unitId }).select('englishWord').lean() as any[];
    const existingSet = new Set<string>();
    for (const w of existing) {
      for (const variant of normalizeForDedup(w.englishWord)) {
        existingSet.add(variant);
      }
    }

    const duplicates: string[] = [];
    const clean: string[] = [];

    for (const w of words) {
      const variants = normalizeForDedup(w);
      const isDup = variants.some(v => existingSet.has(v));
      if (isDup) {
        duplicates.push(w);
      } else {
        clean.push(w);
      }
    }

    return NextResponse.json({ duplicates, clean });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Xatolik' }, { status: 500 });
  }
}
