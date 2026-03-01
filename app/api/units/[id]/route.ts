import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';
import { cache } from '@/lib/cache';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        await dbConnect();
        const unit = await Unit.findById(id);

        if (!unit) {
            return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
        }

        return NextResponse.json(unit);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching unit' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        console.log(`[API DELETE] Attempting delete for id: ${id} by user: ${user.email} (role: ${user.role})`);

        await dbConnect();

        if (user.role === 'teacher') {
            const unitExists = await Unit.exists({ _id: id, createdBy: user.id });
            if (!unitExists) {
                console.log(`[API DELETE] Unit not found or not owned by teacher: ${id}`);
                return NextResponse.json({ message: 'Unit not found or access denied' }, { status: 403 });
            }
        }

        // Hard delete: remove words and unit completely from DB
        await Word.deleteMany({ unitId: id });
        const deletedUnit = await Unit.findByIdAndDelete(id);

        if (!deletedUnit) {
            console.log(`[API DELETE] Delete failed: Unit not found: ${id}`);
            return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
        }

        console.log(`[API DELETE] Hard-delete successful for: ${deletedUnit.title} by ${user.role}`);

        // Invalidate server cache so next fetch returns fresh data
        const ownerId = deletedUnit.createdBy?.toString();
        if (ownerId) {
            cache.delByPrefix(`units:${ownerId}`);
            cache.delByPrefix(`categoryTree:${ownerId}`);
        }

        return NextResponse.json({ message: 'Unit and associated words permanently deleted' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting unit' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const { title, category, customTimer } = await req.json();
        await dbConnect();

        const updates: any = {
            title,
            category: category || 'Uncategorized'
        };
        // Allow setting customTimer to a number or null (to clear it)
        if (customTimer !== undefined) {
            updates.customTimer = customTimer;
        }

        const unit = await Unit.findByIdAndUpdate(id, updates, { returnDocument: 'after' });

        if (!unit) {
            return NextResponse.json({ message: 'Unit not found' }, { status: 404 });
        }

        // Invalidate cache so list reflects the update
        const ownerId = unit.createdBy?.toString();
        if (ownerId) cache.delByPrefix(`units:${ownerId}`);

        return NextResponse.json(unit);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating unit' }, { status: 500 });
    }
}
