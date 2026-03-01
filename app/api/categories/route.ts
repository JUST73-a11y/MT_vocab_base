import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';

export async function DELETE(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId');
        const category = searchParams.get('category');

        if (!teacherId || !category) {
            return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
        }

        await dbConnect();

        // Update all units with this category to 'Uncategorized'
        const result = await Unit.updateMany(
            { createdBy: teacherId, category: category },
            { $set: { category: 'Uncategorized' } }
        );

        return NextResponse.json({
            message: 'Category deleted successfully',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ message: 'Error deleting category' }, { status: 500 });
    }
}
