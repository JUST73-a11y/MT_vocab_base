/**
 * Shop purchase engine — all coin/stock/entitlement logic lives here.
 * Frontend NEVER decides price, balance, or effects.
 */
import dbConnect from '@/lib/db';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import ShopItem from '@/models/ShopItem';
import ShopPurchase from '@/models/ShopPurchase';
import InventoryItem from '@/models/InventoryItem';
import TeacherNotification from '@/models/TeacherNotification';
import StudentEnergy from '@/models/StudentEnergy';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember';
import { extendOrCreateEntitlement } from '@/lib/entitlements';
import mongoose from 'mongoose';

export type PurchaseResult =
    | { success: true; status: 'COMPLETED' | 'PENDING'; purchase: any; newBalance: number; entitlement?: any }
    | { success: false; error: string; code: string };

/** Validate effect schema — never execute arbitrary code */
function validateEffect(effect: any): boolean {
    if (!effect || typeof effect !== 'object') return true; // null effect is fine
    const ALLOWED_EFFECT_TYPES = ['ENERGY_BONUS', 'XP_BONUS', 'COIN_BONUS', 'EXTRA_ATTEMPT', 'CUSTOM_PRIVILEGE'];
    if (!ALLOWED_EFFECT_TYPES.includes(effect.type)) return false;
    if (effect.amount !== undefined && (typeof effect.amount !== 'number' || effect.amount < 0)) return false;
    return true;
}

/** Check if student can see this shop item based on visibility rules */
async function canStudentSeeItem(item: any, studentId: string, teacherId: string): Promise<boolean> {
    if (!item.isActive) return false;
    // Student must belong to this teacher
    const student = await User.findById(studentId).lean() as any;
    if (!student || student.teacherId?.toString() !== teacherId) return false;

    if (item.visibilityType === 'ALL') return true;

    if (item.visibilityType === 'STUDENT') {
        return item.studentIds.some((id: any) => id.toString() === studentId);
    }

    if (item.visibilityType === 'GROUP') {
        const membership = await GroupMember.findOne({
            userId: new mongoose.Types.ObjectId(studentId),
            groupId: { $in: item.groupIds },
        }).lean();
        return !!membership;
    }

    return false;
}

export async function executePurchase(
    studentId: string,
    itemId: string,
    idempotencyKey: string
): Promise<PurchaseResult> {
    await dbConnect();
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const itemObjId = new mongoose.Types.ObjectId(itemId);

    // 1. Fetch item
    const item = await ShopItem.findById(itemObjId).lean() as any;
    if (!item) return { success: false, error: 'Item not found', code: 'NOT_FOUND' };
    if (!item.isActive) return { success: false, error: 'This item is no longer available', code: 'ITEM_INACTIVE' };

    // 2. Check student can see this item (teacher ownership + visibility)
    const visible = await canStudentSeeItem(item, studentId, item.teacherId.toString());
    if (!visible) return { success: false, error: 'You do not have access to this item', code: 'FORBIDDEN' };

    // 3. Check stock
    if (!item.isUnlimitedStock && item.stock <= 0) {
        return { success: false, error: 'This item is sold out', code: 'SOLD_OUT' };
    }

    // 4. Idempotency — prevent double-purchase
    const existing = await ShopPurchase.findOne({ idempotencyKey }).lean();
    if (existing) return { success: false, error: 'Duplicate request', code: 'DUPLICATE' };

    // 5. Server-side price (never trust client)
    const price = item.price;

    // 6. Check wallet balance
    let wallet = await Wallet.findOne({ studentId: studentObjId });
    if (!wallet) wallet = await Wallet.create({ studentId: studentObjId, balance: 0 });
    if (wallet.balance < price) {
        return {
            success: false,
            error: `Insufficient MT Coins. Need ${price}, have ${wallet.balance}`,
            code: 'INSUFFICIENT_BALANCE',
        };
    }

    // 7. Deduct coins atomically
    const updatedWallet = await Wallet.findOneAndUpdate(
        { studentId: studentObjId, balance: { $gte: price } },
        { $inc: { balance: -price }, $set: { updatedAt: new Date() } },
        { new: true }
    );
    if (!updatedWallet) {
        return { success: false, error: 'Insufficient balance (concurrent check failed)', code: 'INSUFFICIENT_BALANCE' };
    }

    // 8. Decrement stock if limited
    if (!item.isUnlimitedStock) {
        const stockResult = await ShopItem.findOneAndUpdate(
            { _id: itemObjId, stock: { $gt: 0 } },
            { $inc: { stock: -1 } }
        );
        if (!stockResult) {
            // Rollback coin deduction
            await Wallet.findOneAndUpdate(
                { studentId: studentObjId },
                { $inc: { balance: price }, $set: { updatedAt: new Date() } }
            );
            return { success: false, error: 'Item just sold out', code: 'SOLD_OUT' };
        }
    }

    // 9. Create purchase record
    const needsApproval = item.requiresApproval;
    const status = needsApproval ? 'PENDING' : 'COMPLETED';

    const purchase = await ShopPurchase.create({
        studentId: studentObjId,
        teacherId: item.teacherId,
        itemId: itemObjId,
        itemNameSnapshot: item.name,
        itemTypeSnapshot: item.type,
        priceSnapshot: price,
        status,
        purchasedAt: new Date(),
        idempotencyKey,
    });

    // 10. Coin transaction record
    await CoinTransaction.create({
        studentId: studentObjId,
        teacherId: item.teacherId,
        type: 'SHOP_PURCHASE',
        amount: -price,
        meta: {
            purchaseId: purchase._id,
            itemId: item._id,
            itemName: item.name,
            itemType: item.type,
            status,
        },
    });

    let entitlement = null;

    // 11. If instant (no approval needed), grant item/effect
    if (!needsApproval) {
        entitlement = await grantItemEffect(item, studentId, purchase._id);
        if (entitlement) {
            purchase.entitlementId = entitlement._id;
            await purchase.save();
        }
    }

    // 12. Notify teacher
    const student = await User.findById(studentId).lean() as any;
    const studentName = student?.name || 'Noma\'lum';
    const typeEmoji = {
        THEME_CREATOR_ACCESS: '🎨',
        SMART_CARD: '💳',
        DOLLAR_CARD: '💵',
        ENERGY_STACK: '⚡',
        CUSTOM: '🎁',
    }[item.type as string] || '🛒';

    await TeacherNotification.create({
        teacherId: item.teacherId,
        studentId: studentObjId,
        studentName,
        type: 'SHOP_PURCHASE',
        title: `${typeEmoji} Yangi xarid`,
        message: `${studentName} "${item.name}" ni ${price} MT tangaga sotib oldi${needsApproval ? ' (tasdiqlash kerak)' : ''}.`,
        isRead: false,
    });

    return {
        success: true,
        status: status as 'COMPLETED' | 'PENDING',
        purchase,
        newBalance: updatedWallet.balance,
        entitlement,
    };
}

