import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import UnitShare from '@/models/UnitShare';
import { getServerSession } from '@/lib/serverAuth';

/**
 * PATCH: Accept, Reject or Revoke a share
 */

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { status } = await req.json(); // ACCEPTED, REJECTED, REVOKED
        if (!['ACCEPTED', 'REJECTED', 'REVOKED'].includes(status)) {
            return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
        }

        const { id } = await params;
        await dbConnect();
        const share = await UnitShare.findById(id);
        if (!share) return NextResponse.json({ message: 'Share not found' }, { status: 404 });

        // Authorization
        if (status === 'ACCEPTED' || status === 'REJECTED') {
            if (share.toTeacherId.toString() !== teacher.id) {
                return NextResponse.json({ message: 'Unauthorized to accept/reject' }, { status: 403 });
            }
        } else if (status === 'REVOKED') {
            if (share.fromTeacherId.toString() !== teacher.id) {
                return NextResponse.json({ message: 'Unauthorized to revoke' }, { status: 403 });
            }
        }

        share.status = status;
        await share.save();

        return NextResponse.json({ message: `Share ${status.toLowerCase()} successfully` });
    } catch (error) {
        return NextResponse.json({ message: 'Error updating share' }, { status: 500 });
    }
}
