import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';

import StudentUnitAccess from '@/models/StudentUnitAccess';
import GroupMember from '@/models/GroupMember';
import GroupUnitAccess from '@/models/GroupUnitAccess';

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');
        const unitIdsStr = searchParams.get('unitIds'); // comma separated

        await dbConnect();

        let requestedIds: string[] = [];
        if (unitId) {
            requestedIds = [unitId];
        } else if (unitIdsStr) {
            requestedIds = unitIdsStr.split(',').map(s => s.trim()).filter(Boolean);
        }

        let query: any = {};

        if (user.role === 'student') {
            // Check direct access, group access, AND student personal units
            const [directAccess, myGroups, myPersonalUnits] = await Promise.all([
                StudentUnitAccess.find({ studentId: user.id }).select('unitId').lean(),
                GroupMember.find({ studentId: user.id }).select('groupId').lean(),
                (await import('@/models/Unit')).default.find({
                    ownerType: 'STUDENT',
                    ownerId: user.id,
                    ...(requestedIds.length > 0 ? { _id: { $in: requestedIds } } : {})
                }).select('_id').lean()
            ]);

            const groupIds = myGroups.map((gm: any) => gm.groupId);
            const groupAccess = await GroupUnitAccess.find({ groupId: { $in: groupIds } }).select('unitId').lean();

            const authorizedUnitIds = new Set([
                ...directAccess.map((da: any) => da.unitId.toString()),
                ...groupAccess.map((ga: any) => ga.unitId.toString()),
                ...myPersonalUnits.map((pu: any) => pu._id.toString())
            ]);

            // Filter requested IDs by authorized IDs
            const filteredIds = requestedIds.length > 0
                ? requestedIds.filter(id => authorizedUnitIds.has(id))
                : Array.from(authorizedUnitIds);

            if (filteredIds.length === 0 && requestedIds.length > 0) {
                return NextResponse.json([]); // No authorized units among requested
            }

            query = { unitId: { $in: filteredIds } };
        } else {
            // Teacher/Admin can see all words in the requested units
            if (requestedIds.length > 0) {
                query = { unitId: { $in: requestedIds } };
            }
        }

        const words = await Word.find(query).lean();
        return NextResponse.json(words);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching words' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        await dbConnect();
        const UnitModel = (await import('@/models/Unit')).default;

        // Student authorization check
        if (user.role === 'student') {
            const items = Array.isArray(body) ? body : [body];
            const targetUnitIds = Array.from(new Set(items.map(it => it.unitId?.toString()).filter(Boolean)));
            if (targetUnitIds.length === 0) {
                return NextResponse.json({ message: 'unitId kiritilmagan' }, { status: 400 });
            }

            // Verify student owns all target units
            const ownedUnits = await UnitModel.find({
                _id: { $in: targetUnitIds },
                ownerType: 'STUDENT',
                ownerId: user.id
            }).lean();

            if (ownedUnits.length !== targetUnitIds.length) {
                return NextResponse.json({ message: 'Ruxsat berilmagan unit' }, { status: 403 });
            }
        } else if (user.role !== 'teacher' && user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        if (Array.isArray(body)) {
            // Use { ordered: false } to continue inserting even if some words fail
            const words = await Word.insertMany(body, { ordered: false });
            return NextResponse.json(words, { status: 201 });
        }

        const word = await Word.create(body);
        return NextResponse.json(word, { status: 201 });
    } catch (error: any) {
        console.error('Error creating word(s):', error);
        return NextResponse.json({ 
            message: 'Error creating word', 
            error: error.message 
        }, { status: 500 });
    }
}
