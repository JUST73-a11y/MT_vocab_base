import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember';
import Word from '@/models/Word';
import Unit from '@/models/Unit';
import Duel from '@/models/Duel';
import { getServerSession } from '@/lib/serverAuth';
import { createApiError } from '@/lib/apiError';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'student') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        const body = await req.json();
        const { opponentId } = body;

        if (!opponentId || opponentId === session.id) {
            return createApiError('BAD_REQUEST', 'Raqib tanlanmadi', 400);
        }

        await dbConnect();

        // Check group membership
        const memberDoc = await GroupMember.findOne({ studentId: session.id }).lean();
        if (!memberDoc) {
            return createApiError('FORBIDDEN', 'Siz guruhda emassiz', 403);
        }

        const opponentMember = await GroupMember.findOne({ studentId: opponentId, groupId: memberDoc.groupId }).lean();
        if (!opponentMember) {
            return createApiError('BAD_REQUEST', 'Raqib bu guruhda emas', 400);
        }

        // Get student user to find teacherId
        const studentUser = await User.findById(session.id).select('teacherId').lean();
        const teacherId = (studentUser as any)?.teacherId;

        // Fetch words from teacher's units or all available units
        let units: any[] = [];
        if (teacherId) {
            units = await Unit.find({ createdBy: teacherId }).select('_id').lean();
        }
        const unitIds = units.map((u: any) => u._id);

        let allWords: any[] = [];
        if (unitIds.length > 0) {
            allWords = await Word.find({ unitId: { $in: unitIds } }).select('englishWord uzbekTranslation audioUrl').lean();
        }
        if (allWords.length < 10) {
            allWords = await Word.find().limit(200).select('englishWord uzbekTranslation audioUrl').lean();
        }

        if (allWords.length < 4) {
            return createApiError('BAD_REQUEST', 'Lugatda yetarli so\'z mavjud emas', 400);
        }

        // Shuffle and pick 10 words
        const shuffled = [...allWords].sort(() => 0.5 - Math.random());
        const selectedWords = shuffled.slice(0, 10);
        const allTranslations: string[] = Array.from(new Set(allWords.map((w: any) => w.uzbekTranslation)));

        // Generate questions with 4 options
        const questions = selectedWords.map((w: any) => {
            const correct = w.uzbekTranslation;
            const distractors = allTranslations
                .filter(t => t !== correct)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            const options = [correct, ...distractors].sort(() => 0.5 - Math.random());

            return {
                word: w.englishWord,
                correctTranslation: correct,
                options,
                audioUrl: w.audioUrl || null,
            };
        });

        // Create duel doc
        const duel = await Duel.create({
            challengerId: session.id,
            opponentId: opponentId,
            groupId: memberDoc.groupId,
            status: 'PENDING',
            questions,
            rewardCoins: 20,
        });

        return NextResponse.json({
            success: true,
            duelId: duel._id.toString(),
            message: 'Duel chaqiruvi muvaffaqiyatli yuborildi!',
        });

    } catch (error: any) {
        return createApiError('SERVER_ERROR', error.message || 'Server xatosi', 500);
    }
}
