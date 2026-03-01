import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GroupUnitAccess from '@/models/GroupUnitAccess';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { id } = await params;
        const access = await GroupUnitAccess.find({ groupId: id });
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
        await GroupUnitAccess.deleteMany({
            groupId: id,
            unitId: { $nin: unitIds }
        });

        const existingAccess = await GroupUnitAccess.find({ groupId: id }).select('unitId');
        const existingIds = existingAccess.map(a => a.unitId.toString());

        const newIds = unitIds.filter((idVal: string) => !existingIds.includes(idVal));
        const newAccessDocs = newIds.map((unitId: string) => ({
            groupId: id,
            unitId,
            grantedByTeacherId: teacher.id
        }));

        if (newAccessDocs.length > 0) {
            await GroupUnitAccess.insertMany(newAccessDocs);
        }

        const removedIds = existingIds.filter(id => !unitIds.includes(id));

        return NextResponse.json({
            message: 'Group access updated successfully',
            addedUnitIds: newIds,
            removedUnitIds: removedIds,
            currentUnitIds: unitIds
        });
    } catch (error) {
        console.error('[GROUP ACCESS POST] Error:', error);
        return NextResponse.json({ message: 'Error updating group access' }, { status: 500 });
    }
}
