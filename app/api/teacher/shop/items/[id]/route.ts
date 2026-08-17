import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import ShopItem from '@/models/ShopItem';
import mongoose from 'mongoose';

async function getOwnedItem(id: string, teacherId: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const item = await ShopItem.findById(id);
    if (!item || item.teacherId.toString() !== teacherId) return null;
    return item;
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await context.params;
    await dbConnect();
    const item = await getOwnedItem(id, session.id);
    if (!item) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await context.params;
    await dbConnect();
    const item = await getOwnedItem(id, session.id);
    if (!item) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 }); }

    const updatable = ['name', 'description', 'imageUrl', 'price', 'isUnlimitedStock', 'stock', 'isActive', 'requiresApproval', 'visibilityType', 'groupIds', 'studentIds', 'effect', 'metadata'];
    for (const key of updatable) {
        if (body[key] !== undefined) {
            if (key === 'price' && (typeof body.price !== 'number' || body.price < 0)) continue;
            if (key === 'name') { (item as any).name = String(body.name).trim().slice(0, 100); continue; }
            if (key === 'description') { (item as any).description = String(body.description || '').slice(0, 500); continue; }
            (item as any)[key] = body[key];
        }
    }
    // THEME_CREATOR_ACCESS always stays 48h
    if (item.type === 'THEME_CREATOR_ACCESS') {
        (item as any).metadata = { ...((item as any).metadata || {}), durationHours: 48 };
    }
    await item.save();
    return NextResponse.json({ item });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    const { id } = await context.params;
    await dbConnect();
    const item = await getOwnedItem(id, session.id);
    if (!item) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
    // Soft delete — preserve purchase history
    (item as any).isActive = false;
    await item.save();
    return NextResponse.json({ success: true });
}