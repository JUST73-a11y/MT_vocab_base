'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { 
    Trophy, Award, Flame, Zap, Shield, Users, Clock, 
    BookOpen, Sparkles, Target, Star, Brain, Gamepad2, AlertTriangle,
    Home, FileText, BarChart3, TrendingUp, Medal, Activity, ChevronRight, ChevronDown, Eye, EyeOff, User as UserIcon
} from 'lucide-react';

interface ScoreEvent {
    id: string;
    points: number;
    category: string;
    reason: string;
    isReversal: boolean;
    createdAt: string;
}

interface StudentScoreData {
    hasGroup: boolean;
    studentName?: string;
    group?: {
        id: string;
        name: string;
        level: string;
        teacherName: string;
        totalMembers: number;
    };
    studentScore?: {
        rank: number;
        totalStudents: number;
        todayXP: number;
        weekXP: number;
        monthXP: number;
        lifetimeXP: number;
        categories: Record<string, number>;
    };
    leaderboard?: Array<{
        id: string;
        name: string;
        isCurrentStudent: boolean;
        todayXP: number;
        weekXP: number;
        monthXP: number;
        lifetimeXP: number;
        categories?: Record<string, number>;
    }>;
    myEvents?: ScoreEvent[];
    recentEvents?: ScoreEvent[];
}

const CATS_META: Record<string, { name: string; color: string; bg: string; icon: any; emoji: string }> = {
    homework: { name: 'Homework', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: Home, emoji: '🏠' },
    vocab: { name: 'Vocabulary', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: BookOpen, emoji: '📚' },
    grammar: { name: 'Grammar', color: '#ec4899', bg: 'rgba(236,72,153,0.15)', icon: Brain, emoji: '🧠' },
    participation: { name: 'Participation', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: Star, emoji: '⭐' },
    behavior: { name: 'Behavior', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: Shield, emoji: '🛡️' },
    quiz: { name: 'Quiz', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: FileText, emoji: '📝' },
    game: { name: 'Game', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: Gamepad2, emoji: '🎮' },
    bonus: { name: 'Bonus', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: Flame, emoji: '🔥' },
    penalty: { name: 'Penalty', color: '#f97316', bg: 'rgba(249,115,22,0.15)', icon: AlertTriangle, emoji: '⚠️' },
    other: { name: 'Other', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: Zap, emoji: '✨' }
};

