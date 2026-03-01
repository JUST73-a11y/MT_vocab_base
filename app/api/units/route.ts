import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';
import StudentUnitAccess from '@/models/StudentUnitAccess';
import GroupMember from '@/models/GroupMember';
import GroupUnitAccess from '@/models/GroupUnitAccess';
import { cache } from '@/lib/cache';

const UNITS_TTL = 15_000; // 15 seconds

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId');
        const category = searchParams.get('category');

        await dbConnect();

        let query: any = {};

        if (user.role === 'student') {
            // Run student access queries in parallel
            const [directAccess, myGroups] = await Promise.all([
                StudentUnitAccess.find({ studentId: user.id }).select('unitId').lean(),
                GroupMember.find({ studentId: user.id }).select('groupId').lean(),
            ]);

            const groupIds = myGroups.map((gm: any) => gm.groupId);
            const groupAccess = groupIds.length > 0
                ? await GroupUnitAccess.find({ groupId: { $in: groupIds } }).select('unitId').lean()
                : [];

            const directIds = directAccess.map((da: any) => da.unitId.toString());
            const groupIds2 = groupAccess.map((ga: any) => ga.unitId.toString());
            const authorizedUnitIds = Array.from(new Set([...directIds, ...groupIds2]));
            query._id = { $in: authorizedUnitIds };
        } else {
            if (user.role === 'teacher') {
                query.createdBy = user.id;
            } else if (user.role === 'admin' && teacherId) {
                query.createdBy = teacherId;
            }
        }

        if (category) query.category = category;

        // Build cache key (admin with no teacherId = all units = no cache)
        const cacheKey = user.role === 'admin' && !teacherId
            ? null
            : `units:${user.role === 'teacher' ? user.id : teacherId ?? user.id}:${category ?? ''}`;

        if (cacheKey) {
            const cached = cache.get<any[]>(cacheKey);
            if (cached) return NextResponse.json(cached);
        }

        // For teacher/list: select only fields needed by the frontend, skip populate
        const needsCreatorInfo = user.role === 'admin'; // Admin Units tab shows creator name
        let unitsQuery = Unit.find(query)
            .select('title category categoryId customTimer createdAt createdBy')
            .sort({ createdAt: -1 })
            .lean();

        if (needsCreatorInfo) {
            // Admin: fetch with populate for creator display
            const units = await Unit.find(query)
                .populate('createdBy', 'name email')
                .select('title category categoryId customTimer createdAt createdBy')
                .sort({ createdAt: -1 });

            const mapped = units.map((unit: any) => {
                const u = unit.toObject ? unit.toObject() : unit;
                return { ...u, _id: u._id?.toString(), category: u.category || 'Uncategorized', categoryId: u.categoryId?.toString() ?? null };
            });

            return NextResponse.json(mapped);
        }

        // Teacher / student: lean query, no populate
        const units: any[] = await unitsQuery;
        const mapped = units.map((u: any) => ({
            ...u,
            id: u._id?.toString(),
            _id: u._id?.toString(),
            createdBy: u.createdBy?.toString(),
            category: u.category || 'Uncategorized',
            categoryId: u.categoryId?.toString() ?? null,
        }));

        if (cacheKey) cache.set(cacheKey, mapped, UNITS_TTL);
        return NextResponse.json(mapped);

    } catch (error) {
        console.error('[API GET UNITS] Error:', error);
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
        console.error('[API POST UNITS] Error creating unit:', error);
        return NextResponse.json({ message: error.message || 'Error creating unit' }, { status: 500 });
    }
}
