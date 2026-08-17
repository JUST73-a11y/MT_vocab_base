import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import ShopItem from '@/models/ShopItem';
import mongoose from 'mongoose';

const ALLOWED_TYPES = ['THEME_CREATOR_ACCESS', 'SMART_CARD', 'DOLLAR_CARD', 'ENERGY_STACK', 'CUSTOM'];
const ALLOWED_EFFECT_TYPES = ['ENERGY_BONUS', 'XP_BONUS', 'COIN_BONUS', 'EXTRA_ATTEMPT', 'CUSTOM_PRIVILEGE'];

function validateEffect(effect: any): boolean {
    if (!effect) return true;
    if (!ALLOWED_EFFECT_TYPES.includes(effect.type)) return false;
    if (effect.amount !== undefined && typeof effect.amount !== 'number') return false;
    return true;
}

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    await dbConnect();
    const items = await ShopItem.find({ teacherId: new mongoose.Types.ObjectId(session.id) })
        .sort({ createdAt: -1 })
        .lean();
    return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid JSON' }, { status: 400 });
    }

    const { name, description, imageUrl, type, price, isUnlimitedStock, stock, requiresApproval, visibilityType, groupIds, studentIds, effect, metadata } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Name is required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(type)) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid item type' }, { status: 400 });
    }
    if (typeof price !== 'number' || price < 0) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Price must be a non-negative number' }, { status: 400 });
    }
    if (effect && !validateEffect(effect)) {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Invalid effect configuration' }, { status: 400 });
    }

    // Force 48h duration for THEME_CREATOR_ACCESS
    const safeMetadata = type === 'THEME_CREATOR_ACCESS'
        ? { ...((metadata && typeof metadata === 'object') ? metadata : {}), durationHours: 48 }
        : (metadata && typeof metadata === 'object') ? metadata : {};

    await dbConnect();
    const item = await ShopItem.create({
        teacherId: new mongoose.Types.ObjectId(session.id),
        name: name.trim().slice(0, 100),
        description: (description || '').slice(0, 500),
        imageUrl: imageUrl || null,
        type,
        price,
        isUnlimitedStock: isUnlimitedStock !== false,
        stock: isUnlimitedStock !== false ? 0 : (Number(stock) || 0),
        requiresApproval: !!requiresApproval,
        visibilityType: ['ALL', 'GROUP', 'STUDENT'].includes(visibilityType) ? visibilityType : 'ALL',
        groupIds: Array.isArray(groupIds) ? groupIds : [],
        studentIds: Array.isArray(studentIds) ? studentIds : [],
        effect: effect || null,
        metadata: safeMetadata,
    });

    return NextResponse.json({ item }, { status: 201 });
}