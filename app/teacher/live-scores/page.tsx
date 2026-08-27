'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { 
    Users, ChevronDown, Trophy, BarChart3, Sparkles, 
    RefreshCw, Clock, Search
} from 'lucide-react';

interface GroupInfo {
    id: string;
    name: string;
    level: string;
}

interface StudentInfo {
    id: string;
    name: string;
    email: string;
    todayXP: number;
    weekXP: number;
    monthXP: number;
    lifetimeXP: number;
    categories: Record<string, number>;
    checks: {
        homework: boolean;
        vocab: boolean;
        grammar: boolean;
        participation: boolean;
        behavior?: boolean;
        quiz?: boolean;
        game?: boolean;
        bonus?: boolean;
        penalty?: boolean;
        other?: boolean;
    };
}

interface ScoreEventInfo {
    id: string;
    studentId: string;
    points: number;
    category: string;
    reason: string;
    isReversal: boolean;
    reversalOf: string | null;
    createdAt: string;
}

const CATS = [
    { id: 'homework', name: 'Homework', icon: '🏠', color: '#10b981' },
    { id: 'vocab', name: 'Vocabulary', icon: '📚', color: '#6366f1' },
    { id: 'grammar', name: 'Grammar', icon: '🧠', color: '#ec4899' },
    { id: 'participation', name: 'Participation', icon: '⭐', color: '#f59e0b' },
    { id: 'behavior', name: 'Behavior', icon: '🛡️', color: '#3b82f6' },
    { id: 'quiz', name: 'Quiz', icon: '📝', color: '#8b5cf6' },
    { id: 'game', name: 'Game', icon: '🎮', color: '#10b981' },
    { id: 'bonus', name: 'Bonus', icon: '🔥', color: '#ef4444' },
    { id: 'penalty', name: 'Penalty', icon: '⚠️', color: '#f97316' },
    { id: 'other', name: 'Other', icon: '✨', color: '#64748b' }
];

