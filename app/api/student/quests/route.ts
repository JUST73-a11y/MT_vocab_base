import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { getStudentQuests } from '@/lib/quests/questEngine';
import dbConnect from '@/lib/db';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const quests = await getStudentQuests(session.id);
    let profile = await StudentGameProfile.findOne({ studentId: new mongoose.Types.ObjectId(session.id) }).lean() as any;

    if (!profile) {
        profile = { xp: 0, level: 1, title: 'Boshlovchi' };
    }

    return NextResponse.json({ quests, profile });
}