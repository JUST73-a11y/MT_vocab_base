import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import Wallet from '@/models/Wallet';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();

    // Fetch all active groups
    const groups = await Group.find().lean() as any[];

    // Calculate total coins for members of each group
    const standings = await Promise.all(
        groups.map(async (group: any) => {
            const members = await GroupMember.find({ groupId: group._id }).select('userId').lean() as any[];
            const memberUserIds = members.map((m: any) => m.userId);

            const wallets = await Wallet.find({ studentId: { $in: memberUserIds } }).lean() as any[];
            const totalCoins = wallets.reduce((acc: number, w: any) => acc + (w.balance || 0), 0);

            return {
                _id: group._id,
                name: group.name,
                memberCount: members.length,
                totalCoins,
            };
        })
    );

    // Sort by total coins descending
    standings.sort((a, b) => b.totalCoins - a.totalCoins);

    // Assign trophy ranks
    const standingsWithTrophies = standings.map((g, idx) => ({
        ...g,
        rank: idx + 1,
        trophy: idx === 0 ? '🥇 Oltin Kubok' : idx === 1 ? '🥈 Kumush Kubok' : idx === 2 ? '🥉 Bronza Kubok' : null,
    }));

    return NextResponse.json({ standings: standingsWithTrophies });
}