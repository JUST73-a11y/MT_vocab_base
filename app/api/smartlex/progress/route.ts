import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import SmartLexProgress from '@/models/SmartLexProgress';
import Word from '@/models/Word';
import { getServerSession } from '@/lib/serverAuth';
import mongoose from 'mongoose';

const EXPIRE_48H_MS = 48 * 60 * 60 * 1000;

/** GET /api/smartlex/progress?unitId=xxx OR ?allActive=true */
export async function GET(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student')
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');
        const allActive = searchParams.get('allActive') === 'true';

        await dbConnect();

        // If requesting all active sessions for Continue Learning section
        if (allActive) {
            const allProgress = await SmartLexProgress.find({ 
                studentId: student.id,
                'activeSession.lastActivity': { $ne: null }
            }).populate('unitId', 'title category').lean();

            const now = Date.now();
            const activeSessionsList: any[] = [];

            for (const prog of allProgress) {
                const session = (prog as any).activeSession;
                if (!session || !session.lastActivity) continue;

                const lastActTime = new Date(session.lastActivity).getTime();
                if (now - lastActTime > EXPIRE_48H_MS) {
                    // Auto-delete inactive session (>48h)
                    await SmartLexProgress.updateOne(
                        { _id: prog._id },
                        { $unset: { activeSession: 1 } }
                    );
                } else if ((prog as any).unitId) {
                    const unitObj = (prog as any).unitId;
                    const totalWords = await Word.countDocuments({ unitId: unitObj._id });
                    const masteredCount = (prog as any).masteredWordIds?.length || 0;
                    
                    activeSessionsList.push({
                        progressId: prog._id.toString(),
                        unitId: unitObj._id.toString(),
                        unitTitle: unitObj.title,
                        unitCategory: unitObj.category || "Bo'lim",
                        totalWords,
                        masteredCount,
                        activeSession: {
                            wordIds: (session.wordIds || []).map((id: any) => id.toString()),
                            currentStageIndex: session.currentStageIndex || 0,
                            lastActivity: session.lastActivity,
                        }
                    });
                }
            }

            return NextResponse.json({ activeSessions: activeSessionsList });
        }

        if (!unitId) return NextResponse.json({ message: 'unitId or allActive required' }, { status: 400 });

        const [progress, totalWords] = await Promise.all([
            SmartLexProgress.findOne({ studentId: student.id, unitId }).lean(),
            Word.countDocuments({ unitId }),
        ]);

        let activeSessionData = (progress as any)?.activeSession ?? null;
        if (activeSessionData && activeSessionData.lastActivity) {
            const lastActTime = new Date(activeSessionData.lastActivity).getTime();
            if (Date.now() - lastActTime > EXPIRE_48H_MS) {
                // Auto-delete expired session (>48h)
                await SmartLexProgress.updateOne(
                    { _id: (progress as any)._id },
                    { $unset: { activeSession: 1 } }
                );
                activeSessionData = null;
            }
        }

        const masteredWordIds: string[] = ((progress as any)?.masteredWordIds ?? []).map((id: any) => id.toString());
        const masteredCount = masteredWordIds.length;
        const pct = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

        return NextResponse.json({
            masteredWordIds,
            masteredCount,
            totalWords,
            pct,
            sessionCount: (progress as any)?.sessionCount ?? 0,
            completedAt: (progress as any)?.completedAt ?? null,
            activeSession: activeSessionData,
        });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error', error: e.message }, { status: 500 });
    }
}

/** POST /api/smartlex/progress
 * Body can specify one of the following actions:
 * - startNewSession: true, wordIds: string[]
 * - advanceStage: true, currentStageIndex: number
 * - completeSession: true, wordIds: string[] (adds to mastered and clears session)
 */
export async function POST(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student')
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { unitId, startNewSession, advanceStage, currentStageIndex, completeSession, wordIds } = body;
        if (!unitId) return NextResponse.json({ message: 'unitId required' }, { status: 400 });

        await dbConnect();

        const studentObjId = new mongoose.Types.ObjectId(student.id);
        const unitObjId = new mongoose.Types.ObjectId(unitId);

        let existing = await SmartLexProgress.findOne({ studentId: studentObjId, unitId: unitObjId });

        if (!existing) {
            existing = await SmartLexProgress.create({
                studentId: studentObjId,
                unitId: unitObjId,
                sessionCount: 0,
                masteredWordIds: [],
            });
        }

        const updateOps: any = {};

        if (startNewSession && wordIds) {
            updateOps.$set = {
                activeSession: {
                    wordIds: wordIds.map((id: string) => new mongoose.Types.ObjectId(id)),
                    currentStageIndex: 0,
                    lastActivity: new Date()
                }
            };
        } else if (advanceStage && typeof currentStageIndex === 'number') {
            updateOps.$max = {
                'activeSession.currentStageIndex': currentStageIndex
            };
            updateOps.$set = {
                ...(updateOps.$set || {}),
                'activeSession.lastActivity': new Date()
            };
        } else if (completeSession && wordIds) {
            const wordObjIds = wordIds.map((id: string) => new mongoose.Types.ObjectId(id));
            updateOps.$addToSet = { masteredWordIds: { $each: wordObjIds } };
            updateOps.$unset = { activeSession: 1 };
            updateOps.$inc = { sessionCount: 1 };
        }

        if (Object.keys(updateOps).length > 0) {
            await SmartLexProgress.updateOne({ _id: existing._id }, updateOps);
        }

        const updated = await SmartLexProgress.findOne({ studentId: studentObjId, unitId: unitObjId }).lean() as any;
        const totalWords = await Word.countDocuments({ unitId });
        const masteredCount = updated?.masteredWordIds?.length ?? 0;

        return NextResponse.json({
            masteredWordIds: (updated?.masteredWordIds ?? []).map((id: any) => id.toString()),
            masteredCount,
            totalWords,
            pct: totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0,
            activeSession: updated?.activeSession ?? null,
        });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error', error: e.message }, { status: 500 });
    }
}

/** DELETE /api/smartlex/progress?unitId=xxx (Manually clear activeSession) */
export async function DELETE(req: Request) {
    try {
        const student = await getServerSession();
        if (!student || student.role !== 'student')
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');
        if (!unitId) return NextResponse.json({ message: 'unitId required' }, { status: 400 });

        await dbConnect();

        await SmartLexProgress.updateOne(
            { studentId: student.id, unitId },
            { $unset: { activeSession: 1 } }
        );

        return NextResponse.json({ success: true, message: 'Unfinished session deleted successfully' });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error', error: e.message }, { status: 500 });
    }
}
