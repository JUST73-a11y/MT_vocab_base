/**
 * GET/POST /api/student/personal-units
 *
 * Student personal vocabulary units management.
 * Maximum MAX_PERSONAL_UNITS_PER_STUDENT units per student (default 10).
 * Limit enforced SERVER-SIDE — client cannot bypass.
 *
 * Student personal units are PRIVATE by default.
 * Students can only see/edit their own units.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import Word from '@/models/Word';

export const dynamic = 'force-dynamic';

const MAX_PERSONAL_UNITS = parseInt(process.env.MAX_PERSONAL_UNITS_PER_STUDENT ?? '10');

export async function GET(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    await dbConnect();

    const units = await Unit.find({
      ownerType: 'STUDENT',
      ownerId: user.id,
      unitType: 'personal',
    }).sort({ createdAt: -1 }).lean();

    // Attach word counts
    const unitIdStrings = units.map((u: any) => u._id.toString());
    const wordCounts = await Word.aggregate([
      { $match: { unitId: { $in: unitIdStrings } } },
      { $group: { _id: '$unitId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(wordCounts.map((w: any) => [w._id.toString(), w.count]));

    const result = units.map((u: any) => ({
      _id:       u._id,
      title:     u.title,
      category:  u.category || 'Shaxsiy',
      createdAt: u.createdAt,
      wordCount: countMap.get(u._id.toString()) ?? 0,
    }));

    return NextResponse.json({
      units: result,
      total: result.length,
      limit: MAX_PERSONAL_UNITS,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Xatolik' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
    }

    const { name, category } = await req.json();
    const title = String(name ?? '').trim().slice(0, 100);
    const unitCategory = String(category ?? 'Shaxsiy').trim().slice(0, 50) || 'Shaxsiy';

    if (!title) {
      return NextResponse.json({ error: 'Unit nomi kerak' }, { status: 400 });
    }

    await dbConnect();

    // ENFORCE 10-unit server-side limit
    const existingCount = await Unit.countDocuments({
      ownerType: 'STUDENT',
      ownerId: user.id,
      unitType: 'personal',
    });

    if (existingCount >= MAX_PERSONAL_UNITS) {
      return NextResponse.json(
        {
          error: `Shaxsiy unitlar chegarasiga yetdingiz (${MAX_PERSONAL_UNITS} ta).`,
          code: 'PERSONAL_UNIT_LIMIT_REACHED',
          limit: MAX_PERSONAL_UNITS,
          current: existingCount,
        },
        { status: 409 }
      );
    }

    const unit = await Unit.create({
      title,
      createdBy:  user.id,  // required field on base schema
      ownerType:  'STUDENT',
      ownerId:    user.id,
      unitType:   'personal',
      visibility: 'PRIVATE',
      category:   unitCategory,
    });

    // ── Atomic Race-Condition Guard ──────────────────────────────────────────
    // In case two requests arrive concurrently, check total count post-insert.
    // If it exceeds limit, immediately rollback and delete the overflow unit.
    const countAfter = await Unit.countDocuments({
      ownerType: 'STUDENT',
      ownerId: user.id,
      unitType: 'personal',
    });

    if (countAfter > MAX_PERSONAL_UNITS) {
      await Unit.findByIdAndDelete(unit._id);
      return NextResponse.json(
        {
          error: `Shaxsiy unitlar chegarasiga yetdingiz (${MAX_PERSONAL_UNITS} ta).`,
          code: 'PERSONAL_UNIT_LIMIT_REACHED',
          limit: MAX_PERSONAL_UNITS,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      unit: {
        _id:       unit._id,
        title:     unit.title,
        category:  unit.category,
        createdAt: unit.createdAt,
        wordCount: 0,
      },
      current: countAfter,
      limit:   MAX_PERSONAL_UNITS,
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Xatolik' }, { status: 500 });
  }
}
