import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        // Update all units without category or with empty category to 'Uncategorized'
        const result = await Unit.updateMany(
            { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] },
            { $set: { category: 'Uncategorized' } }
        );

        return NextResponse.json({
            success: true,
            message: 'Migration complete',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ success: false, error: 'Migration failed' }, { status: 500 });
    }
}
