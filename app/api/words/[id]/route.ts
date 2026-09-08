import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        await dbConnect();

        const existingWord = await Word.findById(id).lean() as any;
        if (!existingWord) {
            return NextResponse.json({ message: 'Word not found' }, { status: 404 });
        }

        if (user.role === 'student') {
            const UnitModel = (await import('@/models/Unit')).default;
            const unit = await UnitModel.findById(existingWord.unitId).lean() as any;
            if (!unit || unit.ownerType !== 'STUDENT' || unit.ownerId?.toString() !== user.id) {
                return NextResponse.json({ message: 'Ruxsat berilmagan' }, { status: 403 });
            }
        } else if (user.role !== 'teacher' && user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const word = await Word.findByIdAndUpdate(id, body, { returnDocument: 'after' });
        return NextResponse.json(word);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating word' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const existingWord = await Word.findById(id).lean() as any;
        if (!existingWord) {
            return NextResponse.json({ message: 'Word not found' }, { status: 404 });
        }

        if (user.role === 'student') {
            const UnitModel = (await import('@/models/Unit')).default;
            const unit = await UnitModel.findById(existingWord.unitId).lean() as any;
            if (!unit || unit.ownerType !== 'STUDENT' || unit.ownerId?.toString() !== user.id) {
                return NextResponse.json({ message: 'Ruxsat berilmagan' }, { status: 403 });
            }
        } else if (user.role !== 'teacher' && user.role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await Word.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Word deleted' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting word' }, { status: 500 });
    }
}
