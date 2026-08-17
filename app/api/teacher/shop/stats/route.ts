import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import ShopPurchase from '@/models/ShopPurchase';
import ShopItem from '@/models/ShopItem';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'teacher') return NextResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 });
    await dbConnect();
    const teacherObjId = new mongoose.Types.ObjectId(session.id);

    const [totalPurchases, pendingCount, coinsAgg, popularAgg, activeItems] = await Promise.all([
        ShopPurchase.countDocuments({ teacherId: teacherObjId, status: { $in: ['COMPLETED', 'APPROVED'] } }),
        ShopPurchase.countDocuments({ teacherId: teacherObjId, status: 'PENDING' }),
        ShopPurchase.aggregate([
            { $match: { teacherId: teacherObjId, status: { $in: ['COMPLETED', 'APPROVED'] } } },
            { $group: { _id: null, total: { $sum: '$priceSnapshot' } } }
        ]),
        ShopPurchase.aggregate([
            { $match: { teacherId: teacherObjId } },
            { $group: { _id: '$itemNameSnapshot', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]),
        ShopItem.countDocuments({ teacherId: teacherObjId, isActive: true }),
    ]);

    return NextResponse.json({
        totalPurchases,
        pendingCount,
        totalCoinsSpent: coinsAgg[0]?.total || 0,
        mostPopularItem: popularAgg[0]?._id || null,
        activeItems,
    });
}