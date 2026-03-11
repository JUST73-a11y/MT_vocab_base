import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import StudentEnergy, { MAX_ENERGY, ENERGY_REFILL_HOURS } from '@/models/StudentEnergy';

function getNextRefillMs(lastRefilledAt: Date): number {
    const refillIntervalMs = ENERGY_REFILL_HOURS * 60 * 60 * 1000;
    const elapsed = Date.now() - lastRefilledAt.getTime();
    return Math.max(0, refillIntervalMs - elapsed);
}

function shouldRefill(lastRefilledAt: Date): boolean {
    return getNextRefillMs(lastRefilledAt) === 0;
}

// GET: return current energy status
export async function GET(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let energy = await StudentEnergy.findOne({ studentId: session.id });

    if (!energy) {
        energy = await StudentEnergy.create({
            studentId: session.id,
            energy: MAX_ENERGY,
            lastRefilledAt: new Date(),
        });
    } else if (shouldRefill(energy.lastRefilledAt)) {
        energy.energy = MAX_ENERGY;
        energy.lastRefilledAt = new Date();
        await energy.save();
    }

    const nextRefillMs = getNextRefillMs(energy.lastRefilledAt);
    const nextRefillSec = Math.ceil(nextRefillMs / 1000);

    return NextResponse.json({
        energy: energy.energy,
        maxEnergy: MAX_ENERGY,
        nextRefillSec,
        nextRefillHours: Math.floor(nextRefillSec / 3600),
        nextRefillMins: Math.floor((nextRefillSec % 3600) / 60),
        totalUsed: energy.totalUsed || 0,
    });
}

// POST: consume 1 energy (called before starting a quiz)
export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();

    let energy = await StudentEnergy.findOne({ studentId: session.id });

    if (!energy) {
        energy = await StudentEnergy.create({
            studentId: session.id,
            energy: MAX_ENERGY,
            lastRefilledAt: new Date(),
        });
    } else if (shouldRefill(energy.lastRefilledAt)) {
        energy.energy = MAX_ENERGY;
        energy.lastRefilledAt = new Date();
    }

    if (energy.energy <= 0) {
        const nextRefillMs = getNextRefillMs(energy.lastRefilledAt);
        const nextRefillSec = Math.ceil(nextRefillMs / 1000);
        return NextResponse.json({
            success: false,
            error: 'NO_ENERGY',
            nextRefillSec,
            nextRefillHours: Math.floor(nextRefillSec / 3600),
            nextRefillMins: Math.floor((nextRefillSec % 3600) / 60),
        }, { status: 429 });
    }

    energy.energy -= 1;
    energy.totalUsed = (energy.totalUsed || 0) + 1;
    await energy.save();

    return NextResponse.json({
        success: true,
        energy: energy.energy,
        maxEnergy: MAX_ENERGY,
    });
}
