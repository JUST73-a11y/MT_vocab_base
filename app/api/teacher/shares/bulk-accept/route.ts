import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import UnitShare from '@/models/UnitShare';
import Unit from '@/models/Unit';
import Category from '@/models/Category';
import { getServerSession } from '@/lib/serverAuth';

/**
 * POST: Barcha pending incoming sharesni qabul qilish.
 * Tuzilma: Sender nomi (asosiy papka) → Unit kategoriyasi (sub-papka) → unitlar
 */
export async function POST(req: Request) {
    try {
        const teacher = await getServerSession();
        if (!teacher || (teacher.role !== 'teacher' && teacher.role !== 'admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Barcha pending incoming sharesni topish (unit ma'lumotlari bilan)
        const pendingShares = await UnitShare.find({
            toTeacherId: teacher.id,
            status: 'PENDING',
        })
            .populate({ path: 'fromTeacherId', select: 'name email' })
            .populate({ path: 'unitId', select: 'title category categoryId' }); // Fetch categoryId!

        if (pendingShares.length === 0) {
            return NextResponse.json({ message: "Qabul qilish uchun so'rovlar yo'q", accepted: 0 });
        }

        // Sender bo'yicha guruhlash
        const bySender = new Map<string, { senderId: string; senderName: string; shares: typeof pendingShares }>();
        for (const share of pendingShares) {
            const sender = share.fromTeacherId as any;
            const senderId = sender._id.toString();
            if (!bySender.has(senderId)) {
                bySender.set(senderId, { senderId, senderName: sender.name || "Noma'lum", shares: [] });
            }
            bySender.get(senderId)!.shares.push(share);
        }

        let acceptedCount = 0;

        const sharedIdMap = new Map<string, any>(); // senderId_senderCatId -> receiverCatId
        const legacyStringCatMap = new Map<string, any>(); // senderId_categoryString -> receiverCatId
        const senderCatCache = new Map<string, Map<string, any>>();

        for (const [senderId, { senderName, shares }] of bySender) {
            // 1. Sender nomi bilan asosiy papka (root levelda)
            let senderRoot = await Category.findOne({
                name: senderName,
                teacherId: teacher.id,
                parentId: null,
            });
            if (!senderRoot) {
                senderRoot = await Category.create({
                    name: senderName,
                    teacherId: teacher.id,
                    parentId: null,
                    path: senderName,
                });
            }

            for (const share of shares) {
                const unit = share.unitId as any;
                const senderUnitCatId = unit?.categoryId?.toString();

                let finalTargetCatId = senderRoot._id;

                if (senderUnitCatId) {
                    // Bu unitning sender'dagi kategoriyalar zanjirini aniqlash
                    const cacheKey = `${senderId}_${senderUnitCatId}`;
                    if (sharedIdMap.has(cacheKey)) {
                        finalTargetCatId = sharedIdMap.get(cacheKey);
                    } else {
                        // Sender'ning barcha kategoriyalarini olamiz
                        let senderCatMap = senderCatCache.get(senderId);
                        if (!senderCatMap) {
                            const senderCategories = await Category.find({ teacherId: senderId }).lean();
                            senderCatMap = new Map(senderCategories.map(c => [c._id.toString(), c]));
                            senderCatCache.set(senderId, senderCatMap);
                        }
                        
                        // Zanjirni quramiz (leaf -> root)
                        const chainNames: string[] = [];
                        let curr = senderCatMap.get(senderUnitCatId);
                        while (curr) {
                            chainNames.unshift(curr.name);
                            curr = curr.parentId ? senderCatMap.get(curr.parentId.toString()) : null;
                        }

                        // Agar zanjir topilmasa (kategoriya o'chirilgan bo'lsa), string bazasida saqlaymiz
                        if (chainNames.length === 0 && unit.category && unit.category !== 'Uncategorized') {
                            chainNames.push(unit.category);
                        }

                        // Receiver'da shu zanjirni yaratish/topish
                        let currentParentId = senderRoot._id;
                        let currentPath = senderName;

                        for (const name of chainNames) {
                            let folder = await Category.findOne({
                                name,
                                teacherId: teacher.id,
                                parentId: currentParentId
                            });

                            if (!folder) {
                                currentPath = `${currentPath} / ${name}`;
                                folder = await Category.create({
                                    name,
                                    teacherId: teacher.id,
                                    parentId: currentParentId,
                                    path: currentPath
                                });
                            } else {
                                currentPath = folder.path;
                            }
                            currentParentId = folder._id;
                        }
                        
                        finalTargetCatId = currentParentId;
                        sharedIdMap.set(cacheKey, finalTargetCatId);
                    }
                } else if (unit?.category && unit.category !== 'Uncategorized') {
                    // YAKUNIY EHTIYOT CHORASI: Agar categoryId bo'lmasa lekin string nomi bo'lsa (Eski unitlar uchun)
                    const cacheKey = `${senderId}_str_${unit.category}`;
                    if (legacyStringCatMap.has(cacheKey)) {
                        finalTargetCatId = legacyStringCatMap.get(cacheKey);
                    } else {
                        let folder = await Category.findOne({
                            name: unit.category,
                            teacherId: teacher.id,
                            parentId: senderRoot._id
                        });
                        if (!folder) {
                            folder = await Category.create({
                                name: unit.category,
                                teacherId: teacher.id,
                                parentId: senderRoot._id,
                                path: `${senderName} / ${unit.category}`
                            });
                        }
                        finalTargetCatId = folder._id;
                        legacyStringCatMap.set(cacheKey, finalTargetCatId);
                    }
                }

                // Share ni accept qilingan holatga o'tkazish
                share.status = 'ACCEPTED';
                share.targetCategoryId = finalTargetCatId;
                await share.save();
                acceptedCount++;
            }
        }

        return NextResponse.json({
            message: `${acceptedCount} ta unit qabul qilindi`,
            accepted: acceptedCount,
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Xatolik yuz berdi' }, { status: 500 });
    }
}
