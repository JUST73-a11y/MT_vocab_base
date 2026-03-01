import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Session from '@/models/Session';
import Word from '@/models/Word';
import mongoose from 'mongoose';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const adminUser = await getServerSession();
        if (!adminUser || adminUser.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();

        const student = await User.findById(id);
        if (!student) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const sessions = await Session.find({ studentId: id });

        const allWordsSeenIds = new Set<string>();
        let todayWordsCount = 0;
        let estimatedTimeSpentSeconds = 0;
        let todayTimeSpentSeconds = 0;

        const todayDateStr = new Date().toISOString().split('T')[0];

        for (const session of sessions) {
            // Session stores words as plain string IDs
            for (const wordId of session.wordsSeen || []) {
                allWordsSeenIds.add(String(wordId));
            }
            const sessionTime = (session.wordsCount || session.wordsSeen?.length || 0) * 12;
            estimatedTimeSpentSeconds += sessionTime;

            if (session.date === todayDateStr) {
                todayWordsCount += (session.wordsCount || 0);
                todayTimeSpentSeconds += sessionTime;
            }
        }

        // Convert string IDs to ObjectIds for mongoose query
        const uniqueWordIds = Array.from(allWordsSeenIds)
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));

        let totalUnitsStudied = 0;
        if (uniqueWordIds.length > 0) {
            const words = await Word.find({ _id: { $in: uniqueWordIds } }, { unitId: 1 });
            const uniqueUnitIds = new Set(words.map(w => w.unitId?.toString()).filter(Boolean));
            totalUnitsStudied = uniqueUnitIds.size;
        }

        return NextResponse.json({
            studentName: student.name,
            totalWordsSeen: student.totalWordsSeen || 0,
            uniqueWordsCount: allWordsSeenIds.size,
            todayWordsCount,
            todayTimeSpentSeconds,
            totalUnitsStudied,
            estimatedTimeSpentSeconds,
            sessionsCount: sessions.length,
            joinedAt: student.createdAt,
        });

    } catch (error) {
        console.error('Error fetching student stats:', error);
        return NextResponse.json({ message: 'Error fetching stats' }, { status: 500 });
    }
}
