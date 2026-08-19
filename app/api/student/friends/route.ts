import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Friendship from '@/models/Friendship';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(session.id);

    // Fetch accepted friendships
    const friendships = await Friendship.find({
        $or: [{ requesterId: studentObjId }, { recipientId: studentObjId }],
        status: 'ACCEPTED',
    }).lean() as any[];

    const friendUserIds = friendships.map(f =>
        f.requesterId.toString() === session.id ? f.recipientId : f.requesterId
    );

    const friends = await User.find({ _id: { $in: friendUserIds } })
        .select('name email role')
        .lean() as any[];

    const profiles = await StudentGameProfile.find({ studentId: { $in: friendUserIds } }).lean() as any[];
    const profileMap = new Map(profiles.map(p => [p.studentId.toString(), p]));

    const friendsWithProfile = friends.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        level: profileMap.get(u._id.toString())?.level || 1,
        title: profileMap.get(u._id.toString())?.title || 'Boshlovchi',
        xp: profileMap.get(u._id.toString())?.xp || 0,
    }));

    return NextResponse.json({ friends: friendsWithProfile });
}

export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    let body: any = {};
    try { body = await req.json(); } catch { return NextResponse.json({ code: 'BAD_REQUEST' }, { status: 400 }); }

    const { emailOrName } = body;
    if (!emailOrName || typeof emailOrName !== 'string') {
        return NextResponse.json({ code: 'BAD_REQUEST', message: 'Email or name required' }, { status: 400 });
    }

    await dbConnect();
    const targetUser = await User.findOne({
        role: 'student',
        _id: { $ne: new mongoose.Types.ObjectId(session.id) },
        $or: [
            { email: emailOrName.trim().toLowerCase() },
            { name: { $regex: emailOrName.trim(), $options: 'i' } }
        ]
    }).lean() as any;

    if (!targetUser) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'O\'quvchi topilmadi' }, { status: 404 });
    }

    const requesterObjId = new mongoose.Types.ObjectId(session.id);
    const recipientObjId = targetUser._id;

    let friendship = await Friendship.findOne({
        $or: [
            { requesterId: requesterObjId, recipientId: recipientObjId },
            { requesterId: recipientObjId, recipientId: requesterObjId },
        ]
    });

    if (friendship) {
        if (friendship.status === 'ACCEPTED') {
            return NextResponse.json({ code: 'ALREADY_FRIENDS', message: 'Ushbu o\'quvchi allaqachon do\'stingiz' }, { status: 400 });
        }
        friendship.status = 'ACCEPTED';
        await friendship.save();
    } else {
        // Instant friendship acceptance for seamless gameplay
        friendship = await Friendship.create({
            requesterId: requesterObjId,
            recipientId: recipientObjId,
            status: 'ACCEPTED',
        });
    }

    return NextResponse.json({ success: true, friend: targetUser });
}