export default function StudentScoresPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<StudentScoreData | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [floatingPoints, setFloatingPoints] = useState<number | null>(null);

    // Chart & Collapsible Accordion States
    const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'lifetime'>('week');
    const [catFilter, setCatFilter] = useState<string>('all');
    const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false); // Accordion Collapsed by default

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }
        if (user) {
            loadScores();
        }
    }, [user, loading, router]);

    // Setup Real-Time SSE Listener
    useEffect(() => {
        if (!data?.group?.id) return;

        const sseUrl = `/api/classroom-scores/stream?groupId=${data.group.id}`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.type === 'SCORE_ADDED' || payload.type === 'SCORE_REVERSED') {
                    loadScores(false);
                    if (payload.event && payload.event.studentId === user?.id) {
                        setFloatingPoints(payload.event.points);
                        setTimeout(() => setFloatingPoints(null), 3500);
                    }
                }
            } catch (err) {}
        };

        return () => {
            es.close();
        };
    }, [data?.group?.id, user?.id]);

    const loadScores = async (showLoading = true) => {
        if (showLoading) setLoadingData(true);
        try {
            const res = await apiFetch('/api/student/scores');
            setData(res);
        } catch (error) {
            console.error('Error fetching student scores:', error);
        } finally {
            if (showLoading) setLoadingData(false);
        }
    };

    const studentName = data?.studentName || user?.name || 'O‘quvchi';

    // Canvas Vertical Bar Chart Drawer with DYNAMIC SCROLL WIDTH & ROTATED LABELS (Fixes overlap issue #2)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data?.leaderboard?.length) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const list = data.leaderboard;
        // Dynamically compute canvas width so student names NEVER overlap
        const minSlotWidth = 54;
        const computedW = Math.max(720, list.length * minSlotWidth);
        const W = canvas.width = computedW;
        const H = canvas.height = 320;
        ctx.clearRect(0, 0, W, H);

        const getPoints = (item: any) => {
            if (timeFilter === 'today') {
                return catFilter === 'all' ? item.todayXP : (item.categories?.[catFilter] || 0);
            }
            if (timeFilter === 'week') {
                return item.weekXP;
            }
            if (timeFilter === 'month') {
                return item.monthXP;
            }
            return item.lifetimeXP;
        };

        const maxPts = Math.max(10, ...list.map(s => getPoints(s)));
        const padL = 45, padR = 25, padT = 40, padB = 65;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        // Draw horizontal grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padT + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();

            const val = Math.round(maxPts * (1 - i / 4));
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(String(val), padL - 8, y + 4);
        }

        const barCount = list.length;
        const slotW = chartW / barCount;
        const barW = Math.max(14, Math.min(38, slotW - 12));

        list.forEach((item, idx) => {
            const pts = getPoints(item);
            const x = padL + idx * slotW + (slotW - barW) / 2;
            const barH = (pts / maxPts) * chartH;
            const y = padT + chartH - barH;

            // Bar Gradient: Bright Orange/Amber for Logged-in student (YOU), Rich Purple/Indigo for others
            const grad = ctx.createLinearGradient(x, y, x, padT + chartH);
            if (item.isCurrentStudent) {
                grad.addColorStop(0, '#fbbf24');
                grad.addColorStop(0.4, '#f59e0b');
                grad.addColorStop(1, '#ea580c');
            } else {
                grad.addColorStop(0, '#a855f7');
                grad.addColorStop(0.5, '#8b5cf6');
                grad.addColorStop(1, '#6366f1');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === 'function') {
                (ctx as any).roundRect(x, y, barW, Math.max(3, barH), [8, 8, 0, 0]);
            } else {
                ctx.rect(x, y, barW, Math.max(3, barH));
            }
            ctx.fill();

            // Score label above bar
            ctx.fillStyle = item.isCurrentStudent ? '#fbbf24' : '#ffffff';
            ctx.font = item.isCurrentStudent ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(pts), x + barW / 2, Math.max(18, y - 8));

            // Student name below bar (Rotated cleanly at -30 deg if many students, or truncated)
            const firstName = item.name.split(' ')[0];
            ctx.save();
            ctx.translate(x + barW / 2, H - 25);
            if (list.length > 10) {
                ctx.rotate(-0.45); // -25 degrees rotation for perfect readability
            }
            ctx.fillStyle = item.isCurrentStudent ? '#fde68a' : 'rgba(255, 255, 255, 0.75)';
            ctx.font = item.isCurrentStudent ? 'bold 11px sans-serif' : '10px sans-serif';
            ctx.textAlign = list.length > 10 ? 'right' : 'center';
            ctx.fillText(firstName.slice(0, 10), 0, 0);
            ctx.restore();
        });
    }, [data?.leaderboard, timeFilter, catFilter]);

    if (loading || loadingData) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!data || !data.hasGroup || !data.group || !data.studentScore) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full px-4 text-center animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                    <Trophy className="w-12 h-12 text-white/30" />
                </div>
                <h1 className="text-3xl font-black text-white mb-3">Siz hali biror guruhga biriktirilmagansiz</h1>
                <p className="text-slate-400 text-base max-w-md mx-auto leading-relaxed">
                    Ustozingiz sizni guruhga qo'shgandan so'ng, darsdagi jonli ballaringiz, guruh taqqoslov charti va guruh reytingi shu yerda ko'rinadi.
                </p>
            </div>
        );
    }

    const { group, studentScore, leaderboard = [], recentEvents = [] } = data;

    return (
        <div className="w-full max-w-[1600px] mx-auto py-6 px-3 sm:px-6 lg:px-8 animate-fade-in flex flex-col gap-6 pb-24 font-sans text-[#e2e8f0] box-border">
            
            {/* Real-time Floating Point Notification Toast */}
            {floatingPoints !== null && (
                <div className="fixed top-24 right-8 z-50 animate-bounce bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl shadow-2xl border-2 border-amber-200 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-slate-950 animate-spin" />
                    <span className="text-base font-black">Ustozingizdan {floatingPoints > 0 ? `+${floatingPoints}` : floatingPoints} XP keldi! 🎉</span>
                </div>
            )}

            {/* ── 1. STUDENT ANALYTICS HERO (SYMMETRIC NAV-MATCHING WIDTH) ── */}
            <div 
                className="p-6 sm:p-8 rounded-[24px] border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(10, 15, 30, 0.94) 100%)',
                    backdropFilter: 'blur(25px)',
                }}
            >
                {/* Background Ambient Glow */}
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/20 rounded-full blur-[90px] pointer-events-none" />

                <div className="flex items-center gap-5 relative z-10">
                    {/* Student Avatar / Initial */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 border-2 border-indigo-300 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl shadow-indigo-500/30 shrink-0">
                        {studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                🏆 {studentName} — Shaxsiy Analitika
                            </h1>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Real-vaqtli Sinxron
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 font-medium mt-1 flex-wrap">
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                                Guruh: <strong className="text-indigo-300 font-bold">{group.name} ({group.level})</strong>
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                                Ustoz: <strong className="text-white font-bold">{group.teacherName}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Rank Badge */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 flex items-center gap-4 shrink-0 shadow-xl relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30">
                        #{studentScore.rank}
                    </div>
                    <div>
                        <p className="text-[11px] uppercase tracking-widest font-black text-amber-400 flex items-center gap-1">
                            <Medal className="w-3.5 h-3.5" /> Guruhdagi O‘rningiz
                        </p>
                        <h3 className="text-xl font-black text-white">{studentScore.rank} / {studentScore.totalStudents} - o‘rin</h3>
                        <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                            {studentScore.rank === 1 ? '🥇 Sinf Chempioni!' : 'Peshqadamlar safiga harakat qiling!'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 8. DAILY / WEEKLY / MONTHLY / TOTAL SUMMARY COMPACT CARDS ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 flex flex-col gap-1 shadow-lg backdrop-blur-xl">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Bugun</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">+{studentScore.todayXP} XP</span>
                    <span className="text-[10px] text-slate-400 font-medium">Bugungi dars faolligi</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-500/30 bg-indigo-500/5 flex flex-col gap-1 shadow-lg backdrop-blur-xl">
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">Bu Hafta</span>
                    <span className="text-2xl sm:text-3xl font-black text-indigo-400">+{studentScore.weekXP} XP</span>
                    <span className="text-[10px] text-slate-400 font-medium">Haftalik umumiy ball</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 bg-purple-500/5 flex flex-col gap-1 shadow-lg backdrop-blur-xl">
                    <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider">Bu Oy</span>
                    <span className="text-2xl sm:text-3xl font-black text-purple-400">+{studentScore.monthXP} XP</span>
                    <span className="text-[10px] text-slate-400 font-medium">Oylik to‘plangan ball</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 bg-amber-500/5 flex flex-col gap-1 shadow-lg backdrop-blur-xl">
                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">Jami Ball</span>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">{studentScore.lifetimeXP} XP</span>
                    <span className="text-[10px] text-slate-400 font-medium">Umumiy sinf jamg‘armasi</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/30 bg-rose-500/5 flex flex-col gap-1 shadow-lg backdrop-blur-xl col-span-2 md:col-span-1">
                    <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider">O‘rin</span>
                    <span className="text-2xl sm:text-3xl font-black text-rose-400">#{studentScore.rank} <span className="text-xs font-normal text-slate-400">/ {studentScore.totalStudents}</span></span>
                    <span className="text-[10px] text-slate-400 font-medium">Guruh reytingi</span>
                </div>
            </div>

            {/* ── 2 & 3. DESKTOP TWO-COLUMN: GROUP COMPARISON BAR CHART & COLLAPSIBLE CATEGORY ACCORDION ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: GROUP COMPARISON BAR CHART (Col 7 — CLEAN NON-OVERLAPPING SCROLLABLE CANVAS) */}
                <div 
                    className="lg:col-span-7 p-6 rounded-[24px] border border-white/10 shadow-2xl flex flex-col gap-5"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.92) 100%)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Chart Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-white">
                                    📊 Guruhdoshlar Taqqoslovi (Group Performance)
                                </h3>
                                <p className="text-xs text-slate-300 mt-0.5 font-medium">Siz va guruhdoshlaringiz dars natijalari taqqoslovi</p>
                            </div>
                        </div>

                        {/* Time Filter Pills (Gapped & Padded) */}
                        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                            {(['today', 'week', 'month', 'lifetime'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTimeFilter(t)}
                                    className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                                        timeFilter === t ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {t === 'today' ? 'Bugun' : t === 'week' ? 'Hafta' : t === 'month' ? 'Oy' : 'Jami'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Filter Pills for Bar Chart */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        <button
                            onClick={() => setCatFilter('all')}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase shrink-0 transition-all cursor-pointer ${
                                catFilter === 'all' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'bg-white/5 text-slate-300'
                            }`}
                        >
                            ✨ Barchasi
                        </button>
                        {Object.entries(CATS_META).map(([id, meta]) => (
                            <button
                                key={id}
                                onClick={() => setCatFilter(id)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                                    catFilter === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-300'
                                }`}
                            >
                                {meta.emoji} {meta.name}
                            </button>
                        ))}
                    </div>

                    {/* Horizontally Scrollable Canvas Wrapper (Fixes Name Overlap #2) */}
                    <div className="w-full bg-black/40 p-4 rounded-2xl border border-white/5 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-600/40 relative">
                        <canvas ref={canvasRef} className="h-auto max-h-[320px] block" />
                    </div>
                </div>

                {/* RIGHT: COLLAPSIBLE CATEGORY PERFORMANCE ACCORDION (MATCHES BAR CHART HEIGHT EXACTLY) */}
                <div 
                    className="lg:col-span-5 p-6 rounded-[24px] border border-white/10 shadow-2xl flex flex-col gap-4 transition-all duration-300"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.92) 100%)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Header with Collapsible Toggle Button */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
                                <Target className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-black text-white truncate">📚 Category Performance</h3>
                                <p className="text-xs text-slate-300 mt-0.5 font-medium truncate">Kategoriyalar bo‘yicha taqsimot</p>
                            </div>
                        </div>

                        {/* Interactive "Ko'rish" / "Accordion Toggle" Button */}
                        <button
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-black border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md"
                        >
                            <span>{isCategoryOpen ? '📜 Yopish' : '👁️ Ko‘rish'}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Summary Row when Collapsed */}
                    {!isCategoryOpen && (
                        <div 
                            onClick={() => setIsCategoryOpen(true)}
                            className="p-4 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between gap-3 cursor-pointer hover:border-purple-500/40 transition-all"
                        >
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-bold text-slate-300">10 ta Kategoriya Ballari:</span>
                            </div>
                            <span className="text-xs font-black text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                                👁️ Barcha 10 ta kategoriyani ko‘rish
                            </span>
                        </div>
                    )}

                    {/* Full Breakdown Cards (Expanded via Accordion — MATCHES BAR CHART HEIGHT & SCROLLS CLEANLY) */}
                    {isCategoryOpen && (
                        <div className="grid grid-cols-1 gap-2.5 mt-1 animate-in fade-in slide-in-from-top-2 duration-300 max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-purple-500/40">
                            {Object.entries(CATS_META).map(([key, cat]) => {
                                const Icon = cat.icon;
                                const pts = studentScore.categories[key] || 0;
                                const maxCategoryPts = Math.max(1, ...Object.values(studentScore.categories));
                                const percentage = Math.min(100, Math.max(5, Math.round((Math.max(0, pts) / maxCategoryPts) * 100)));

                                return (
                                    <div 
                                        key={key}
                                        className="p-3.5 rounded-2xl border border-white/5 bg-black/30 flex flex-col gap-2 shadow-md hover:border-indigo-500/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <div 
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm"
                                                    style={{ background: cat.bg, color: cat.color }}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-black text-white">{cat.emoji} {cat.name}</span>
                                            </div>
                                            <span className={`text-xs font-black ${pts > 0 ? 'text-emerald-400' : pts < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                                                {pts > 0 ? `+${pts}` : `${pts}`} XP
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ 
                                                    width: `${percentage}%`, 
                                                    background: cat.color 
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 5 & 6. GROUP LEADERBOARD (SORTED & HIGHLIGHTED) ── */}
            <div 
                className="rounded-[24px] border border-white/10 overflow-hidden shadow-2xl p-6 flex flex-col gap-5"
                style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.92) 100%)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white">🏆 My Group Ranking ({group.name})</h2>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">Sinfdagi umumiy to‘plangan ballar bo‘yicha o‘rningiz</p>
                        </div>
                    </div>

                    <div className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-indigo-400" />
                        Sizning o‘rningiz: <strong className="text-white font-black">#{studentScore.rank}</strong> / {studentScore.totalStudents}
                    </div>
                </div>

                <div className="divide-y divide-white/5">
                    {leaderboard.map((item, idx) => {
                        const isTop1 = idx === 0;
                        const isTop2 = idx === 1;
                        const isTop3 = idx === 2;

                        return (
                            <div 
                                key={item.id}
                                className={`py-3.5 px-4 rounded-2xl my-1 flex items-center justify-between gap-4 transition-all ${
                                    item.isCurrentStudent 
                                        ? 'bg-gradient-to-r from-indigo-600/30 via-indigo-500/20 to-purple-600/20 border border-indigo-400/50 shadow-lg scale-[1.01]' 
                                        : 'hover:bg-white/5'
                                }`}
                            >
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-7 shrink-0 flex items-center justify-center font-black text-sm">
                                        {isTop1 ? (
                                            <span className="text-amber-400 text-base font-black">🥇 1</span>
                                        ) : isTop2 ? (
                                            <span className="text-slate-300 text-base font-black">🥈 2</span>
                                        ) : isTop3 ? (
                                            <span className="text-amber-600 text-base font-black">🥉 3</span>
                                        ) : (
                                            <span className="text-slate-400 font-mono text-xs">#{idx + 1}</span>
                                        )}
                                    </div>

                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ${
                                        item.isCurrentStudent 
                                            ? 'bg-indigo-600 text-white border-indigo-300 shadow-md' 
                                            : 'bg-white/10 text-white/80 border-white/10'
                                    }`}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`text-sm font-black truncate ${item.isCurrentStudent ? 'text-white' : 'text-slate-200'}`}>
                                                {item.name}
                                            </h4>
                                            {item.isCurrentStudent && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 shadow-md">
                                                    YOU (SIZ)
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                            Bugun: <span className="text-emerald-400 font-bold">+{item.todayXP} XP</span> • Bu hafta: <span className="text-indigo-300 font-bold">+{item.weekXP} XP</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-base sm:text-lg font-black text-amber-400">
                                        {item.lifetimeXP} XP
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">JAMI BALL</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── 7. RECENT ACTIVITY FEED ── */}
            {recentEvents.length > 0 && (
                <div 
                    className="p-6 rounded-[24px] border border-white/10 shadow-2xl flex flex-col gap-4"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.92) 100%)',
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-black text-white">🕒 Recent Activity</h3>
                            <p className="text-xs text-slate-300 font-medium mt-0.5">Sizga berilgan so‘nggi ballar tarixi</p>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {recentEvents.map(ev => {
                            const cat = CATS_META[ev.category] || CATS_META.other;
                            const Icon = cat.icon;
                            return (
                                <div key={ev.id} className="p-3.5 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between gap-3 text-xs hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cat.bg, color: cat.color }}>
                                            <Icon className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-white">{cat.emoji} {cat.name}</span>
                                            </div>
                                            <p className="text-slate-300 font-medium mt-0.5">{ev.reason || 'Darsdagi faollik uchun ball'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className={`font-black text-sm px-3 py-1 rounded-xl ${
                                            ev.points > 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                        }`}>
                                            {ev.points > 0 ? `+${ev.points}` : ev.points} XP
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}