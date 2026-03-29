import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getServerSession } from '@/lib/serverAuth';
import User from '@/models/User';
import Unit from '@/models/Unit';
import TeacherProfile from '@/models/TeacherProfile';
import UnitShare from '@/models/UnitShare';
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

        // 2. Jo'natuvchining barcha unitlarini MongoDB'dan to'g'ridan-to'g'ri olish
        const myUnits = await Unit.find({ createdBy: fromTeacherId }).select('_id').lean();
        const myUnitIds = new Set(myUnits.map((u: any) => u._id.toString()));

        // 3. Clear ANY existing shares for these units to THIS teacher to allow a fresh start
        await UnitShare.deleteMany({
            unitId: { $in: unitIds },
            fromTeacherId: fromTeacherId,
            toTeacherId: toTeacherId
        });

        const toCreate: any[] = [];
        const failed: { unitId: string, reason: string }[] = [];

        for (const unitId of unitIds) {
            // Egalik huquqini tekshirish
            if (!myUnitIds.has(unitId)) {
                failed.push({ unitId, reason: "Sizga tegishli bo'lmagan unit" });
                continue;
            }

            toCreate.push({
                unitId: unitId,
                fromTeacherId: fromTeacherId,
                toTeacherId: toTeacherId,
                status: 'PENDING'
            });
        }

        // 4. Yangi sharelarni bulk yaratish
        if (toCreate.length > 0) {
            await UnitShare.insertMany(toCreate);
        }

        return NextResponse.json({
            message: `Muvaffaqiyatli ulashildi!`,
            summary: {
                total: unitIds.length,
                newlyShared: toCreate.length,
                failed: failed.length
            },
            failed
        });

    } catch (error: any) {
        
        return createApiError('SERVER_ERROR', error.message || 'Serverda xatolik yuz berdi', 500);
    }
}