export default function TeacherLiveScoresPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [groups, setGroups] = useState<GroupInfo[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
    const [students, setStudents] = useState<StudentInfo[]>([]);
    const [recentEvents, setRecentEvents] = useState<ScoreEventInfo[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('grammar');
    const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'month'>('today');
    const [chartCategory, setChartCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
    const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
    const [floatingBadges, setFloatingBadges] = useState<Array<{ id: string; studentId: string; text: string; x: number; y: number; positive: boolean }>>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loadingData, setLoadingData] = useState<boolean>(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [formattedDateTime, setFormattedDateTime] = useState<string>('');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Dynamic current date/time string format e.g. "Thursday 20:40"
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            setFormattedDateTime(`${dayName} ${hours}:${mins}`);
        };
        updateTime();
        const timer = setInterval(updateTime, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }
        if (user) {
            loadGroupData();
        }
    }, [user, loading, router]);

    // Setup Real-Time SSE Listener
    useEffect(() => {
        if (!selectedGroupId) return;

        const sseUrl = `/api/classroom-scores/stream?groupId=${selectedGroupId}`;
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.type === 'SCORE_ADDED' || payload.type === 'SCORE_REVERSED') {
                    loadGroupData(selectedGroupId, false);
                }
            } catch (err) {}
        };

        return () => {
            es.close();
        };
    }, [selectedGroupId]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const loadGroupData = async (gId?: string, showLoading = true) => {
        if (showLoading) setLoadingData(true);
        try {
            const url = gId ? `/api/teacher/scores?groupId=${gId}` : '/api/teacher/scores';
            const res = await apiFetch(url);
            setGroups(res.groups || []);
            setSelectedGroup(res.selectedGroup || null);
            setSelectedGroupId(res.selectedGroup?.id || '');
            setStudents(res.students || []);
            setRecentEvents(res.recentEvents || []);
        } catch (error) {
            console.error('Error fetching scores:', error);
        } finally {
            if (showLoading) setLoadingData(false);
        }
    };

    const handleGroupChange = (newGId: string) => {
        setSelectedGroupId(newGId);
        loadGroupData(newGId, true);
    };

    const handleScoreClick = async (studentId: string, points: number, e: React.MouseEvent) => {
        // Trigger floating badge animation
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const badgeId = Math.random().toString();
        setFloatingBadges(prev => [...prev, {
            id: badgeId,
            studentId,
            text: points > 0 ? `+${points} XP` : `${points} XP`,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            positive: points > 0
        }]);
        setTimeout(() => {
            setFloatingBadges(prev => prev.filter(b => b.id !== badgeId));
        }, 1200);

        // Optimistic UI update — STRICTLY PRESERVES ROSTER ORDER (NO SORTING)
        setStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            const newToday = Math.max(0, s.todayXP + points);
            const newWeek = Math.max(0, s.weekXP + points);
            const newMonth = Math.max(0, s.monthXP + points);
            const newLifetime = Math.max(0, s.lifetimeXP + points);
            const newCategories = { ...s.categories, [activeCategory]: (s.categories[activeCategory] || 0) + points };
            return {
                ...s,
                todayXP: newToday,
                weekXP: newWeek,
                monthXP: newMonth,
                lifetimeXP: newLifetime,
                categories: newCategories,
                checks: {
                    ...s.checks,
                    [activeCategory]: true
                }
            };
        }));

        try {
            await apiFetch('/api/teacher/scores/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    groupId: selectedGroupId,
                    points,
                    category: activeCategory,
                    reason: `${CATS.find(c => c.id === activeCategory)?.name || 'Dars'} faolligi`
                })
            });
            showToast(`${points > 0 ? `+${points}` : points} XP saqlandi! ✅`);
        } catch (error: any) {
            showToast(error.message || 'Xatolik yuz berdi ⚠️');
            loadGroupData(selectedGroupId, false);
        }
    };

    const handleCustomScore = (studentId: string, sign: number, e: React.MouseEvent) => {
        const valStr = customInputs[studentId] || '';
        const val = parseInt(valStr, 10);
        if (isNaN(val) || val <= 0) {
            showToast('Iltimos, musbat raqam kiriting! ⚠️');
            return;
        }
        handleScoreClick(studentId, val * sign, e);
        setCustomInputs(prev => ({ ...prev, [studentId]: '' }));
    };

    // Filter students while preserving original roster order
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        return students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [students, searchQuery]);

    // Group XP total
    const groupTotalXP = useMemo(() => {
        return students.reduce((acc, s) => {
            if (chartPeriod === 'today') return acc + (chartCategory === 'all' ? s.todayXP : (s.categories[chartCategory] || 0));
            if (chartPeriod === 'month') return acc + s.monthXP;
            return acc + s.weekXP;
        }, 0);
    }, [students, chartPeriod, chartCategory]);

    // Leader student (Only used for Leaderboard ranking & analytics)
    const leaderStudent = useMemo(() => {
        if (!students.length) return null;
        return [...students].sort((a, b) => {
            const valA = chartPeriod === 'today' ? (chartCategory === 'all' ? a.todayXP : (a.categories[chartCategory] || 0)) : (chartPeriod === 'month' ? a.monthXP : a.weekXP);
            const valB = chartPeriod === 'today' ? (chartCategory === 'all' ? b.todayXP : (b.categories[chartCategory] || 0)) : (chartPeriod === 'month' ? b.monthXP : b.weekXP);
            return valB - valA;
        })[0];
    }, [students, chartPeriod, chartCategory]);

    // Leaderboard sorted list for Right Panel ranking representation ONLY
    const leaderboardStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            const valA = chartPeriod === 'today' ? (chartCategory === 'all' ? a.todayXP : (a.categories[chartCategory] || 0)) : (chartPeriod === 'month' ? a.monthXP : a.weekXP);
            const valB = chartPeriod === 'today' ? (chartCategory === 'all' ? b.todayXP : (b.categories[chartCategory] || 0)) : (chartPeriod === 'month' ? b.monthXP : b.weekXP);
            return valB - valA;
        });
    }, [students, chartPeriod, chartCategory]);

    const viewModeRef = useRef(viewMode);
    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    // Canvas Bar Chart Drawer
    useEffect(() => {
        if (viewModeRef.current !== 'chart') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width = 640;
        const H = canvas.height = 320;
        ctx.clearRect(0, 0, W, H);

        if (!students.length) return;

        const chartData = students.map(s => {
            let pts = s.todayXP;
            if (chartPeriod === 'today' && chartCategory !== 'all') {
                pts = s.categories[chartCategory] || 0;
            } else if (chartPeriod === 'week') {
                pts = s.weekXP;
            } else if (chartPeriod === 'month') {
                pts = s.monthXP;
            }
            return { name: s.name.split(' ')[0], full: s.name, points: pts };
        });

        const maxPoints = Math.max(10, ...chartData.map(d => d.points));
        const padL = 40, padR = 20, padT = 30, padB = 45;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padT + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();

            const labelVal = Math.round(maxPoints * (1 - i / 4));
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(String(labelVal), padL - 8, y + 3);
        }

        const barCount = chartData.length;
        const totalSlot = chartW / barCount;
        const barW = Math.max(10, Math.min(38, totalSlot - 8));

        chartData.forEach((item, idx) => {
            const x = padL + idx * totalSlot + (totalSlot - barW) / 2;
            const barH = (item.points / maxPoints) * chartH;
            const y = padT + chartH - barH;

            // Gradient fill
            const isLeader = leaderStudent && leaderStudent.name === item.full && item.points > 0;
            const grad = ctx.createLinearGradient(x, y, x, padT + chartH);
            if (isLeader) {
                grad.addColorStop(0, '#f59e0b');
                grad.addColorStop(1, '#ea580c');
            } else {
                grad.addColorStop(0, '#6366f1');
                grad.addColorStop(1, '#8b5cf6');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, Math.max(2, barH), [6, 6, 0, 0]);
            ctx.fill();

            // Score label
            ctx.fillStyle = isLeader ? '#fbbf24' : '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(String(item.points), x + barW / 2, Math.max(15, y - 6));

            // Name label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '10px sans-serif';
            ctx.fillText(item.name.slice(0, 7), x + barW / 2, H - 15);
        });
    }, [students, chartPeriod, chartCategory, leaderStudent]);

    return (
        <div 
            className="w-full text-[#e2e8f0] font-sans antialiased pb-24 box-border"
            style={{
                fontFamily: 'var(--theme-font-family, inherit)',
            }}
        >
            
            {/* Global Normalized Styles & Spacing Variables */}
            <style jsx global>{`
                :root {
                    --space-1: 4px;
                    --space-2: 8px;
                    --space-3: 12px;
                    --space-4: 16px;
                    --space-5: 20px;
                    --space-6: 24px;
                    --space-7: 32px;
                    --radius-sm: 8px;
                    --radius-md: 12px;
                    --radius-lg: 16px;
                    --radius-xl: 20px;
                    --radius-2xl: 24px;
                }
                *, *::before, *::after {
                    box-sizing: border-box;
                }
            `}</style>

            {/* Toast Notification */}
            {toastMessage && (
                <div 
                    className="fixed top-24 right-6 z-50 bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in"
                    style={{ borderRadius: 'var(--theme-radius-btn, 16px)' }}
                >
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-bold">{toastMessage}</span>
                </div>
            )}

            {/* Floating XP Badges */}
            {floatingBadges.map(b => (
                <div 
                    key={b.id} 
                    className={`fixed z-50 pointer-events-none font-black text-sm px-3 py-1 rounded-full shadow-2xl transition-all duration-1000 ${
                        b.positive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}
                    style={{ left: b.x - 30, top: b.y, transform: 'translateY(-30px)', opacity: 0 }}
                >
                    {b.text}
                </div>
            ))}

            {/* ── PAGE CONTAINER (GLOBAL PADDING & MARGIN SCALE) ── */}
            <div 
                className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col"
                style={{ gap: 'var(--theme-space-section, 24px)' }}
            >
                
                {/* ── TOP BAR / HEADER (GLASSMORPHIC BANNER — GLOBAL MARGIN & RADIUS) ── */}
                <div 
                    className="shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
                    style={{
                        padding: 'var(--theme-space-card, 24px)',
                        borderRadius: 'var(--theme-radius-card, 24px)',
                        border: 'var(--theme-border, 1px solid rgba(255, 255, 255, 0.10))',
                        background: 'var(--theme-card-bg, linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.92) 100%))',
                        backdropFilter: 'var(--theme-card-blur, blur(25px))',
                        WebkitBackdropFilter: 'var(--theme-card-blur, blur(25px))',
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20 shrink-0"
                            style={{ borderRadius: 'var(--theme-radius-btn, 16px)' }}
                        >
                            ⚡
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Live Score Center</h1>
                                <span 
                                    className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                    style={{ borderRadius: 'var(--theme-radius-full, 9999px)' }}
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> JONLI DARS
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">Real-vaqtli dars vaqtida o‘quvchilarga ball qo‘yish va jonli reyting markazi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                        {/* Day/Time Badge */}
                        <div 
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-bold shadow-md"
                            style={{ borderRadius: 'var(--theme-radius-btn, 16px)' }}
                        >
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>{formattedDateTime || 'Thursday 20:40'}</span>
                        </div>

                        {/* Group Selector Dropdown */}
                        <div className="relative">
                            <select 
                                value={selectedGroupId}
                                onChange={(e) => handleGroupChange(e.target.value)}
                                className="appearance-none bg-slate-900/90 border border-indigo-500/40 text-white text-xs font-black py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xl backdrop-blur-md"
                                style={{ borderRadius: 'var(--theme-radius-btn, 16px)' }}
                            >
                                {groups.map(g => (
                                    <option key={g.id} value={g.id} className="bg-slate-900 text-white">{g.name} ({g.level || 'Guruh'})</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* ── CATEGORY BAR (GLOBAL PADDING & RADIUS) ── */}
                <div 
                    className="shadow-xl"
                    style={{
                        padding: 'var(--theme-space-card, 20px)',
                        borderRadius: 'var(--theme-radius-card, 24px)',
                        border: 'var(--theme-border, 1px solid rgba(255, 255, 255, 0.10))',
                        background: 'var(--theme-card-bg, rgba(15, 23, 42, 0.75))',
                        backdropFilter: 'var(--theme-card-blur, blur(20px))',
                        WebkitBackdropFilter: 'var(--theme-card-blur, blur(20px))',
                    }}
                >
                    <div className="flex items-center justify-between gap-2 mb-3 px-1">
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Kategoriya Tanlash (Active Category):</span>
                        <span 
                            className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 border border-indigo-500/20"
                            style={{ borderRadius: 'var(--theme-radius-full, 9999px)' }}
                        >
                            Tanlangan: {CATS.find(c => c.id === activeCategory)?.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                        {CATS.map(cat => {
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`h-11 px-4.5 text-xs font-black shrink-0 transition-all flex items-center gap-2 cursor-pointer border ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 border-indigo-400 scale-[1.02]' 
                                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                                    }`}
                                    style={{ borderRadius: 'var(--theme-radius-full, 9999px)' }}
                                >
                                    <span className="text-base">{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── MAIN 2-COLUMN GRID (STUDENT ROSTER ORDER PRESERVED) ── */}
                <div 
                    className="grid grid-cols-1 lg:grid-cols-12 items-start"
                    style={{ gap: 'var(--theme-space-section, 24px)' }}
                >
                    
                    {/* LEFT COLUMN: STUDENT MANAGEMENT CARDS (Col 7 — STRICT ROSTER ORDER) */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">O‘quvchilar Boshqaruv Kartalari ({filteredStudents.length} ta)</h3>
                            </div>
                            
                            {/* Search Filter Input */}
                            <div className="relative w-48 sm:w-60">
                                <input
                                    type="text"
                                    placeholder="O'quvchini qidirish..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 bg-slate-900/80 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-indigo-400"
                                    style={{ borderRadius: 'var(--theme-radius-btn, 12px)' }}
                                />
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            </div>
                        </div>

                        {loadingData ? (
                            <div 
                                className="p-16 flex justify-center bg-slate-900/50 border border-white/10"
                                style={{ borderRadius: 'var(--theme-radius-card, 24px)' }}
                            >
                                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div 
                                className="p-12 text-center bg-slate-900/60 border border-white/10 text-slate-400 text-sm backdrop-blur-xl"
                                style={{ borderRadius: 'var(--theme-radius-card, 24px)' }}
                            >
                                O‘quvchilar topilmadi
                            </div>
                        ) : (
                            /* STRICTLY PRESERVES ORIGINAL ROSTER ORDER (DOES NOT SORT BY XP) */
                            filteredStudents.map((student, idx) => {
                                const catXP = student.categories[activeCategory] || 0;
                                const currentCat = CATS.find(c => c.id === activeCategory);
                                return (
                                    <div 
                                        key={student.id}
                                        className="shadow-xl transition-all hover:border-indigo-500/50 flex flex-col gap-4 relative overflow-hidden group"
                                        style={{
                                            padding: 'var(--theme-space-card, 20px)',
                                            borderRadius: 'var(--theme-radius-card, 24px)',
                                            border: 'var(--theme-border, 1px solid rgba(255, 255, 255, 0.10))',
                                            background: 'var(--theme-card-bg, linear-gradient(135deg, rgba(10, 15, 30, 0.95) 0%, rgba(5, 10, 20, 0.98) 100%))',
                                            backdropFilter: 'var(--theme-card-blur, blur(20px))',
                                            WebkitBackdropFilter: 'var(--theme-card-blur, blur(20px))',
                                        }}
                                    >
                                        {/* Top Accent Line */}
                                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/0 to-transparent group-hover:via-indigo-400/60 transition-all" />

                                        {/* Card Header: Rank #, Circular Avatar, Student Name, Category Info & Total XP */}
                                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs font-black text-slate-400 w-5 shrink-0">#{idx + 1}</span>
                                                <div 
                                                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-700 via-indigo-700 to-indigo-900 border-2 border-indigo-400/50 text-white font-black text-base flex items-center justify-center shadow-lg shrink-0"
                                                >
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-lg font-black text-white tracking-wide truncate group-hover:text-indigo-300 transition-colors uppercase">{student.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-300 font-medium mt-0.5 flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            Bugun: <strong className="text-emerald-400 font-black">+{student.todayXP} XP</strong>
                                                        </span>
                                                        <span className="text-slate-600">•</span>
                                                        <span className="text-indigo-300 font-bold flex items-center gap-1">
                                                            <span>{currentCat?.icon}</span> {currentCat?.name}: <strong className="text-white">{catXP} XP</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0 ml-auto">
                                                <div className="text-3xl font-black text-white tracking-tight">
                                                    {student.todayXP} XP
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">BUGUNGI BALL</span>
                                            </div>
                                        </div>

                                        {/* ── EXACT TACTILE CAPSULE SCORE BUTTONS BAR ── */}
                                        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
                                            <div className="inline-flex items-center gap-1.5 p-1.5 rounded-full bg-[#030712] border border-emerald-500/30 shadow-inner">
                                                
                                                {/* Negative Penalty Pills (-10, -5, -2, -1) */}
                                                {[-10, -5, -2, -1].map(pts => (
                                                    <button
                                                        key={pts}
                                                        onClick={(e) => handleScoreClick(student.id, pts, e)}
                                                        title={`${pts} XP`}
                                                        className="w-10 h-12 rounded-full text-sm font-black bg-rose-950/70 border-2 border-rose-500 text-rose-100 hover:bg-rose-600 hover:text-white transition-all active:scale-95 cursor-pointer shadow-md shadow-rose-950/80 flex items-center justify-center shrink-0"
                                                    >
                                                        {pts}
                                                    </button>
                                                ))}

                                                {/* Small Positive Pills (+1, +2, +5) */}
                                                {[1, 2, 5].map(pts => (
                                                    <button
                                                        key={pts}
                                                        onClick={(e) => handleScoreClick(student.id, pts, e)}
                                                        className="w-10 h-12 rounded-full text-sm font-black bg-emerald-950/70 border-2 border-emerald-500 text-emerald-100 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950/80 flex items-center justify-center shrink-0"
                                                    >
                                                        +{pts}
                                                    </button>
                                                ))}

                                                {/* Medium Positive Pill (+10) */}
                                                <button
                                                    onClick={(e) => handleScoreClick(student.id, 10, e)}
                                                    className="w-11 h-12 rounded-full text-sm font-black bg-indigo-600 border-2 border-indigo-400 text-white hover:bg-indigo-500 transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.6)] flex items-center justify-center shrink-0"
                                                >
                                                    +10
                                                </button>

                                                {/* Large Positive Pill (🔥 +20) */}
                                                <button
                                                    onClick={(e) => handleScoreClick(student.id, 20, e)}
                                                    className="px-5 h-12 rounded-full text-base font-black bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 border-2 border-amber-300 text-slate-950 hover:brightness-110 transition-all active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.8)] flex items-center gap-1 shrink-0"
                                                >
                                                    🔥 +20
                                                </button>
                                            </div>
                                        </div>

                                        {/* ── BOTTOM STRIP: TEZKOR PRESETS & CUSTOM INPUT ── */}
                                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">TEZKOR:</span>
                                                {[15, 25, 50, 100].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={(e) => handleScoreClick(student.id, val, e)}
                                                        className="h-8 px-3.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-black border border-indigo-500/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                                                        style={{ borderRadius: 'var(--theme-radius-btn, 12px)' }}
                                                    >
                                                        +{val}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2 ml-auto">
                                                <input 
                                                    type="number"
                                                    placeholder="Ball..."
                                                    value={customInputs[student.id] || ''}
                                                    onChange={(e) => setCustomInputs({ ...customInputs, [student.id]: e.target.value })}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCustomScore(student.id, 1, e as any); }}
                                                    className="w-28 h-9 px-4 rounded-full bg-[#0a1226] border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-indigo-400 placeholder:text-slate-500"
                                                />
                                                <button 
                                                    onClick={(e) => handleCustomScore(student.id, 1, e)}
                                                    className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1"
                                                    style={{ borderRadius: 'var(--theme-radius-btn, 12px)' }}
                                                >
                                                    ＋ Qo‘shish
                                                </button>
                                                <button 
                                                    onClick={(e) => handleCustomScore(student.id, -1, e)}
                                                    className="h-9 px-5 bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                                                    style={{ borderRadius: 'var(--theme-radius-btn, 12px)' }}
                                                >
                                                    － Ayirish
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* RIGHT COLUMN: JONLI ANALITIKA CHART & LEADERBOARD (Col 5) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div 
                            className="shadow-2xl flex flex-col gap-5 sticky top-28"
                            style={{
                                padding: 'var(--theme-space-card, 24px)',
                                borderRadius: 'var(--theme-radius-card, 24px)',
                                border: 'var(--theme-border, 1px solid rgba(255, 255, 255, 0.10))',
                                background: 'var(--theme-card-bg, linear-gradient(135deg, rgba(15, 23, 42, 0.90) 0%, rgba(10, 15, 30, 0.96) 100%))',
                                backdropFilter: 'var(--theme-card-blur, blur(25px))',
                                WebkitBackdropFilter: 'var(--theme-card-blur, blur(25px))',
                            }}
                        >
                            {/* Chart Header & Period Switcher Pill */}
                            <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-white/5">
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        📊 Jonli Analitika Chart
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-0.5 font-medium">Barcha Kategoriyalar (Bugun)</p>
                                </div>

                                {/* Period Switcher Pill (Spaced & Padded) */}
                                <div className="flex items-center gap-1 p-1.5 rounded-full bg-slate-900/90 border border-white/10 shadow-inner">
                                    {(['today', 'week', 'month'] as const).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setChartPeriod(p)}
                                            className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                chartPeriod === p 
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {p === 'today' ? 'Bugun' : p === 'week' ? 'Hafta' : 'Oy'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category Filter Pills for Chart (Comfortable Spacing) */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                                <button
                                    onClick={() => setChartCategory('all')}
                                    className={`px-4 py-2 rounded-full text-xs font-black uppercase shrink-0 transition-all cursor-pointer ${
                                        chartCategory === 'all' 
                                            ? 'bg-indigo-600 text-white shadow-md border border-indigo-400' 
                                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                                    }`}
                                >
                                    ✨ Barchasi
                                </button>
                                {CATS.slice(0, 5).map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setChartCategory(cat.id)}
                                        className={`px-3.5 py-2 rounded-full text-xs font-black shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                                            chartCategory === cat.id 
                                                ? 'bg-indigo-600 text-white shadow-md border border-indigo-400' 
                                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                                        }`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Group XP & Leader KPI Cards (Comfortable Padding) */}
                            <div className="grid grid-cols-2 gap-3">
                                <div 
                                    className="p-4 bg-indigo-950/40 border border-indigo-500/30 shadow-inner flex flex-col gap-1"
                                    style={{ borderRadius: 'var(--theme-radius-btn, 16px)' }}
                                >
                                    <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">Guruh XP (Barcha Kategoriyalar)</span>
                                    <h4 className="text-2xl sm:text-3xl font-black text-white">{groupTotalXP} XP</h4>
                                </div>

                                <div 
                                    className="p-4 bg-amber-500/10 border border-amber-500/30 shadow-inner flex flex-col gap-1"
                                    style={{ borderRadius: 'var(--theme-radius-btn, 16px)' }}
                                >
                                    <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1 tracking-wider">
                                        <Trophy className="w-3.5 h-3.5" /> Lider O‘quvchi
                                    </span>
                                    <h4 className="text-base sm:text-lg font-black text-amber-300 truncate">
                                        {leaderStudent ? leaderStudent.name : '—'}
                                    </h4>
                                </div>
                            </div>

                            {/* View Switcher: Chart vs Leaderboard (Balanced Padding & Gaps) */}
                            <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-slate-900/90 border border-white/10 shadow-inner my-1">
                                <button
                                    onClick={() => setViewMode('chart')}
                                    className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                                        viewMode === 'chart' 
                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30' 
                                            : 'text-slate-400 hover:text-white border-transparent'
                                    }`}
                                >
                                    <BarChart3 className="w-4 h-4" /> Analitika Bar Chart
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex-1 py-2.5 px-4 rounded-full text-xs font-black tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                                        viewMode === 'list' 
                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30' 
                                            : 'text-slate-400 hover:text-white border-transparent'
                                    }`}
                                >
                                    <Trophy className="w-4 h-4" /> Reyting Ro‘yxati
                                </button>
                            </div>

                            {/* View Content (Canvas with Empty State Placeholder) */}
                            {viewMode === 'chart' ? (
                                <div 
                                    className="w-full bg-slate-950/80 p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center min-h-[260px] relative shadow-inner overflow-hidden"
                                    style={{ borderRadius: 'var(--theme-radius-card, 20px)' }}
                                >
                                    <canvas ref={canvasRef} className="w-full h-auto max-h-[280px]" />
                                    {!students.length && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/70 backdrop-blur-xs rounded-2xl">
                                            <BarChart3 className="w-10 h-10 text-indigo-400/40 mb-2 animate-pulse" />
                                            <p className="text-sm font-bold text-white">Jonli analitika ma'lumotlari kutilmoqda</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">Chap tomondagi o‘quvchilarga ball qo‘shilishi bilan ushbu grafik zudlik bilan jonlanadi.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5 max-h-[340px] overflow-y-auto pr-1">
                                    {/* SORTED ONLY IN THE LEADERBOARD PANEL */}
                                    {leaderboardStudents.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-8">O'quvchilar mavjud emas</p>
                                    ) : (
                                        leaderboardStudents.map((st, idx) => (
                                            <div key={st.id} className="py-3 flex items-center justify-between text-xs hover:bg-white/5 px-3 rounded-xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-black text-xs w-6 h-6 rounded-full flex items-center justify-center ${
                                                        idx === 0 ? 'bg-amber-500 text-slate-950 font-black shadow-md' : idx === 1 ? 'bg-slate-300 text-slate-950 font-black' : idx === 2 ? 'bg-amber-700 text-white font-black' : 'text-slate-400 bg-white/5'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-black text-white">{st.name}</span>
                                                </div>
                                                <span className="font-black text-indigo-400 text-sm">{st.todayXP} XP</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
