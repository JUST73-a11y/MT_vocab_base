import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';

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

        return NextResponse.json({ message: 'Papkalar va barcha unitlar muvaffaqiyatli o\'chirildi' });
    } catch (error: any) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}
