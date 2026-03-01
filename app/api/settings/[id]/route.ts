import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { selectedUnits, timerDuration } = await req.json();

        await dbConnect();

        const settings = await Settings.findByIdAndUpdate(
            id,
            { selectedUnits, timerDuration, updatedAt: new Date() },
            { returnDocument: 'after' }
        );

        if (!settings) {
            return NextResponse.json({ message: 'Settings not found' }, { status: 404 });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ message: 'Error updating settings' }, { status: 500 });
    }
}
