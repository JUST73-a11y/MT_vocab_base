import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        await dbConnect();

        const word = await Word.findByIdAndUpdate(id, body, { returnDocument: 'after' });

        if (!word) {
            return NextResponse.json({ message: 'Word not found' }, { status: 404 });
        }

        return NextResponse.json(word);
    } catch (error) {
        return NextResponse.json({ message: 'Error updating word' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();
        await Word.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Word deleted' });
    } catch (error) {
        return NextResponse.json({ message: 'Error deleting word' }, { status: 500 });
    }
}
