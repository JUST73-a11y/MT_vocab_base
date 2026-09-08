import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import Word from '@/models/Word';

export const dynamic = 'force-dynamic';

async function verifyOwnership(unitId: string, studentId: string) {
  const unit = await Unit.findById(unitId).lean() as any;
  if (!unit) return { error: 'Unit topilmadi', status: 404 };
  if (unit.ownerType !== 'STUDENT' || unit.ownerId?.toString() !== studentId) {
    return { error: 'Bu unit sizga tegishli emas', status: 403 };
  }
  return { unit };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user || user.role !== 'student') return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
    await dbConnect();
    const check = await verifyOwnership(id, user.id);
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
    const words = await Word.find({ unitId: id }).lean();
    return NextResponse.json({ unit: check.unit, words });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user || user.role !== 'student') return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
    await dbConnect();
    const check = await verifyOwnership(id, user.id);
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
    const { name } = await req.json();
    const title = String(name ?? '').trim().slice(0, 100);
    if (!title) return NextResponse.json({ error: 'Nom kerak' }, { status: 400 });
    const updated = await Unit.findByIdAndUpdate(id, { title }, { new: true }).lean();
    return NextResponse.json({ unit: updated });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getServerSession();
    if (!user || user.role !== 'student') return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
    await dbConnect();
    const check = await verifyOwnership(id, user.id);
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status });
    const wordDeleteResult = await Word.deleteMany({ unitId: id });
    await Unit.findByIdAndDelete(id);
    return NextResponse.json({ deleted: true, wordsDeleted: wordDeleteResult.deletedCount });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}