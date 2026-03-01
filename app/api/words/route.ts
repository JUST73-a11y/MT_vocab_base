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
            requestedIds = unitIdsStr.split(',');
        }

        let query: any = {};

        if (user.role === 'student') {
            // RESOLVED ACCESS LOGIC - Find which of the requested IDs the student actually has access to
            const [directAccess, myGroups] = await Promise.all([
                StudentUnitAccess.find({ studentId: user.id }).select('unitId').lean(),
                GroupMember.find({ studentId: user.id }).select('groupId').lean()
            ]);

            const groupIds = myGroups.map((gm: any) => gm.groupId);
            const groupAccess = await GroupUnitAccess.find({ groupId: { $in: groupIds } }).select('unitId').lean();

            const authorizedUnitIds = new Set([
                ...directAccess.map((da: any) => da.unitId.toString()),
                ...groupAccess.map((ga: any) => ga.unitId.toString())
            ]);

            // Filter requested IDs by authorized IDs
            const filteredIds = requestedIds.filter(id => authorizedUnitIds.has(id));

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
        console.error('[API GET WORDS] Error:', error);
        return NextResponse.json({ message: 'Error fetching words' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        await dbConnect();

        if (Array.isArray(body)) {
            const words = await Word.insertMany(body);
            return NextResponse.json(words, { status: 201 });
        }

        const word = await Word.create(body);
        return NextResponse.json(word, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: 'Error creating word' }, { status: 500 });
    }
}
