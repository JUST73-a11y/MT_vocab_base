import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getServerSession } from "@/lib/serverAuth";
import QuizAttempt from "@/models/QuizAttempt";
import Word from "@/models/Word";
import StudentMistakeWord from "@/models/StudentMistakeWord";
import StudentEnergy from "@/models/StudentEnergy";

// POST /api/quiz/student/abandon
// Called when a student navigates away mid-quiz.
// - Marks the attempt as ended (no coins)
// - Saves any incorrectly-answered words to the mistakes list
export async function POST(req: NextRequest) {
    const session = await getServerSession();
    if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { attemptId, wrongWordIds } = body;

    if (!attemptId) return NextResponse.json({ error: "attemptId required" }, { status: 400 });

    await dbConnect();

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    // Security: make sure it belongs to this student
    if (attempt.studentId.toString() !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already ended
    if (attempt.endedAt) return NextResponse.json({ ok: true, alreadyClosed: true });

    // Mark as ended with no coins
    await QuizAttempt.findByIdAndUpdate(attemptId, {
        $set: { endedAt: new Date(), coinsEarned: 0, abandoned: true },
    });

    // Deduct 1 energy for abandoning the quiz (if applicable)
    if (attempt.mode === 'STUDENT_SELF') {
        await StudentEnergy.findOneAndUpdate(
            { studentId: session.id },
            { $inc: { energy: -1, totalUsed: 1 } }
        ).catch(() => {});
    }

    // Save incorrect words to StudentMistakeWord (if any)
    const badIds: string[] = Array.isArray(wrongWordIds) ? wrongWordIds : [];
    if (badIds.length > 0) {
        try {
            const words = await Word.find({ _id: { $in: badIds } }).lean() as any[];
            await Promise.all(words.map((w: any) =>
                StudentMistakeWord.findOneAndUpdate(
                    { studentId: session.id, wordId: w._id },
                    {
                        $inc: { wrongCount: 1 },
                        $set: { lastWrongAt: new Date(), unitId: w.unitId, isLearned: false },
                        $setOnInsert: { createdAt: new Date() },
                    },
                    { upsert: true, new: true }
                )
            ));
        } catch (e) {
            
        }
    }

    return NextResponse.json({ ok: true, mistakesSaved: badIds.length });
}
