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

        // Optional group check — doesn't block if student isn't in a group
        const memberDoc = await GroupMember.findOne({ studentId: session.id }).lean() as any;
        const groupId = memberDoc?.groupId || null;

        // Get student user to find teacherId
        const studentUser = await User.findById(session.id).select('teacherId').lean() as any;
        const teacherId = studentUser?.teacherId;

        // Fetch words from teacher's units or fallback to all words in database
        let units: any[] = [];
        if (teacherId) {
            units = await Unit.find({
                $or: [{ teacherId }, { createdBy: teacherId }]
            }).select('_id').lean();
        }
        const unitIds = units.map((u: any) => u._id);

        let allWords: any[] = [];
        if (unitIds.length > 0) {
            allWords = await Word.find({ unitId: { $in: unitIds } }).select('englishWord uzbekTranslation audioUrl english uzbek').lean();
        }
        if (allWords.length < 4) {
            allWords = await Word.find().limit(200).select('englishWord uzbekTranslation audioUrl english uzbek').lean();
        }

        if (allWords.length < 4) {
            return createApiError('BAD_REQUEST', 'Lugatda yetarli so\'z mavjud emas', 400);
        }

        // Shuffle and pick 10 words
        const shuffled = [...allWords].sort(() => 0.5 - Math.random());
        const selectedWords = shuffled.slice(0, 10);
        const allTranslations: string[] = Array.from(new Set(allWords.map((w: any) => w.uzbekTranslation || w.uzbek || 'Tarjima')));

        // Generate questions with 4 options
        const questions = selectedWords.map((w: any) => {
            const english = w.englishWord || w.english || 'Word';
            const correct = w.uzbekTranslation || w.uzbek || 'Tarjima';

            const distractors = allTranslations
                .filter(t => t !== correct)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            const optionsSet = new Set([correct, ...distractors]);
            while (optionsSet.size < 4) {
                optionsSet.add(`Variant ${optionsSet.size + 1}`);
            }
            const options = Array.from(optionsSet).sort(() => 0.5 - Math.random());

            return {
                word: english,
                correctTranslation: correct,
                options,
                audioUrl: w.audioUrl || null,
            };
        });

        // Create duel doc
        const duel = await Duel.create({
            challengerId: session.id,
            opponentId: opponentId,
            groupId: groupId,
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