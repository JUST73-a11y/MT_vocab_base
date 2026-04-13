import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';
import { cache } from '@/lib/cache';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();

        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json({ message: 'Kategoriya topilmadi' }, { status: 404 });
        }
        if (category.teacherId.toString() !== session.id) {
            return NextResponse.json({ message: 'Ruxsat etilmagan' }, { status: 403 });
        }

        // Fetch all categories for this teacher to build the destruction tree locally 
        // to avoid complex db graph lookups
        const allCategories = await Category.find({ teacherId: session.id }).lean();

        const categoriesToDeleteIds: string[] = [id];

        // Recursively find all nested children categories
        const findChildren = (parentId: string) => {
            const children = allCategories.filter(cat => cat.parentId?.toString() === parentId);
            for (const child of children) {
                categoriesToDeleteIds.push(child._id.toString());
                findChildren(child._id.toString());
            }
        };
        findChildren(id);

        // Gather all unit IDs associated with all these categories
        const unitsToDelete = await Unit.find({ categoryId: { $in: categoriesToDeleteIds } }, '_id').lean();
        const unitIds = unitsToDelete.map(u => u._id);

        // 1. Delete all words in these units
        await Word.deleteMany({ unitId: { $in: unitIds } });

        // 2. Delete the units themselves
        await Unit.deleteMany({ _id: { $in: unitIds } });

        // 3. Delete the categories
        await Category.deleteMany({ _id: { $in: categoriesToDeleteIds } });

        cache.delByPrefix(`categoryTree:${session.id}`);
        cache.delByPrefix(`units:${session.id}`);

        return NextResponse.json({ message: 'Papkalar va barcha unitlar muvaffaqiyatli o\'chirildi' });
    } catch (error: any) {
        
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const { name, parentId } = await req.json();

        await dbConnect();

        const category = await Category.findById(id);
        if (!category) return NextResponse.json({ message: 'Kategoriya topilmadi' }, { status: 404 });
        if (category.teacherId.toString() !== session.id) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        let updatedName = category.name;
        let updatedParentId = category.parentId;

        if (name !== undefined) updatedName = name.trim();
        if (parentId !== undefined) updatedParentId = parentId || null;

        // Moving to itself check
        if (updatedParentId && updatedParentId.toString() === id) {
            return NextResponse.json({ message: 'Kategoriyani o\'ziga ko\'chirib bo\'lmaydi' }, { status: 400 });
        }

        // Circular move check (moving to a child)
        if (updatedParentId) {
            const allCats = await Category.find({ teacherId: session.id }).lean();
            const findIsChild = (targetId: string, currentParentId: string): boolean => {
                const parent = allCats.find(c => c._id.toString() === currentParentId);
                if (!parent) return false;
                if (parent._id.toString() === targetId) return true;
                if (!parent.parentId) return false;
                return findIsChild(targetId, parent.parentId.toString());
            };
            if (findIsChild(id, updatedParentId.toString())) {
                return NextResponse.json({ message: 'Kategoriyani o\'zining ichiga ko\'chirib bo\'lmaydi' }, { status: 400 });
            }
        }

        // Calculate new path
        let newPath = updatedName;
        if (updatedParentId) {
            const parent = await Category.findById(updatedParentId);
            if (!parent) return NextResponse.json({ message: 'Ota kategoriya topilmadi' }, { status: 404 });
            newPath = `${parent.path} / ${updatedName}`;
        }

        category.name = updatedName;
        category.parentId = updatedParentId;
        category.path = newPath;
        await category.save();

        // Recursively update children paths
        const updateChildrenPaths = async (parentId: string, parentPath: string) => {
            const children = await Category.find({ parentId });
            for (const child of children) {
                const childPath = `${parentPath} / ${child.name}`;
                child.path = childPath;
                await child.save();
                await updateChildrenPaths(child._id.toString(), childPath);
            }
        };

        if (name !== undefined || parentId !== undefined) {
            await updateChildrenPaths(id, newPath);
        }

        cache.delByPrefix(`categoryTree:${session.id}`);
        cache.delByPrefix(`units:${session.id}`);

        return NextResponse.json(category);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}
