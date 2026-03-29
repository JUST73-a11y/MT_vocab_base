import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import UnitShare from '@/models/UnitShare';
import Category from '@/models/Category';
import mongoose from 'mongoose';
import { getServerSession } from '@/lib/serverAuth';
import { cache } from '@/lib/cache';

/**
 * POST: Ommaviy (Bulk) unitlarni o'chirish.
 * - O'z unitlari: Butunlay DB dan (Unit va Word) o'chadi.
 * - Qabul qilingan (shared) unitlar: DB dan o'chmaydi bevosita o'sha o'qituvchi uchun "qabul qilingan" holati bekor qilinadi (UnitShare o'chiriladi/REJECTED bo'ladi).
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { unitIds = [], categoryName, cascade = false } = await req.json();
        const allUnitIds = [...unitIds];
        
        await dbConnect();

        const teacherId = new mongoose.Types.ObjectId(teacher.id);

        // 1. If categoryName is provided and cascade is true, find all units in that category
        if (categoryName && cascade) {
            const catQuery: any = { createdBy: teacherId, category: categoryName };
            const catUnits = await Unit.find(catQuery).select('_id').lean();
            console.log(`[BULK-DELETE] Found ${catUnits.length} units in category "${categoryName}" for cascading delete.`);
            catUnits.forEach((u: any) => allUnitIds.push(u._id.toString()));
        }

        const validUnitIds = Array.from(new Set(allUnitIds))
            .filter((id: any) => id && mongoose.Types.ObjectId.isValid(id.toString()))
            .map((id: any) => new mongoose.Types.ObjectId(id.toString()));

        // If no units to delete and no category to cleanup, return 400
        if (validUnitIds.length === 0 && !categoryName) {
            return NextResponse.json({ message: 'Unitlar topilmadi' }, { status: 400 });
        }

        let deletedOwnedCount = 0;
        let removedSharedCount = 0;
        let deletedCategoryCount = 0;

        // 2. Find all units to distinguish owned from shared
        const unitsFound = await Unit.find({ _id: { $in: validUnitIds } }).select('_id createdBy').lean();
        const ownedUnitIds = unitsFound
            .filter((u: any) => u.createdBy.toString() === teacher.id)
            .map((u: any) => u._id);
        
        const ownedIdStrings = new Set(ownedUnitIds.map((id: any) => id.toString()));
        const otherUnitIds = validUnitIds.filter(id => !ownedIdStrings.has(id.toString()));

        console.log(`[BULK-DELETE] Processing: ${ownedUnitIds.length} owned, ${otherUnitIds.length} shared.`);

        // 3. Bulk Delete Owned Units and ALL their associated data
        if (ownedUnitIds.length > 0) {
            const [wordRes, unitRes, shareRes] = await Promise.all([
                Word.deleteMany({ unitId: { $in: ownedUnitIds } }),
                Unit.deleteMany({ _id: { $in: ownedUnitIds } }),
                // Purge ALL shares of these units (sent to anyone)
                UnitShare.deleteMany({ unitId: { $in: ownedUnitIds } })
            ]);
            deletedOwnedCount = unitRes.deletedCount;
            console.log(`[BULK-DELETE] Owned cleanup: ${unitRes.deletedCount} units, ${wordRes.deletedCount} words, ${shareRes.deletedCount} shares.`);
        }

        // 4. Bulk Delete shares for units shared TO me (recipient side)
        if (otherUnitIds.length > 0) {
            const shareRes = await UnitShare.deleteMany({ 
                unitId: { $in: otherUnitIds }, 
                toTeacherId: teacherId 
            });
            removedSharedCount = shareRes.deletedCount;
            console.log(`[BULK-DELETE] Shared units removed: ${shareRes.deletedCount}`);
        }

        // --- Kategoriyalarni tozalash (Optimized Category Cleanup) ---
        try {
            const allCats = await Category.find({ teacherId: teacher.id }).lean();
            if (allCats.length > 0) {
                const catIds = allCats.map(c => c._id);
                
                // 1. Qaysi kategoriyalar bandligini (unitlar yoki sharelar borligini) bir marta aniqlaymiz
                const [occupiedByUnits, occupiedByShares] = await Promise.all([
                    Unit.distinct('categoryId', { categoryId: { $in: catIds } }),
                    UnitShare.distinct('targetCategoryId', { 
                        targetCategoryId: { $in: catIds }, 
                        toTeacherId: teacher.id,
                        status: 'ACCEPTED'
                    })
                ]);

                const occupiedSet = new Set([
                    ...occupiedByUnits.map(id => id?.toString()),
                    ...occupiedByShares.map(id => id?.toString())
                ]);

                // 2. Barglardan (leaf) boshlab tepaga qarab tekshiramiz
                // 2. Identify categories to delete (empty branches)
                const sortedCats = [...allCats].sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0));
                const idsToDelete = new Set<string>();

                for (const cat of sortedCats) {
                    const catId = cat._id.toString();
                    if (occupiedSet.has(catId)) continue;

                    const hasActiveChildren = allCats.some(c => 
                        c.parentId?.toString() === catId && !idsToDelete.has(c._id.toString())
                    );
                    
                    if (!hasActiveChildren) {
                        idsToDelete.add(catId);
                    }
                }

                if (idsToDelete.size > 0) {
                    const catRes = await Category.deleteMany({ _id: { $in: Array.from(idsToDelete).map(id => new mongoose.Types.ObjectId(id)) } });
                    deletedCategoryCount = catRes.deletedCount;
                    console.log(`[BULK-DELETE] Categories cleanup: ${catRes.deletedCount} removed.`);
                }
            }
        } catch (catErr) {
            console.error('[CLEANUP ERROR] Categories cleanup failed:', catErr);
        }

        // Keshni tozalash (yangi list va tree dashboardda muammosiz ko'rinishi uchun)
        cache.delByPrefix(`units:${teacher.id}`);
        cache.delByPrefix(`categoryTree:${teacher.id}`);

        return NextResponse.json({ 
            message: 'O\'chirish muvaffaqiyatli', 
            deletedUnits: deletedOwnedCount, 
            removedShared: removedSharedCount,
            deletedCategories: deletedCategoryCount
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Error executing bulk delete' }, { status: 500 });
    }
}
