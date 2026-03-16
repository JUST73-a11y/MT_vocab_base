import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import StudentMistakeWord from '@/models/StudentMistakeWord';
import Word from '@/models/Word';
import Unit from '@/models/Unit';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const url = new URL(req.url);
        const unitId = url.searchParams.get('unitId');
        const sort = url.searchParams.get('sort') || 'wrongCount'; // wrongCount | lastWrongAt
        const showLearned = url.searchParams.get('showLearned') === 'true';

        const filter: any = { studentId: student.id };
        if (unitId) filter.unitId = unitId;
        if (!showLearned) filter.isLearned = { $ne: true };

        const sortField = sort === 'lastWrongAt' ? { lastWrongAt: -1 } : { wrongCount: -1 };

        const mistakes = await StudentMistakeWord.find(filter)
            .sort(sortField as any)
            .limit(200)
            .lean();

        if (mistakes.length === 0) {
            return NextResponse.json({ mistakes: [], units: [] });
        }

        // Populate word data
        const wordIds = mistakes.map((m: any) => m.wordId);
        const words = await Word.find({ _id: { $in: wordIds } }).lean();
        const wordMap = new Map(words.map((w: any) => [w._id.toString(), w]));

        // Populate unit names
        const unitIds = [...new Set(mistakes.map((m: any) => m.unitId?.toString()).filter(Boolean))];
        const units = await Unit.find({ _id: { $in: unitIds } }).select('_id title').lean();
        const unitMap = new Map(units.map((u: any) => [u._id.toString(), u.title]));

        const enriched = mistakes.map((m: any) => {
            const w = wordMap.get(m.wordId.toString());
            return {
                _id: m._id.toString(),
                wordId: m.wordId.toString(),
                unitId: m.unitId?.toString() || null,
                unitTitle: m.unitId ? (unitMap.get(m.unitId.toString()) || 'Unknown') : 'Unknown',
                englishWord: w?.englishWord || '—',
                uzbekTranslation: w?.uzbekTranslation || '—',
                phonetic: w?.phonetic || null,
                wrongCount: m.wrongCount,
                lastWrongAt: m.lastWrongAt,
                isLearned: m.isLearned || false,
            };
        });

        // Return distinct units for filter dropdown
        const unitOptions = units.map((u: any) => ({ id: u._id.toString(), title: u.title }));

        return NextResponse.json({ mistakes: enriched, units: unitOptions });
    } catch (error) {
        
        return NextResponse.json({ message: 'Error loading mistakes' }, { status: 500 });
    }
}

// PATCH — mark a mistake word as learned/unlearned
export async function PATCH(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { mistakeId, isLearned } = await req.json();
        if (!mistakeId) {
            return NextResponse.json({ message: 'mistakeId required' }, { status: 400 });
        }

        await dbConnect();

        const result = await StudentMistakeWord.findOneAndUpdate(
            { _id: mistakeId, studentId: student.id },
            { $set: { isLearned: !!isLearned } },
            { new: true }
        );

        if (!result) {
            return NextResponse.json({ message: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, isLearned: result.isLearned });
    } catch (error) {
        
        return NextResponse.json({ message: 'Error updating' }, { status: 500 });
    }
}
