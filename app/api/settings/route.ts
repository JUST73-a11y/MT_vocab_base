import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { getServerSession } from '@/lib/serverAuth';

export async function GET(req: Request) {
    try {
        const user = await getServerSession();
        if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const teacherId = searchParams.get('teacherId');

        if (!teacherId) {
            // MVP: If no teacherId, return the first settings found (for demo purposes)
            await dbConnect();
            const settings = await Settings.findOne();
            if (!settings) return NextResponse.json(null);
            return NextResponse.json(settings);
        }

        await dbConnect();
        const settings = await Settings.findOne({ teacherId }).lean();
        return NextResponse.json(settings || null);
    } catch (error) {
        return NextResponse.json({ message: 'Error fetching settings' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getServerSession();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { teacherId, selectedUnits, timerDuration } = await req.json();

        await dbConnect();

        // Upsert settings
        const settings = await Settings.findOneAndUpdate(
            { teacherId },
            { teacherId, selectedUnits, timerDuration, updatedAt: new Date() },
            { returnDocument: 'after', upsert: true }
        );

        return NextResponse.json(settings);
    } catch (error) {
        return NextResponse.json({ message: 'Error saving settings' }, { status: 500 });
    }
}
