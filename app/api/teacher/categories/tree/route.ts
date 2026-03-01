import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Category from '@/models/Category';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';
import { cache } from '@/lib/cache';

const TREE_TTL = 30_000; // 30 seconds

export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const includeCounts = searchParams.get('includeCounts') === 'true';

        let teacherIdForCategories = session.id;

        if (session.role === 'student') {
            // Cache the student → teacherId lookup (60s)
            const cacheKey = `studentTeacher:${session.id}`;
            let cachedTeacherId = cache.get<string>(cacheKey);

            if (!cachedTeacherId) {
                const studentUser = await User.findById(session.id).select('teacherId').lean();
                if (!studentUser || !(studentUser as any).teacherId) {
                    return NextResponse.json([]);
                }
                cachedTeacherId = (studentUser as any).teacherId.toString();
                cache.set(cacheKey, cachedTeacherId, 60_000);
            }
            teacherIdForCategories = cachedTeacherId;
        } else if (session.role !== 'teacher' && session.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        // Check cache
        const cacheKey = `categoryTree:${teacherIdForCategories}:${includeCounts}`;
        const cached = cache.get<any[]>(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Fetch categories (only needed fields)
        const categories = await Category.find({ teacherId: teacherIdForCategories })
            .select('name parentId path')
            .lean();

        // If includeCounts requested, get unit counts per category in ONE aggregation
        let unitCountMap: Map<string, number> = new Map();
        if (includeCounts && categories.length > 0) {
            const catIds = categories.map((c: any) => c._id);
            const counts = await Unit.aggregate([
                { $match: { categoryId: { $in: catIds } } },
                { $group: { _id: '$categoryId', count: { $sum: 1 } } }
            ]);
            counts.forEach((c: any) => {
                unitCountMap.set(c._id.toString(), c.count);
            });
        }

        // Build tree in memory (O(n))
        const categoryMap = new Map<string, any>();
        const tree: any[] = [];

        categories.forEach((cat: any) => {
            const catId = cat._id.toString();
            categoryMap.set(catId, {
                _id: catId,
                name: cat.name,
                parentId: cat.parentId,
                path: cat.path,
                unitCount: unitCountMap.get(catId) ?? 0,
                children: [],
            });
        });

        categories.forEach((cat: any) => {
            const catId = cat._id.toString();
            const node = categoryMap.get(catId)!;
            if (cat.parentId) {
                const parentId = cat.parentId.toString();
                const parent = categoryMap.get(parentId);
                if (parent) {
                    parent.children.push(node);
                } else {
                    tree.push(node);
                }
            } else {
                tree.push(node);
            }
        });

        // Cache and return
        cache.set(cacheKey, tree, TREE_TTL);
        return NextResponse.json(tree);

    } catch (error: any) {
        console.error('Error fetching category tree:', error);
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}
