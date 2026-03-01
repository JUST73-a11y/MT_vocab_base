import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import StudentUnitAccess from '@/models/StudentUnitAccess';
import { getServerSession } from '@/lib/serverAuth';

/**
 * GET: Get units a student has direct access to
 * POST: Set units a student has direct access to (replaces all)
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;
        const access = await StudentUnitAccess.find({ studentId: id });
        const unitIds = access.map(a => a.unitId);

        return NextResponse.json({ unitIds });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching access' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { unitIds } = await req.json(); // Array of unit IDs
        if (!Array.isArray(unitIds)) {
            return NextResponse.json({ message: 'Invalid unitIds format' }, { status: 400 });
        }

        await dbConnect();
        const { id } = await params;

        // Sync logic
        // 1. O'chirilishi kerak bo'lganlarni o'chirish
        await StudentUnitAccess.deleteMany({
            studentId: id,
            unitId: { $nin: unitIds }
        });

        // 2. Qaysilari allaqachon borligini aniqlash
        const existingAccess = await StudentUnitAccess.find({ studentId: id }).select('unitId');
        const existingIds = existingAccess.map(a => a.unitId.toString());

        // 3. Yangilarini qo'shish
        const newIds = unitIds.filter((id: string) => !existingIds.includes(id));
        const newAccessDocs = newIds.map((unitId: string) => ({
            studentId: id,
            unitId,
            grantedByTeacherId: teacher.id
        }));

        if (newAccessDocs.length > 0) {
            await StudentUnitAccess.insertMany(newAccessDocs);
        }

        const removedIds = existingIds.filter(id => !unitIds.includes(id));

        return NextResponse.json({
            message: 'Access updated successfully',
            addedUnitIds: newIds,
            removedUnitIds: removedIds,
            currentUnitIds: unitIds
        });
    } catch (error) {
        console.error('[STUDENT ACCESS POST] Error:', error);
        return NextResponse.json({ message: 'Error updating access' }, { status: 500 });
    }
}
