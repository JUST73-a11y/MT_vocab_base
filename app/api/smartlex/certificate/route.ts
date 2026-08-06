import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Certificate from '@/models/Certificate';
import SmartLexProgress from '@/models/SmartLexProgress';
import Unit from '@/models/Unit';
import Word from '@/models/Word';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import CoinTransaction from '@/models/CoinTransaction';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import TeacherNotification from '@/models/TeacherNotification';
import { getServerSession } from '@/lib/serverAuth';

function formatLearningTime(seconds: number): string {
    if (!seconds || seconds < 60) return '1 Daqiqa';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return minutes > 0 ? `${hours} Soat ${minutes} Daqiqa` : `${hours} Soat`;
    }
    return `${minutes} Daqiqa`;
}

/** POST /api/smartlex/certificate
 * Body: { unitId, activeSecondsToAdd?: number }
 */
export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { unitId, activeSecondsToAdd = 0 } = body;
        if (!unitId) return NextResponse.json({ message: 'unitId is required' }, { status: 400 });

        await dbConnect();

        // 1. Fetch progress & Unit total words
        const [progress, totalWords, unitDoc, userDoc, groupMember] = await Promise.all([
            SmartLexProgress.findOne({ studentId: student.id, unitId }).lean(),
            Word.countDocuments({ unitId }),
            Unit.findById(unitId).lean(),
            User.findById(student.id).select('name teacherId').lean(),
            GroupMember.findOne({ studentId: student.id }).populate('groupId').lean(),
        ]);

        if (!unitDoc) return NextResponse.json({ message: 'Unit topilmadi' }, { status: 404 });

        const masteredWordIds: string[] = ((progress as any)?.masteredWordIds ?? []).map((id: any) => id.toString());
        const masteredCount = masteredWordIds.length;
        const remainingCount = Math.max(0, totalWords - masteredCount);

        // Required 8 activities/stages
        const completedActivities: string[] = (progress as any)?.completedActivities || [];
        const stageCount = (progress as any)?.activeSession?.currentStageIndex ?? 0;
        const isAllStagesDone = completedActivities.length >= 8 || stageCount >= 7;

        // Check if conditions met
        const isCompleted = totalWords > 0 && masteredCount >= totalWords && remainingCount === 0;

        // Check if certificate already generated
        let cert = await Certificate.findOne({ studentId: student.id, unitId }).lean();
        if (cert) {
            return NextResponse.json({
                certificate: cert,
                isNew: false,
                isEligible: true,
                masteredCount,
                totalWords,
                remainingCount,
            });
        }

        // If not eligible yet, return status
        if (!isCompleted) {
            return NextResponse.json({
                message: 'Unit hali 100% bajarilmagan. Barcha so\'zlar va bosqichlar yakunlanishi kerak.',
                isEligible: false,
                masteredCount,
                totalWords,
                remainingCount,
                isAllStagesDone,
            }, { status: 400 });
        }

        // Calculate Active Learning Time
        let totalActiveSeconds = ((progress as any)?.activeLearningTimeSeconds || 0) + (activeSecondsToAdd || 0);
        if (totalActiveSeconds < 60) totalActiveSeconds = 120; // Minimum default 2 mins active time if 0
        const formattedLearningTime = formatLearningTime(totalActiveSeconds);

        const now = new Date();
        const completionDate = now.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
        const completionTime = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });

        let teacherName = "Ustoz";
        let teacherId = (userDoc as any)?.teacherId || null;
        let groupName = (groupMember as any)?.groupId?.name || 'Guruh';

        if (!teacherId && (groupMember as any)?.groupId?.teacherId) {
            teacherId = (groupMember as any).groupId.teacherId;
        }

        if (teacherId) {
            const tDoc = await User.findById(teacherId).select('name').lean();
            if (tDoc) teacherName = (tDoc as any).name;
        }

        const studentName = (userDoc as any)?.name || 'O\'quvchi';
        const unitTitle = (unitDoc as any).title || 'Unit';

        // 2. Create Certificate
        const newCert = await Certificate.create({
            studentId: student.id,
            unitId,
            studentName,
            groupName,
            teacherName,
            teacherId,
            unitTitle,
            completionDate,
            completionTime,
            activeLearningTimeSeconds: totalActiveSeconds,
            formattedLearningTime,
            totalWords,
            activitiesCompleted: 8,
            coinsAwarded: 100,
            status: 'VERIFIED',
            earnedAt: now,
        });

        // 3. Award +100 MT Coins to Wallet
        await Wallet.findOneAndUpdate(
            { studentId: student.id },
            { $inc: { balance: 100 } },
            { upsert: true, new: true }
        );

        await CoinTransaction.create({
            studentId: student.id,
            teacherId: null,
            type: 'EARN_QUIZ',
            amount: 100,
            meta: { reason: `Sertifikat olindi: ${unitTitle}`, unitId, certId: newCert.certId },
        });

        // 4. Update SmartLexProgress completedAt
        await SmartLexProgress.updateOne(
            { studentId: student.id, unitId },
            { 
                $set: { 
                    completedAt: now,
                    activeLearningTimeSeconds: totalActiveSeconds
                } 
            }
        );

        // 5. Create Teacher Notification (if teacher exists)
        if (teacherId) {
            try {
                await TeacherNotification.create({
                    teacherId,
                    studentId: student.id,
                    studentName,
                    type: 'CERTIFICATE_AWARDED',
                    title: '🏆 Sertifikat topshirildi!',
                    message: `🎉 Tabriklaymiz! Sizning o'quvchingiz ${studentName} "${unitTitle}" bo'limini 100% muvaffaqiyatli yakunlab sertifikat va +100 MT Coins oldi.`,
                    unitId,
                    unitTitle,
                    certId: newCert.certId,
                });
            } catch (err) {
                console.error('Failed to save teacher notification:', err);
            }
        }

        // 6. Send Telegram Notification if group has telegramChatId
        const groupObj = (groupMember as any)?.groupId;
        if (groupObj && groupObj.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
            try {
                const tgMessage = `🎉 <b>TABRIKLAYMIZ!</b>\n\nO'quvchi: <b>${studentName}</b>\nGuruh: <b>${groupName}</b>\nBo'lim: <b>${unitTitle}</b>\n\n🏆 <b>MT-Vocab Sertifikati berildi!</b> (ID: <code>${newCert.certId}</code>)\n🪙 <b>+100 MT Coins</b> berildi!`;
                fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: groupObj.telegramChatId,
                        text: tgMessage,
                        parse_mode: 'HTML',
                    })
                }).catch(e => console.error('Telegram notification error:', e));
            } catch { }
        }

        return NextResponse.json({
            certificate: newCert,
            isNew: true,
            isEligible: true,
            coinsAwarded: 100,
        }, { status: 201 });
    } catch (e: any) {
        console.error('Certificate generation error:', e);
        return NextResponse.json({ message: 'Certificate generation error', error: e.message }, { status: 500 });
    }
}
