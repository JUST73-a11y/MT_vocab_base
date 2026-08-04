import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Certificate from '@/models/Certificate';
import SmartLexProgress from '@/models/SmartLexProgress';
import Unit from '@/models/Unit';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import { getServerSession } from '@/lib/serverAuth';

/** POST /api/smartlex/certificate
 * Body: { unitId }
 */
export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { unitId } = await req.json();
        if (!unitId) return NextResponse.json({ message: 'unitId is required' }, { status: 400 });

        await dbConnect();

        // 1. Check existing certificate
        let cert = await Certificate.findOne({ studentId: student.id, unitId }).lean();
        if (cert) {
            return NextResponse.json({ certificate: cert, isNew: false });
        }

        // 2. Fetch Unit & Student details
        const [unitDoc, userDoc, groupMember] = await Promise.all([
            Unit.findById(unitId).lean(),
            User.findById(student.id).select('name teacherId').lean(),
            GroupMember.findOne({ studentId: student.id }).populate('groupId').lean(),
        ]);

        if (!unitDoc) return NextResponse.json({ message: 'Unit not found' }, { status: 404 });

        let teacherName = "Ustoz";
        let teacherId = (userDoc as any)?.teacherId || null;
        if (teacherId) {
            const tDoc = await User.findById(teacherId).select('name').lean();
            if (tDoc) teacherName = (tDoc as any).name;
        }

        const groupName = (groupMember as any)?.groupId?.name || 'Guruh';

        // 3. Create Certificate
        const newCert = await Certificate.create({
            studentId: student.id,
            unitId,
            studentName: (userDoc as any)?.name || 'O\'quvchi',
            groupName,
            teacherName,
            teacherId,
            unitTitle: (unitDoc as any).title || 'Unit',
            activitiesCompleted: 10,
            coinsAwarded: 100,
            status: 'verified',
        });

        // 4. Update Wallet & CoinTransaction
        await Wallet.findOneAndUpdate(
            { studentId: student.id },
            { $inc: { balance: 100 } },
            { upsert: true, new: true }
        );

        await CoinTransaction.create({
            studentId: student.id,
            teacherId: null,
            type: 'EARN_QUIZ',
            amount: 100,
            meta: { reason: 'Unit Certificate Earned', unitId, certId: newCert.certId },
        });

        // Mark completedAt in SmartLexProgress
        await SmartLexProgress.updateOne(
            { studentId: student.id, unitId },
            { $set: { completedAt: new Date() } }
        );

        return NextResponse.json({ certificate: newCert, isNew: true }, { status: 201 });
    } catch (e: any) {
        console.error('Certificate generation error:', e);
        return NextResponse.json({ message: 'Error generating certificate', error: e.message }, { status: 500 });
    }
}
