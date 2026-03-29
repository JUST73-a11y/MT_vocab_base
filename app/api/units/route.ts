import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';
import StudentUnitAccess from '@/models/StudentUnitAccess';
import GroupMember from '@/models/GroupMember';
import GroupUnitAccess from '@/models/GroupUnitAccess';
import { cache } from '@/lib/cache';
import mongoose from 'mongoose';

const UNITS_TTL = 15_000; // 15 seconds

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId');
        const category = searchParams.get('category');

        await dbConnect();

        // Build cache key early (admin with no teacherId = all units = no cache)
        const cacheKey = user.role === 'admin' && !teacherId
            ? null
            : `units:${user.role === 'teacher' ? user.id : teacherId ?? user.id}:${category ?? ''}`;

        if (cacheKey) {
            const cached = cache.get<any[]>(cacheKey);
            if (cached) return NextResponse.json(cached);
        }

        let query: any = {};

        if (user.role === 'student') {
            const [directAccess, myGroups] = await Promise.all([
                StudentUnitAccess.find({ studentId: user.id }).select('unitId').lean(),
                GroupMember.find({ studentId: user.id }).select('groupId').lean(),
            ]);

            const groupIds = myGroups.map((gm: any) => gm.groupId);
            const groupAccess = groupIds.length > 0
                ? await GroupUnitAccess.find({ groupId: { $in: groupIds } }).select('unitId').lean()
                : [];

            const authorizedUnitIds = Array.from(new Set([
                ...directAccess.map((da: any) => da.unitId.toString()),
                ...groupAccess.map((ga: any) => ga.unitId.toString())
            ]));
            query._id = { $in: authorizedUnitIds };
        } else if (user.role === 'teacher' || (user.role === 'admin' && !teacherId)) {
            const filterUserId = user.id;
            
            // 1. Get all ACCEPTED shares for this teacher to find shared unit IDs
            const sharedEntries = await (await import('@/models/UnitShare')).default.find({ 
                toTeacherId: filterUserId, 
                status: 'ACCEPTED' 
            }).select('unitId targetCategoryId').lean();

            const sharedUnitIds = sharedEntries.map((s: any) => s.unitId);
            const sharedIdMap = new Map(sharedEntries.map((s: any) => [s.unitId.toString(), s.targetCategoryId?.toString()]));

            // 2. Perform a SINGLE efficient query for owned OR shared units
            query = {
                $or: [
                    { createdBy: filterUserId },
                    { _id: { $in: sharedUnitIds } }
                ]
            };

            if (category) query.category = category;

            const rawUnits = await Unit.find(query)
                .select('title category categoryId customTimer createdAt createdBy')
                .populate('createdBy', 'name email status') // populate creator info
                .sort({ createdAt: -1 })
                .lean();

            const mapped = rawUnits.map((u: any) => {
                const unitId = u._id?.toString() || u.id;
                const sharedCatId = sharedIdMap.get(unitId);
                const creator = u.createdBy;
                
                return {
                    ...u,
                    id: unitId,
                    _id: unitId,
                    createdBy: creator?._id?.toString() || creator?.toString(),
                    creator: creator, // Full populated object
                    creatorName: creator?.name || (creator?._id?.toString() === user.id ? user.name : "Noma'lum"),
                    category: u.category || 'Uncategorized',
                    categoryId: (sharedCatId || u.categoryId?.toString()) ?? null,
                };
            });

            if (cacheKey) cache.set(cacheKey, mapped, UNITS_TTL);
            return NextResponse.json(mapped);
        }
 else if (user.role === 'admin' && teacherId) {
            query.createdBy = teacherId;
        }

        if (category && user.role !== 'teacher') query.category = category;

        const rawUnits = await Unit.find(query)
            .populate({ path: 'createdBy', select: 'name email' })
            .select('title category categoryId customTimer createdAt createdBy')
            .sort({ createdAt: -1 })
            .lean();

        const mapped = rawUnits.map((u: any) => ({
            ...u,
            id: u._id?.toString(),
            _id: u._id?.toString(),
            createdBy: u.createdBy?._id?.toString() || u.createdBy?.toString(),
            creator: u.createdBy,
            creatorName: u.createdBy?.name,
            category: u.category || 'Uncategorized',
            categoryId: u.categoryId?.toString() ?? null,
        }));

        if (cacheKey) cache.set(cacheKey, mapped, UNITS_TTL);
        return NextResponse.json(mapped);

    } catch (error) {
        
        return NextResponse.json({ message: 'Error fetching units' }, { status: 500 });
    }
}



export async function POST(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { title, createdBy, category, categoryId, customTimer } = await req.json();

        if (!title || !createdBy || (!category && !categoryId)) {
            return NextResponse.json({ message: 'Title, Category and User ID are required' }, { status: 400 });
        }

        const isValidObjectId = (id: any) => /^[0-9a-fA-F]{24}$/.test(id);
        const finalCategoryId = (categoryId && isValidObjectId(categoryId)) ? categoryId : undefined;

        await dbConnect();

        const newUnit = await Unit.create({
            title,
            createdBy,
            category: category || 'Uncategorized',
            categoryId: finalCategoryId,
            customTimer: customTimer ? parseInt(customTimer) : undefined,
        });

        // Invalidate cache for this teacher
        cache.delByPrefix(`units:${createdBy}`);
        cache.delByPrefix(`categoryTree:${createdBy}`);

        return NextResponse.json(newUnit, { status: 201 });
    } catch (error: any) {
        
        return NextResponse.json({ message: error.message || 'Error creating unit' }, { status: 500 });
    }
}
