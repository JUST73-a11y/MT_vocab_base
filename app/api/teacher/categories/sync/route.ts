import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from '@/lib/serverAuth';
import { cache } from '@/lib/cache';

/**
 * POST /api/teacher/categories/sync
 * Body: { categories: string[] }
 * Purpose: Reconstruct missing Category records from Unit category strings.
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { categories } = await req.json();
        if (!categories || !Array.isArray(categories)) {
            return NextResponse.json({ message: 'Categories array is required' }, { status: 400 });
        }

        await dbConnect();

        const created = [];
        const existing = await Category.find({ 
            teacherId: session.id,
            parentId: null 
        }).select('name').lean();
        
        const existingNames = new Set(existing.map(c => c.name.toLowerCase().trim()));

        for (const catName of categories) {
            const cleanName = catName.trim();
            if (!cleanName || cleanName === 'Kategoriyasiz' || cleanName === 'uncategorized') continue;
            
            if (!existingNames.has(cleanName.toLowerCase())) {
                const newCat = await Category.create({
                    name: cleanName,
                    teacherId: session.id,
                    parentId: null,
                    path: cleanName
                });
                created.push(newCat);
                existingNames.add(cleanName.toLowerCase());
            }
        }

        cache.delByPrefix(`categoryTree:${session.id}`);

        return NextResponse.json({ 
            message: 'Sinxronizatsiya muvaffaqiyatli', 
            createdCount: created.length 
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}