/** Grant item effects after payment — called for instant and teacher-approved purchases */
export async function grantItemEffect(item: any, studentId: string, purchaseId: any): Promise<any> {
    const itemType = item.type as string;

    if (itemType === 'THEME_CREATOR_ACCESS') {
        const durationHours = item.metadata?.durationHours ?? 48;
        return extendOrCreateEntitlement(studentId, 'THEME_CREATOR', durationHours, purchaseId, 'SHOP');
    }

    if (itemType === 'ENERGY_STACK') {
        const energyAmount = item.effect?.amount ?? item.metadata?.energyAmount ?? 10;
        await StudentEnergy.findOneAndUpdate(
            { studentId: new mongoose.Types.ObjectId(studentId) },
            { $inc: { energy: energyAmount } },
            { upsert: true }
        );
    }

    if (itemType === 'SMART_CARD' || itemType === 'DOLLAR_CARD' || itemType === 'CUSTOM' || itemType === 'ENERGY_STACK') {
        await InventoryItem.create({
            studentId: new mongoose.Types.ObjectId(studentId),
            itemId: item._id,
            purchaseId,
            itemType: item.type,
            itemName: item.name,
            quantity: 1,
            status: 'AVAILABLE',
            metadata: item.metadata ?? {},
            acquiredAt: new Date(),
        });
    }

    return null;
}

/** Teacher approves a pending purchase */
export async function approvePurchase(purchaseId: string, teacherId: string): Promise<{ success: boolean; error?: string }> {
    await dbConnect();
    const purchase = await ShopPurchase.findById(purchaseId);
    if (!purchase) return { success: false, error: 'Purchase not found' };
    if (purchase.teacherId.toString() !== teacherId) return { success: false, error: 'Unauthorized' };
    if (purchase.status !== 'PENDING') return { success: false, error: 'Purchase is not pending' };

    const item = await ShopItem.findById(purchase.itemId).lean() as any;
    if (!item) return { success: false, error: 'Shop item not found' };

    const entitlement = await grantItemEffect(item, purchase.studentId.toString(), purchase._id);

    purchase.status = 'COMPLETED';
    purchase.reviewedAt = new Date();
    purchase.reviewedBy = new mongoose.Types.ObjectId(teacherId);
    if (entitlement) purchase.entitlementId = entitlement._id;
    await purchase.save();

    return { success: true };
}

/** Teacher rejects a pending purchase — refunds coins */
export async function rejectPurchase(
    purchaseId: string,
    teacherId: string,
    note: string = ''
): Promise<{ success: boolean; error?: string }> {
    await dbConnect();
    const purchase = await ShopPurchase.findById(purchaseId);
    if (!purchase) return { success: false, error: 'Purchase not found' };
    if (purchase.teacherId.toString() !== teacherId) return { success: false, error: 'Unauthorized' };
    if (purchase.status !== 'PENDING') return { success: false, error: 'Purchase is not pending' };

    const refundAmount = purchase.priceSnapshot;

    // Refund coins
    await Wallet.findOneAndUpdate(
        { studentId: purchase.studentId },
        { $inc: { balance: refundAmount }, $set: { updatedAt: new Date() } },
        { upsert: true }
    );

    await CoinTransaction.create({
        studentId: purchase.studentId,
        teacherId: new mongoose.Types.ObjectId(teacherId),
        type: 'SHOP_REFUND',
        amount: refundAmount,
        meta: { purchaseId: purchase._id, reason: note || 'Rad etildi' },
    });

    purchase.status = 'REJECTED';
    purchase.reviewedAt = new Date();
    purchase.reviewedBy = new mongoose.Types.ObjectId(teacherId);
    purchase.reviewNote = note;
    await purchase.save();

    return { success: true };
}
