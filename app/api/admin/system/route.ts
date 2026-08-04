import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';
import VocabGameSession from '@/models/VocabGameSession';
import GroupQuizSession from '@/models/GroupQuizSession';
import User from '@/models/User';

export async function GET(req: Request) {
    try {
        const admin = await getServerSession();
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await dbConnect();
        const db = mongoose.connection.db;
        if (!db) return NextResponse.json({ message: 'DB not connected' }, { status: 500 });

        const stats = await db.stats();
        
        // Count junk data
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const oldVocabSessions = await VocabGameSession.countDocuments({ status: 'ACTIVE', createdAt: { $lt: oneDayAgo } });
        const oldQuizSessions = await GroupQuizSession.countDocuments({ status: 'ACTIVE', createdAt: { $lt: oneDayAgo } });
        const unverifiedUsers = await User.countDocuments({ isVerified: false, createdAt: { $lt: sevenDaysAgo } });
        const activeUsersCount = await User.countDocuments({ lastActiveAt: { $gt: fiveMinsAgo } });
        const activeUsersList = await User.find({ lastActiveAt: { $gt: fiveMinsAgo } })
            .select('name role lastActiveAt lastDevice lastOs lastBrowser')
            .sort({ lastActiveAt: -1 })
            .lean();

        return NextResponse.json({
            dbStats: {
                dataSizeMB: (stats.dataSize / 1024 / 1024).toFixed(2),
                indexSizeMB: (stats.indexSize / 1024 / 1024).toFixed(2),
                collections: stats.collections,
                objects: stats.objects
            },
            junkStats: {
                oldVocabSessions,
                oldQuizSessions,
                unverifiedUsers
            },
            activeUsers: activeUsersCount,
            activeUsersList
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching system stats' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const admin = await getServerSession();
        if (!admin || admin.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await dbConnect();
        
        const body = await req.json();
        const { clearOldSessions, clearUnverifiedUsers } = body;
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        let deletedVocab = 0;
        let deletedQuiz = 0;
        let deletedUsers = 0;
        
        if (clearOldSessions) {
            const vRes = await VocabGameSession.deleteMany({ status: 'ACTIVE', createdAt: { $lt: oneDayAgo } });
            const qRes = await GroupQuizSession.deleteMany({ status: 'ACTIVE', createdAt: { $lt: oneDayAgo } });
            deletedVocab = vRes.deletedCount || 0;
            deletedQuiz = qRes.deletedCount || 0;
        }
        
        if (clearUnverifiedUsers) {
            const uRes = await User.deleteMany({ isVerified: false, createdAt: { $lt: sevenDaysAgo } });
            deletedUsers = uRes.deletedCount || 0;
        }

        return NextResponse.json({
            message: 'Tozalandi',
            deleted: {
                vocabSessions: deletedVocab,
                quizSessions: deletedQuiz,
                unverifiedUsers: deletedUsers
            }
        });
    } catch (error) {
        return NextResponse.json({ message: 'Error clearing cache' }, { status: 500 });
    }
}
