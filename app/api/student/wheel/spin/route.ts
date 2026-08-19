import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from '@/lib/serverAuth';
import { addXpToStudent } from '@/lib/gameProfile';
import { extendOrCreateEntitlement } from '@/lib/entitlements';
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import StudentEnergy from '@/models/StudentEnergy';
import StudentGameProfile from '@/models/StudentGameProfile';
import mongoose from 'mongoose';

// 8 Sectors — Strictly NO Smart Cards or Dollar Cards!
const SECTORS = [
    { index: 0, label: '50 MT', type: 'COINS', amount: 50, color: '#6366f1' },
    { index: 1, label: '+2 Energiya', type: 'ENERGY', amount: 2, color: '#10b981' },
    { index: 2, label: '100 MT', type: 'COINS', amount: 100, color: '#3b82f6' },
    { index: 3, label: '+3 Energiya', type: 'ENERGY', amount: 3, color: '#f59e0b' },
    { index: 4, label: '250 MT', type: 'COINS', amount: 250, color: '#8b5cf6' },
    { index: 5, label: '+5 Energiya', type: 'ENERGY', amount: 5, color: '#06b6d4' },
    { index: 6, label: '24h Mavzu', type: 'THEME', amount: 24, color: '#ec4899' },
    { index: 7, label: '500 MT!', type: 'JACKPOT', amount: 500, color: '#eab308' },
];

export async function GET() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(session.id);
    let profile = await StudentGameProfile.findOne({ studentId: studentObjId }).lean() as any;

    const now = new Date().getTime();
    const lastSpin = profile?.lastWheelSpinAt ? new Date(profile.lastWheelSpinAt).getTime() : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;
    const isFree = now - lastSpin >= cooldownMs;
    const remainingMs = Math.max(0, cooldownMs - (now - lastSpin));

    return NextResponse.json({
        isFree,
        remainingMs,
        sectors: SECTORS,
    });
}

export async function POST() {
    const session = await getServerSession();
    if (!session || session.role !== 'student') {
        return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Login required' }, { status: 401 });
    }

    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(session.id);
    let profile = await StudentGameProfile.findOne({ studentId: studentObjId });

    if (!profile) {
        profile = await StudentGameProfile.create({ studentId: studentObjId });
    }

    const now = new Date();
    const lastSpin = profile.lastWheelSpinAt ? new Date(profile.lastWheelSpinAt).getTime() : 0;
    const cooldownMs = 24 * 60 * 60 * 1000;
    const isFree = now.getTime() - lastSpin >= cooldownMs;

    // Strict 24h limit — spin allowed ONLY 1 time per 24 hours!
    if (!isFree) {
        const remainingMs = cooldownMs - (now.getTime() - lastSpin);
        const remainingHours = Math.floor(remainingMs / 3600000);
        const remainingMins = Math.floor((remainingMs % 3600000) / 60000);
        return NextResponse.json({
            code: 'COOLDOWN',
            message: `Omad g'ildiragini har 24 soatda faqat 1 marta aylantirish mumkin! Keyingi spin: ${remainingHours} soat ${remainingMins} daqiqadan so'ng.`,
            remainingMs,
        }, { status: 400 });
    }

    let wallet = await Wallet.findOne({ studentId: studentObjId });
    if (!wallet) wallet = await Wallet.create({ studentId: studentObjId, balance: 0 });

    // Weighted random selection
    const weights = [35, 20, 20, 12, 7, 3, 2, 1]; // 500 MT has 1% jackpot weight
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let randomNum = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < weights.length; i++) {
        if (randomNum < weights[i]) {
            selectedIndex = i;
            break;
        }
        randomNum -= weights[i];
    }

    const prize = SECTORS[selectedIndex];

    // Grant Prize Effects (Only MT Coins, Energy, or Theme Access — ZERO Cards!)
    if (prize.type === 'COINS' || prize.type === 'JACKPOT') {
        wallet.balance += prize.amount;
        await wallet.save();
        await CoinTransaction.create({
            studentId: studentObjId,
            type: 'EARN_QUIZ',
            amount: prize.amount,
            meta: { reason: `Omad g'ildiragidan yutuq: ${prize.label}` },
        });
    } else if (prize.type === 'ENERGY') {
        await StudentEnergy.findOneAndUpdate(
            { studentId: studentObjId },
            { $inc: { energy: prize.amount } },
            { upsert: true }
        );
    } else if (prize.type === 'THEME') {
        await extendOrCreateEntitlement(session.id, 'THEME_CREATOR', 24, new mongoose.Types.ObjectId(), 'REWARD');
    }

    const xpResult = await addXpToStudent(session.id, 50);

    profile.lastWheelSpinAt = now;
    profile.wheelSpinsCount = (profile.wheelSpinsCount || 0) + 1;
    await profile.save();

    return NextResponse.json({
        success: true,
        sectorIndex: selectedIndex,
        prize,
        newBalance: wallet.balance,
        xpResult,
        sectors: SECTORS,
    });
}