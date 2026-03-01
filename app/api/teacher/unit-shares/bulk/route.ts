import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import User from '@/models/User';
import TeacherProfile from '@/models/TeacherProfile';
import UnitShare from '@/models/UnitShare';
import { getUnits } from '@/lib/firestore';
import { createApiError } from '@/lib/apiError';

export async function POST(req: Request) {
    try {
        const sessionUser = await getServerSession();
        if (!sessionUser || sessionUser.role !== 'teacher') {
            return createApiError('UNAUTHORIZED', 'Unauthorized', 403);
        }

        const { toTeacherCode, unitIds } = await req.json();

        if (!toTeacherCode || !unitIds || !Array.isArray(unitIds) || unitIds.length === 0) {
            return createApiError('BAD_REQUEST', 'toTeacherCode va kamida bitta unitIds kiritilishi shart', 400);
        }

        await dbConnect();
        const fromTeacherId = sessionUser.id;
        const normalizedCode = toTeacherCode.trim().toUpperCase();

        // 1. Qabul qiluvchi o'qituvchini topish (TeacherProfile orqali kod tekshiriladi)
        const toTeacherProfile = await TeacherProfile.findOne({
            teacherCode: normalizedCode,
            status: 'active'
        });

        let toTeacherId = null;

        if (toTeacherProfile) {
            toTeacherId = toTeacherProfile.userId;
        } else {
            // Fallback: User obyekti orqali qidirish
            const toUser = await User.findOne({
                teacherCode: normalizedCode,
                role: 'teacher',
                status: 'active'
            });
            if (toUser) {
                toTeacherId = toUser._id;
            } else {
                return createApiError('TEACHER_NOT_FOUND', "Qabul qiluvchi o'qituvchi topilmadi", 404);
            }
        }

        if (toTeacherId.toString() === fromTeacherId) {
            return createApiError('BAD_REQUEST', "O'zingizga yubora olmaysiz", 400);
        }

        // 2. Jo'natuvchining barcha unitlarini Firestore'dan olish (faqat o'ziga tegishlilarini yuborishi kerak)
        const myUnits = await getUnits(fromTeacherId);
        const myUnitIds = myUnits.map((u: any) => u.id);

        const successfulUnitIds: string[] = [];
        const failed: { unitId: string, reason: string }[] = [];

        // 3. Har bir unitni tekshirish va ulashish
        for (const unitId of unitIds) {
            // Egalik huquqini tekshirish
            if (!myUnitIds.includes(unitId)) {
                failed.push({ unitId, reason: "Sizga tegishli bo'lmagan unit" });
                continue;
            }

            // O'zi bor-yo'qligini tekshirish
            const existingShare = await UnitShare.findOne({
                unitId: unitId,
                fromTeacherId: fromTeacherId,
                toTeacherId: toTeacherId
            });

            if (existingShare) {
                failed.push({ unitId, reason: "Ushbu unit avval yuborilgan" });
                continue;
            }

            // Yangi share yaratish
            await UnitShare.create({
                unitId: unitId,
                fromTeacherId: fromTeacherId,
                toTeacherId: toTeacherId,
                status: 'pending'
            });

            successfulUnitIds.push(unitId);
        }

        return NextResponse.json({
            message: `Ulashish natijasi: ${successfulUnitIds.length} ta muvaffaqiyatli, ${failed.length} ta xatolik`,
            successfulUnitIds,
            failed
        });

    } catch (error: any) {
        console.error('Bulk share xatoligi:', error);
        return createApiError('SERVER_ERROR', error.message || 'Serverda xatolik yuz berdi', 500);
    }
}
