/**
 * Centralized entitlement service.
 * Backend is the ONLY source of truth — never trust client-side expiry.
 */
import dbConnect from '@/lib/db';
import Entitlement from '@/models/Entitlement';
import mongoose from 'mongoose';

export interface EntitlementStatus {
    active: boolean;
    expiresAt: Date | null;
    remainingMs: number;
    entitlementId: string | null;
}

/** Check if a student has an active entitlement for a feature. */
export async function checkEntitlement(
    studentId: string,
    feature: string
): Promise<EntitlementStatus> {
    await dbConnect();
    const now = new Date();
    const entitlement = await Entitlement.findOne({
        studentId: new mongoose.Types.ObjectId(studentId),
        feature,
        status: { $ne: 'REVOKED' },
        expiresAt: { $gt: now },
    }).lean() as any;

    if (!entitlement) {
        return { active: false, expiresAt: null, remainingMs: 0, entitlementId: null };
    }

    const remainingMs = new Date(entitlement.expiresAt).getTime() - now.getTime();
    return {
        active: true,
        expiresAt: entitlement.expiresAt,
        remainingMs: Math.max(0, remainingMs),
        entitlementId: entitlement._id.toString(),
    };
}

/**
 * Create or extend an existing entitlement.
 * Re-purchase during active period: expiresAt += durationHours (preserves remaining time).
 * Re-purchase after expiry: create fresh entitlement from now.
 */
export async function extendOrCreateEntitlement(
    studentId: string,
    feature: string,
    durationHours: number,
    purchaseId: mongoose.Types.ObjectId,
    source: string = 'SHOP'
): Promise<any> {
    await dbConnect();
    const now = new Date();
    const studentObjId = new mongoose.Types.ObjectId(studentId);

    const existing = await Entitlement.findOne({
        studentId: studentObjId,
        feature,
        status: { $ne: 'REVOKED' },
        expiresAt: { $gt: now },
    });

    const durationMs = durationHours * 60 * 60 * 1000;

    if (existing) {
        // Extend: add duration to current expiry so student never loses remaining time
        existing.expiresAt = new Date(existing.expiresAt.getTime() + durationMs);
        existing.sourceReferenceId = purchaseId;
        await existing.save();
        return existing;
    }

    return Entitlement.create({
        studentId: studentObjId,
        feature,
        source,
        sourceReferenceId: purchaseId,
        startsAt: now,
        expiresAt: new Date(now.getTime() + durationMs),
        status: 'ACTIVE',
    });
}
