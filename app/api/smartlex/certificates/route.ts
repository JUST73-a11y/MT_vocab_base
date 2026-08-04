import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Certificate from '@/models/Certificate';
import { getServerSession } from '@/lib/serverAuth';

/** GET /api/smartlex/certificates */
export async function GET() {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const certs = await Certificate.find({ studentId: student.id })
            .sort({ earnedAt: -1 })
            .lean();

        return NextResponse.json(certs);
    } catch (e: any) {
        return NextResponse.json({ message: 'Error fetching certificates', error: e.message }, { status: 500 });
    }
}
