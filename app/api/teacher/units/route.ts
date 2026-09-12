import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import UnitShare from '@/models/UnitShare';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';
import { cache } from '@/lib/cache';

const UNITS_TTL = 15_000;

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');
        const filterUserId = user.id;

        await dbConnect();

        const cacheKey = `units:${filterUserId}:${category ?? ''}`;
        const cached = cache.get<any[]>(cacheKey);
        if (cached) return NextResponse.json(cached);

        // 1. Get all ACCEPTED shares for this teacher
        const sharedEntries = await UnitShare.find({
            toTeacherId: filterUserId,
            status: 'ACCEPTED',
        }).select('unitId targetCategoryId').lean();

        const sharedUnitIds = sharedEntries.map((s: any) => s.unitId);
        const sharedIdMap = new Map(sharedEntries.map((s: any) => [s.unitId.toString(), s.targetCategoryId?.toString()]));

        // 2. Query owned OR shared units
        const query: any = {
            $or: [
                { createdBy: filterUserId },
                { _id: { $in: sharedUnitIds } },
            ],
        };

        if (category) query.category = category;

        const rawUnits = await Unit.find(query)
            .select('title category categoryId customTimer createdAt createdBy')
            .populate('createdBy', 'name email status')
            .sort({ createdAt: -1 })
            .lean();

        const unitIds = rawUnits.map((u: any) => u._id);
        const wordCounts = await Word.aggregate([
            { $match: { unitId: { $in: unitIds } } },
            { $group: { _id: '$unitId', count: { $sum: 1 } } }
        ]);
        const wordCountMap = new Map(wordCounts.map((wc: any) => [wc._id.toString(), wc.count]));

        const mapped = rawUnits.map((u: any) => {
            const unitId = u._id?.toString() || u.id;
            const sharedCatId = sharedIdMap.get(unitId);
            const creator = u.createdBy;

            return {
                ...u,
                id: unitId,
                _id: unitId,
                createdBy: creator?._id?.toString() || creator?.toString(),
                creator: creator,
                creatorName: creator?.name || (creator?._id?.toString() === user.id ? user.name : "Noma'lum"),
                category: u.category || 'Uncategorized',
                categoryId: (sharedCatId || u.categoryId?.toString()) ?? null,
                wordCount: wordCountMap.get(unitId) || 0,
            };
        });

        cache.set(cacheKey, mapped, UNITS_TTL);
        return NextResponse.json(mapped);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Error fetching units' }, { status: 500 });
    }
}
