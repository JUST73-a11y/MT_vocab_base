'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import { ArrowLeft, Play, LayoutGrid, Timer, Users, User, LogOut, CheckCircle2, Target, Trophy, XCircle, Brain, BookOpen, Clock, HeartPulse, Sparkles, Languages, Save, Plus, ArrowRight, Zap, RefreshCw, BarChart2, Star, MessageCircle, AlertCircle, Loader2, RotateCcw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type QuizMode = 'EN' | 'UZ';
type Phase = 'pick' | 'quiz' | 'result';

interface Option { id: string; enText: string; uzText: string; }

interface Question {
    wordId: string;
    enText: string;
    uzText: string;
    phonetic?: string | null;
    options: Option[];
    servedAt: string;
    timeLimitSec: number;
}

interface Stats { correct: number; answered: number; total: number; }
interface AccessibleUnit { id: string; title: string; category?: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Timer Ring SVG Component
// ─────────────────────────────────────────────────────────────────────────────
function TimerRing({ remaining, total }: { remaining: number; total: number }) {
    const r = 30;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, remaining / total);
    const color = pct > 0.5 ? '#34d399' : pct > 0.25 ? '#fbbf24' : '#f87171';
    return (
        <div className="relative w-[72px] h-[72px] flex items-center justify-center">
            <svg width="72" height="72" className="absolute inset-0 -rotate-90">
                <circle cx="36" cy="36" r={r} fill="none" strokeWidth="4" stroke="rgba(255,255,255,0.1)" />
                <circle cx="36" cy="36" r={r} fill="none" strokeWidth="4"
                    stroke={color}
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - pct)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
                />
            </svg>
            <span className="relative z-10 text-lg font-black" style={{ color }}>
                {remaining}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentQuizPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Unit picker
    const [units, setUnits] = useState<AccessibleUnit[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(true);
    const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
    const [pickMode, setPickMode] = useState<QuizMode>('EN');
    const [pickTimerSec, setPickTimerSec] = useState(10);
    const [pickQuestionCount, setPickQuestionCount] = useState(10);
    const [activeGroupSession, setActiveGroupSession] = useState<any>(null);
    const [checkingSession, setCheckingSession] = useState(false);
    const [coinsEarned, setCoinsEarned] = useState<number | undefined>(undefined);

    // Quiz state
    const [phase, setPhase] = useState<Phase>('pick');
    const [mode, setMode] = useState<QuizMode>('EN');
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [question, setQuestion] = useState<Question | null>(null);
    const [stats, setStats] = useState<Stats>({ correct: 0, answered: 0, total: 0 });
    const [starting, setStarting] = useState(false);

    // Answer state
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [resultData, setResultData] = useState<{
        isCorrect: boolean;
        isTimeout: boolean;
        correctWordId: string;
        correctEnText: string;
        correctUzText: string;
        correctOptionId?: string;
    } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Timer
    const [timeLeft, setTimeLeft] = useState(10);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasTimedOut = useRef(false);

    // Overall stats — fetched from new stats API (today + all-time)
    const [overallStats, setOverallStats] = useState<{
        today: { correct: number; answered: number };
        total: { correct: number; answered: number };
    } | null>(null);

    // ── Auth guard
    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) router.push('/login');
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadUnits();
            loadOverallStats();
            checkActiveSession();
        }
    }, [user]);

    const checkActiveSession = async () => {
        setCheckingSession(true);
        try {
            const data = await apiFetch('/api/quiz/student/active-session');
            if (data?.session) {
                setActiveGroupSession(data.session);
                // Pre-select units from session
                if (data.session.unitIds) {
                    setSelectedUnitIds(new Set(data.session.unitIds));
                }
                setPickTimerSec(data.session.timeLimitSec || 10);

                // Auto-start check
                const autoStart = searchParams.get('autoStart') === 'true';
                const qsGroupSessionId = searchParams.get('groupSessionId');
                const sessionId = data.session._id?.toString() || data.session.id;

                if (autoStart && qsGroupSessionId === sessionId) {
                    // Slight delay to allow state updates to settle before starting
                    setTimeout(() => startQuiz(sessionId, data.session), 100);
                }
            }
        } catch { } finally { setCheckingSession(false); }
    };

    const loadUnits = async () => {
        setLoadingUnits(true);
        try {
            const data = await apiFetch('/api/units');
            setUnits((data || []).map((u: any) => ({ id: u.id || u._id?.toString(), title: u.title, category: u.category })));
        } catch { } finally { setLoadingUnits(false); }
    };

    const loadOverallStats = async () => {
        try {
            const [todayData, totalData] = await Promise.all([
                apiFetch('/api/quiz/student/stats?range=today'),
                apiFetch('/api/quiz/student/stats?range=all'),
            ]);
            if (todayData && totalData) {
                setOverallStats({
                    today: { correct: todayData.correct ?? 0, answered: todayData.wordsSeen ?? 0 },
                    total: { correct: totalData.correct ?? 0, answered: totalData.wordsSeen ?? 0 },
                });
            }
        } catch { }
    };

    // ── Timer logic
    const stopTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }, []);

    const startTimer = useCallback((limitSec: number) => {
        stopTimer();
        hasTimedOut.current = false;
        setTimeLeft(limitSec);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stopTimer();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [stopTimer]);

    // When timeLeft hits 0, auto-submit timeout
    useEffect(() => {
        if (phase === 'quiz' && timeLeft === 0 && !revealed && !hasTimedOut.current && !submitting) {
            hasTimedOut.current = true;
            // Use a slight delay to ensure the UI shows 0 before jumping
            setTimeout(() => {
                submitAnswer(null, true);
            }, 100);
        }
    }, [timeLeft, phase, revealed, submitting]);

    useEffect(() => {
        return () => stopTimer();
    }, [stopTimer]);

    // ── Keyboard navigation
    useEffect(() => {
        if (phase !== 'quiz' || revealed || !question) return;
        const handle = (e: KeyboardEvent) => {
            if (e.key === '1' || e.key === 'a' || e.key === 'A') triggerSelect(question.options[0]?.id);
            if (e.key === '2' || e.key === 'b' || e.key === 'B') triggerSelect(question.options[1]?.id);
            if (e.key === '3' || e.key === 'c' || e.key === 'C') triggerSelect(question.options[2]?.id);
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [phase, revealed, question]);

    const triggerSelect = (optId: string | undefined) => {
        if (!optId || revealed || submitting) return;
        submitAnswer(optId, false);
    };

    // ── Start quiz
    const startQuiz = async (joinSessionId?: string, sessionDataOverride?: any) => {
        const sessionToUse = sessionDataOverride || activeGroupSession;
        const unitsToUse = joinSessionId && sessionToUse ? sessionToUse.unitIds : [...selectedUnitIds];
        if (!unitsToUse || unitsToUse.length === 0) { toast.error('Kamida 1 ta unit tanlang'); return; }

        setStarting(true);
        setCoinsEarned(undefined);
        try {
            const data = await apiFetch('/api/quiz/student/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unitIds: unitsToUse,
                    timeLimitSec: joinSessionId ? sessionToUse.timeLimitSec : pickTimerSec,
                    questionCount: joinSessionId ? (sessionToUse.questionCount || 20) : pickQuestionCount,
                    sessionId: joinSessionId,
                    mode: joinSessionId ? 'GROUP_SESSION' : 'STUDENT_SELF'
                }),
            });
            setAttemptId(data.attemptId);
            setQuestion(data.question);
            setStats({ correct: 0, answered: 0, total: data.questionCountPlanned || data.total });
            setMode(pickMode);
            setPhase('quiz');
            setSelectedId(null); setRevealed(false); setResultData(null);
            startTimer(data.question.timeLimitSec ?? (joinSessionId && sessionToUse ? sessionToUse.timeLimitSec : pickTimerSec));
        } catch (err: any) {
            toast.error(err?.message || 'Xato yuz berdi');
        } finally { setStarting(false); }
    };

    // ── Submit answer (null = timeout)
    const submitAnswer = async (optId: string | null, isTimeout: boolean) => {
        if (!attemptId || !question || submitting) return;
        stopTimer();
        setSubmitting(true);
        if (optId) setSelectedId(optId);
        setRevealed(true);

        try {
            // Sanitize variables for submission logic (Ensure UTC ISO)
            const safeServedAt = question.servedAt ? new Date(question.servedAt).toISOString() : new Date().toISOString();

            const data = await apiFetch('/api/quiz/student/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId,
                    wordId: question.wordId,
                    selectedOption: optId, // standardized field name
                    selectedOptionId: optId, // backwards compatibility if needed
                    modeAtAnswerTime: mode,
                    servedAt: safeServedAt,
                    timeLimitSec: question.timeLimitSec,
                }),
            });

            setResultData({
                isCorrect: data.isCorrect,
                isTimeout: data.isTimeout,
                correctWordId: data.correctWordId,
                correctEnText: data.correctEnText,
                correctUzText: data.correctUzText,
                correctOptionId: data.correctOptionId
            });
            setStats({ correct: data.stats.correct, answered: data.stats.answered, total: stats.total });

            // Auto advance after reveal
            setTimeout(() => {
                if (data.nextQuestion && !data.quizDone) {
                    setQuestion(data.nextQuestion);
                    setSelectedId(null); setRevealed(false); setResultData(null);
                    hasTimedOut.current = false;
                    startTimer(data.nextQuestion.timeLimitSec ?? question.timeLimitSec);
                } else {
                    if (data.coinsEarned !== undefined) setCoinsEarned(data.coinsEarned);
                    setPhase('result');
                    loadOverallStats();
                }
                setSubmitting(false);
            }, data.isTimeout ? 1000 : 1200);
        } catch (err: any) {
            toast.error(err?.message || 'Xato yuz berdi');
            setSubmitting(false);
            setRevealed(false); setSelectedId(null);
        }
    };

    const resetQuiz = () => {
        stopTimer();
        setPhase('pick'); setAttemptId(null); setQuestion(null);
        setStats({ correct: 0, answered: 0, total: 0 });
        setSelectedId(null); setRevealed(false); setResultData(null);
        setSelectedUnitIds(new Set()); hasTimedOut.current = false;
    };

    // ── Mode switch mid-quiz (display only, no re-fetch)
    const toggleMode = () => setMode(m => m === 'EN' ? 'UZ' : 'EN');

    if (loading || !user) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // PICK PHASE
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === 'pick') {
        return (
            <div className="min-h-screen text-white">
                <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8 justify-self-center w-full">

                    {/* Header */}
                    <div className="text-center hidden md:block">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.3)' }}>
                            <Brain className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Quiz</h1>
                        <p className="text-white/40 mt-2 text-sm">So&apos;zlarni tekshirish uchun sozlang</p>
                    </div>

                    {/* Overall stats */}
                    {overallStats && (
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Bugun to'g'ri", value: overallStats.today.correct, sub: `${overallStats.today.answered} so'z ko'rildi`, icon: Zap, color: 'rgba(99,102,241,0.15)', tc: '#818cf8' },
                                { label: "Jami to'g'ri", value: overallStats.total.correct, sub: `${overallStats.total.answered} so'z ko'rildi`, icon: Target, color: 'rgba(16,185,129,0.15)', tc: '#34d399' },
                            ].map(s => (
                                <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3"
                                    style={{ background: s.color, border: `1px solid ${s.tc}30` }}>
                                    <s.icon className="w-5 h-5 shrink-0" style={{ color: s.tc }} />
                                    <div>
                                        <p className="text-2xl font-black text-white">{s.value}</p>
                                        <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">{s.label}</p>
                                        <p className="text-[10px] text-white/25">{s.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Settings row */}
                    <div className="grid grid-cols-1 gap-3">
                        {/* Question count selector (self mode only) */}
                        {!activeGroupSession && (
                            <div className="rounded-2xl p-4 flex flex-col gap-3"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5" /> Savollar soni
                                </p>
                                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                                    {[5, 10, 15, 20, 30].map(n => (
                                        <button key={n} onClick={() => setPickQuestionCount(n)}
                                            className="flex-1 py-2 rounded-lg text-xs font-black transition-all"
                                            style={pickQuestionCount === n
                                                ? { background: 'rgba(99,102,241,0.7)', color: '#fff' }
                                                : { color: 'rgba(255,255,255,0.3)' }}>
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeGroupSession ? (
                            <div className="rounded-2xl p-6 flex flex-col gap-4 animate-pulse-slow"
                                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-5 h-5 text-indigo-400 animate-pulse" />
                                        <div>
                                            <p className="text-xs font-black text-white/60 uppercase tracking-widest">Active Group Quiz</p>
                                            <p className="text-lg font-black text-white">{activeGroupSession.groupName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">O&apos;qituvchi</p>
                                        <p className="text-xs font-bold text-indigo-300">{activeGroupSession.teacherName}</p>
                                    </div>
                                </div>
                                <button onClick={() => startQuiz(activeGroupSession.id)}
                                    className="w-full btn-premium py-4 text-sm flex items-center justify-center gap-2">
                                    <Play className="w-4 h-4 fill-current" /> QO&apos;SHILISH
                                </button>
                            </div>
                        ) : (
                            <div className="rounded-2xl p-4 flex flex-col gap-3"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                                    <Languages className="w-3.5 h-3.5" /> Savol tili
                                </p>
                                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                                    {(['EN', 'UZ'] as QuizMode[]).map(m => (
                                        <button key={m} onClick={() => setPickMode(m)}
                                            className="flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                            style={pickMode === m ? { background: 'rgba(99,102,241,0.7)', color: '#fff' } : { color: 'rgba(255,255,255,0.3)' }}>
                                            {m === 'EN' ? 'EN → UZ' : 'UZ → EN'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Unit picker */}
                    <div className="rounded-2xl p-5 flex flex-col gap-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-400" /> Unitlar
                            </h2>
                            {selectedUnitIds.size > 0 && (
                                <span className="text-xs font-black text-indigo-400 px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)' }}>
                                    {selectedUnitIds.size} tanlandi
                                </span>
                            )}
                        </div>

                        {loadingUnits ? (
                            <div className="space-y-2">{[1, 2, 3, 4].map(i =>
                                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
                        ) : units.length === 0 ? (
                            <div className="text-center py-8 text-white/30">
                                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Sizga hali unit berilmagan</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                {units.map(unit => {
                                    const isSel = selectedUnitIds.has(unit.id);
                                    return (
                                        <button key={unit.id} onClick={() => setSelectedUnitIds(prev => {
                                            const n = new Set(prev); n.has(unit.id) ? n.delete(unit.id) : n.add(unit.id); return n;
                                        })}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                                            style={{ background: isSel ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isSel ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}` }}>
                                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                                                style={{ background: isSel ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.08)', border: `1px solid ${isSel ? 'transparent' : 'rgba(255,255,255,0.12)'}` }}>
                                                {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-white truncate">{unit.title}</p>
                                                {unit.category && <p className="text-[10px] text-white/30 truncate">{unit.category}</p>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {!activeGroupSession && (
                        <button onClick={() => startQuiz()} disabled={starting || selectedUnitIds.size === 0}
                            className="btn-premium py-4 text-base font-black flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed">
                            {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            Boshlash · {pickQuestionCount} savol · {pickTimerSec}s
                        </button>
                    )}
                </div>
                <style jsx global>{`.custom-scrollbar::-webkit-scrollbar{width:4px}.custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:8px}`}</style>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // QUIZ PHASE
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === 'quiz' && question) {
        const timeLimitSec = question.timeLimitSec ?? 10;
        const progress = stats.total > 0 ? ((stats.answered) / stats.total) * 100 : 0;

        // Derive prompt and options based on mode
        const promptText = mode === 'EN' ? question.enText : question.uzText;
        const prompt2 = mode === 'EN' ? question.phonetic : null;

        // Map options to display text based on mode
        const displayOptions = question.options.map(o => ({
            id: o.id,
            text: mode === 'EN' ? o.uzText : o.enText,
        }));

        const getOptionStyle = (optId: string) => {
            if (!revealed) return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' };

            // If API hasn't responded yet, show pending state for selected option
            if (!resultData) {
                if (optId === selectedId) return { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.4)', color: '#818cf8' };
                return { bg: 'rgba(255,255,255,0.01)', border: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)' };
            }

            // Identify correct option strictly via its immutable ID
            const isThisCorrectOpt = resultData.correctOptionId === optId;

            if (isThisCorrectOpt) return { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.4)', color: '#6ee7b7' };
            if (optId === selectedId) return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', color: '#fca5a5' };

            return { bg: 'rgba(255,255,255,0.01)', border: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)' };
        };

        return (
            <div className="min-h-screen text-white flex flex-col">

                {/* ── Premium Sticky Header ── */}
                <div className="sticky top-0 z-40 px-4 py-4 md:px-8 md:py-6 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between gap-2"
                    style={{ background: 'rgba(10,12,25,0.85)' }}>

                    <div className="flex items-center gap-6">
                        <button onClick={resetQuiz}
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-lg shadow-black/20">
                            <ArrowLeft className="w-6 h-6" />
                        </button>

                        <div className="hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-0.5">Quiz Mode</p>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                                <Languages className="w-3.5 h-3.5" />
                                {mode === 'EN' ? 'EN → UZ' : 'UZ → EN'}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 truncate max-w-[120px] whitespace-nowrap">
                            {stats.answered >= stats.total && stats.total > 0
                                ? `Loop ${Math.floor(stats.answered / stats.total) + 1} • Q: ${stats.answered + 1}`
                                : `${stats.answered + 1} of ${stats.total}`}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                            {Array.from({ length: 5 }).map((_, i) => {
                                const progress = stats.answered >= stats.total && stats.total > 0
                                    ? ((stats.answered % stats.total) / stats.total) * 5
                                    : (stats.answered / stats.total) * 5;
                                return (
                                    <div key={i}
                                        className={`h-1 rounded-full transition-all duration-500 ${progress > i ? 'w-4 bg-indigo-500' : 'w-2 bg-white/10'}`}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="flex items-center gap-3 sm:gap-6">
                            <div className="text-center sm:text-right">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400/60 leading-tight">To&apos;g&apos;ri</p>
                                <p className="text-lg sm:text-xl font-black text-emerald-400 sm:text-white leading-tight">{stats.correct}</p>
                            </div>
                            <div className="text-center sm:text-right">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-400/60 leading-tight">Xato</p>
                                <p className="text-lg sm:text-xl font-black text-rose-400 sm:text-white leading-tight">{stats.answered - stats.correct}</p>
                            </div>
                            <div className="text-center sm:text-right pr-3 sm:pr-5 border-r border-white/10">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/50 leading-tight">Jami</p>
                                <p className="text-lg sm:text-xl font-black text-white leading-tight">{stats.answered}</p>
                            </div>
                        </div>
                        <div className="relative group">
                            <div className="absolute -inset-2 bg-indigo-500/30 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity" />
                            <TimerRing remaining={timeLeft} total={timeLimitSec} />
                        </div>
                    </div>
                </div>

                {/* ── Progress bar */}
                <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                        style={{ width: `${progress}%` }} />
                </div>

                {/* ── Main area */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 pb-12 max-w-xl mx-auto w-full gap-8">

                    {/* Question card */}
                    {/* ── Massive Question Display ── */}
                    <div className="w-full text-center rounded-[3rem] px-6 py-12 md:px-10 md:py-20 flex flex-col items-center gap-6 relative overflow-visible active-scale-up"
                        style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)'
                        }}>
                        {/* Background subtle glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

                        <div className="space-y-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400 opacity-60 flex items-center justify-center gap-3">
                                <span className="w-8 h-px bg-indigo-500/30" />
                                {mode === 'EN' ? '🇬🇧 English' : '🇺🇿 O\'zbek'}
                                <span className="w-8 h-px bg-indigo-500/30" />
                            </p>
                            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-snug break-words drop-shadow-2xl max-w-full">
                                {promptText}
                            </h2>
                            {prompt2 && (
                                <p className="text-indigo-300/40 text-xl md:text-2xl font-medium tracking-tight italic">{prompt2}</p>
                            )}
                        </div>

                        {/* Status feedback */}
                        {revealed && (
                            <div className={`px-8 py-2.5 rounded-full text-sm font-black uppercase tracking-[0.2em] animate-bounce-slow flex items-center gap-3 border transition-colors ${!resultData ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                resultData.isCorrect ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                    resultData.isTimeout ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                        'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}>
                                {!resultData ? (
                                    <> <Loader2 className="w-4 h-4 animate-spin" /> Tekshirilmoqda... </>
                                ) : resultData.isCorrect ? (
                                    <> <CheckCircle2 className="w-4 h-4" /> Juda yaxshi! </>
                                ) : resultData.isTimeout ? (
                                    <> <Timer className="w-4 h-4" /> Vaqt tugadi! </>
                                ) : (
                                    <> <XCircle className="w-4 h-4" /> Noto&apos;g&apos;ri </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Options ── Grid/List */}
                    <div className="w-full grid grid-cols-1 gap-4">
                        {displayOptions.map((opt, i) => {
                            const s = getOptionStyle(opt.id);
                            return (
                                <button key={opt.id}
                                    onClick={() => !revealed && !submitting && submitAnswer(opt.id, false)}
                                    disabled={revealed || submitting}
                                    className="group w-full flex items-center gap-6 p-6 rounded-3xl text-left font-black text-lg transition-all duration-300 disabled:cursor-default relative overflow-hidden"
                                    style={{
                                        background: s.bg,
                                        border: `1px solid ${s.border}`,
                                        color: s.color,
                                        transform: revealed && opt.id === selectedId ? 'scale(0.98)' : 'none'
                                    }}>

                                    {/* Glass reflection effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 transition-all shadow-inner"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        {['A', 'B', 'C'][i]}
                                    </span>
                                    <span className="flex-1 tracking-tight break-words whitespace-normal leading-snug">{opt.text}</span>

                                    {revealed && (() => {
                                        if (!resultData) {
                                            if (opt.id === selectedId) return <div className="p-2 rounded-full bg-indigo-500/20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;
                                            return null;
                                        }

                                        const isThisCorrectOpt = resultData.correctOptionId === opt.id;
                                        if (isThisCorrectOpt) return <div className="p-2 rounded-full bg-emerald-500/20"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>;
                                        if (opt.id === selectedId) return <div className="p-2 rounded-full bg-red-500/20"><XCircle className="w-6 h-6 text-red-400" /></div>;
                                        return null;
                                    })()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Keyboard hint */}
                    <div className="mt-4 py-2 px-6 rounded-2xl bg-white/5 border border-white/5 inline-flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Shortcuts</span>
                        <div className="flex gap-1.5">
                            {['1', '2', '3'].map(k => <kbd key={k} className="px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] font-black text-white/40">{k}</kbd>)}
                        </div>
                    </div>
                </div>



            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // RESULT PHASE
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === 'result') {
        const accuracy = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
        return (
            <div className="min-h-screen text-white flex items-center justify-center px-4">
                <div className="max-w-md w-full flex flex-col gap-6 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.2),rgba(251,191,36,0.08))', border: '1px solid rgba(245,158,11,0.3)' }}>
                            <Trophy className="w-12 h-12 text-amber-400" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white">Quiz Tugadi!</h1>
                            <p className="text-white/40 mt-1">
                                {accuracy >= 80 ? '🔥 Ajoyib natija!' : accuracy >= 50 ? '👍 Yaxshi!' : '💪 Davom eting!'}
                            </p>
                        </div>
                    </div>

                    {/* MT Coins earned banner */}
                    {coinsEarned !== undefined && coinsEarned > 0 && (
                        <div className="rounded-2xl p-5 flex items-center justify-center gap-4 animate-fade-in"
                            style={{ background: 'linear-gradient(135deg,rgba(234,179,8,0.15),rgba(234,179,8,0.05))', border: '1px solid rgba(234,179,8,0.3)' }}>
                            <span className="text-4xl">🪙</span>
                            <div className="text-left">
                                <p className="text-xs font-black text-yellow-400/70 uppercase tracking-widest">MT Coin topildi!</p>
                                <p className="text-3xl font-black text-yellow-300">+{coinsEarned} MT Coin</p>
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/25 mb-4">Bu session</p>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: "To'g'ri", value: stats.correct, color: '#34d399' },
                                { label: 'Javob', value: stats.answered, color: '#818cf8' },
                                { label: 'Aniqlik', value: `${accuracy}%`, color: '#fbbf24' },
                            ].map(s => (
                                <div key={s.label}>
                                    <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {overallStats && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 mb-1">Bugun jami</p>
                                <p className="text-2xl font-black text-white">{overallStats.today.correct}</p>
                                <p className="text-[10px] text-white/30">{overallStats.today.answered} ta javob</p>
                            </div>
                            <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/60 mb-1">Jami hammasi</p>
                                <p className="text-2xl font-black text-white">{overallStats.total.correct}</p>
                                <p className="text-[10px] text-white/30">{overallStats.total.answered} ta javob</p>
                            </div>
                        </div>
                    )}

                    <button onClick={resetQuiz} className="btn-premium py-4 font-black flex items-center justify-center gap-3">
                        <RotateCcw className="w-5 h-5" /> Qayta O&apos;ynash
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
