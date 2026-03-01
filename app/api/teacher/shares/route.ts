import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import UnitShare from '@/models/UnitShare';
import Unit from '@/models/Unit';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

/**
 * GET: Get incoming or outgoing shares
 * POST: Create a new share request
 */

export async function GET(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'incoming';

        await dbConnect();

        let query: any = {};
        if (type === 'incoming') {
            query.toTeacherId = teacher.id;
        } else {
            query.fromTeacherId = teacher.id;
        }

        const shares = await UnitShare.find(query)
            .populate({ path: 'unitId', select: 'title category' })
            .populate({ path: 'fromTeacherId', select: 'name email' })
            .populate({ path: 'toTeacherId', select: 'name email' })
            .sort({ createdAt: -1 });

        return NextResponse.json(shares);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching shares' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { unitId, toTeacherCode } = await req.json();
        if (!unitId || !toTeacherCode) {
            return NextResponse.json({ message: 'Unit ID and Teacher Code are required' }, { status: 400 });
        }

        await dbConnect();

        // 1. Verify unit ownership or permission
        const unit = await Unit.findById(unitId);
        if (!unit || unit.createdBy.toString() !== teacher.id) {
            return NextResponse.json({ message: 'You do not own this unit' }, { status: 403 });
        }

        // 2. Find target teacher
        const targetTeacher = await User.findOne({ teacherCode: toTeacherCode.toUpperCase(), role: 'teacher' });
        if (!targetTeacher) {
            return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
        }
        if (targetTeacher._id.toString() === teacher.id) {
            return NextResponse.json({ message: 'You cannot share with yourself' }, { status: 400 });
        }

        // 3. Create or Update share
        const share = await UnitShare.findOneAndUpdate(
            { unitId, toTeacherId: targetTeacher._id },
            {
                fromTeacherId: teacher.id,
                permission: 'VIEW',
                status: 'PENDING',
                createdAt: new Date()
            },
            { upsert: true, returnDocument: 'after' }
        );

        return NextResponse.json(share, { status: 201 });
    } catch (error) {
        console.error('[UNIT SHARE POST] Error:', error);
        return NextResponse.json({ message: 'Error sharing unit' }, { status: 500 });
    }
}
