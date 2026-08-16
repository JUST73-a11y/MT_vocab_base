'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { 
    Users, Loader2, Trophy, Activity, Medal, Star, ShieldCheck, PlayCircle, 
    Timer, ClipboardList, TrendingUp, Crown, Zap, Target, ArrowRight, 
    CheckCircle, Brain, Swords, Award, Flame, Clock, Sparkles, X, ChevronRight 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserMember {
    _id: string;
    rank: number;
    name: string;
    totalWordsSeen: number;
    todayWordsSeen: number;
    todayCorrect: number;
    coinBalance: number;
    totalCoinsEarned: number;
    certificatesCount: number;
    accuracy: number;
    totalTimeOnlineSec: number;
    onlineTimeFormatted: string;
    isOnline: boolean;
    score: number;
    joinedAt: string;
    isCurrentUser: boolean;
}

interface GroupDetails {
    id: string;
    name: string;
    teacherName: string;
    createdAt: string;
    memberCount: number;
}

interface PublishedQuiz {
    id: string;
    title: string;
    description: string;
    questionCount: number;
    timeLimitSec: number;
    mode: string;
    status: string;
    createdAt: string;
    studentCompleted: boolean;
    studentResult: { correctCount: number; answeredCount: number } | null;
}

interface GroupGoal {
    target: number;
    current: number;
    percent: number;
    rewardCoins: number;
}

interface Insights {
    studentRank: number;
    groupTotalWordsSeen: number;
    groupTodayCorrect: number;
    groupAvgCorrect: number;
    studentTodayCorrect: number;
    studentCoinBalance: number;
    studentTotalCoins: number;
    studentScore: number;
    nextRankGap: number | null;
    aboveStudentName: string | null;
    memberCount: number;
    groupGoal?: GroupGoal;
}

interface GroupDataResponse {
    group: GroupDetails | null;
    activeQuiz: {
        id: string;
        title: string;
        questionCount: number;
        timeLimitSec: number;
        durationMin: number;
        mode: string;
        startsAt: string;
    } | null;
    publishedQuizzes: PublishedQuiz[];
    members: UserMember[];
    insights: Insights;
}

export default function StudentGroupPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [groupData, setGroupData] = useState<GroupDataResponse | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [duelTarget, setDuelTarget] = useState<UserMember | null>(null);
    const [startingDuel, setStartingDuel] = useState(false);
    const [openDuels, setOpenDuels] = useState<any[]>([]);
    const [completedDuels, setCompletedDuels] = useState<any[]>([]);
    const [duelTab, setDuelTab] = useState<'open' | 'history'>('open');

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }
        if (user) {
            loadGroupData();
            loadActiveDuels();
        }
    }, [user, loading, router]);

    const loadGroupData = async () => {
        setLoadingData(true);
        try {
            const data = await apiFetch('/api/student/group');
            setGroupData(data);
        } catch (error) {
            // handle error
        } finally {
            setLoadingData(false);
        }
    };

    const loadActiveDuels = async () => {
        try {
            const data = await apiFetch('/api/student/duel/active');
            setOpenDuels(data.openDuels || data.duels || []);
            setCompletedDuels(data.completedDuels || []);
        } catch (e) {
            // ignore
        }
    };

    const handleStartDuel = async (targetId: string) => {
        setStartingDuel(true);
        try {
            const res = await apiFetch('/api/student/duel/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ opponentId: targetId }),
            });
            if (res.success && res.duelId) {
                setDuelTarget(null);
                router.push(`/student/duel/${res.duelId}`);
            }
        } catch (e: any) {
            alert(e.message || 'Duel yaratishda xatolik yuz berdi');
        } finally {
            setStartingDuel(false);
        }
    };

    const handleAcceptDuel = async (duelId: string) => {
        try {
            await apiFetch(`/api/student/duel/${duelId}/accept`, { method: 'POST' });
            router.push(`/student/duel/${duelId}`);
        } catch (e: any) {
            alert(e.message || 'Xatolik');
        }
    };

    const handleDeclineDuel = async (duelId: string) => {
        try {
            await apiFetch(`/api/student/duel/${duelId}/decline`, { method: 'POST' });
            loadActiveDuels();
        } catch (e: any) {
            // ignore
        }
    };

    if (loading || loadingData) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!groupData || !groupData.group) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full px-4 text-center animate-fade-in">
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                    <Users className="w-12 h-12 text-white/30" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Siz hali guruhda emassiz</h1>
                <p className="text-white/50 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                    Sizni hali hech qaysi ustoz o&apos;z guruhiga qo&apos;shmagan. Ustozingiz sizni guruhga qo&apos;shgandan so&apos;ng, bu yerda guruhdoshlaringiz reytingi va qiziqarli statistikalarni ko&apos;rishingiz mumkin bo&apos;ladi.
                </p>
                <div className="mt-10 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 max-w-sm w-full">
                    <div className="flex items-center gap-4 justify-center">
                        <ShieldCheck className="w-8 h-8 text-indigo-400" />
                        <div className="text-left">
                            <p className="text-[10px] font-black uppercase text-indigo-400/70 tracking-widest">Profilingiz kodi</p>
                            <p className="text-lg font-black text-white tracking-widest">{user?.id?.slice(-6).toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { group, members, insights, publishedQuizzes } = groupData;
    const top1 = members[0];
    const top2 = members[1];
    const top3 = members[2];

    return (
        <div className="w-full max-w-6xl mx-auto py-6 md:py-10 px-3 sm:px-4 animate-fade-in flex flex-col gap-8 pb-20">

            {/* ── 1. PREMIUM HERO & GROUP GOAL ── */}
            <div 
                className="relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl isolate border border-white/10"
                style={{
                    background: 'var(--theme-card-bg, rgba(15,20,35,0.75))',
                    backdropFilter: 'var(--theme-card-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--theme-card-blur, blur(20px))',
                }}
            >
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <div className="px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                                Mening Guruhim
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                {group.memberCount} ta o'quvchi
                            </div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                            {group.name}
                        </h1>
                        <p className="text-white/50 text-sm font-medium flex items-center gap-2">
                            <span>Ustoz: <span className="text-indigo-300 font-bold">{group.teacherName}</span></span>
                        </p>
                    </div>

                    {/* Collective Group Goal */}
                    {insights.groupGoal && (
                        <div 
                            className="w-full lg:max-w-md p-5 rounded-2xl border border-white/10 flex flex-col gap-3"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                    <Target className="w-4 h-4" /> Guruh Maqsadi
                                </span>
                                <span className="text-xs font-bold text-white/50">
                                    {insights.groupGoal.current.toLocaleString()} / {insights.groupGoal.target.toLocaleString()} so'z
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden relative">
                                <div 
                                    className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400"
                                    style={{ width: `${insights.groupGoal.percent}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-white/60 font-bold">{insights.groupGoal.percent}% bajarildi</span>
                                <span className="text-amber-300 font-black flex items-center gap-1">
                                    🎁 Bonus: +{insights.groupGoal.rewardCoins} MT Coin
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2. MOTIVATIONAL TARGET BANNER ── */}
            <div 
                className="p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
                style={{
                    background: insights.studentRank === 1 
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(234,88,12,0.12))' 
                        : 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.12))',
                    borderColor: insights.studentRank === 1 ? 'rgba(245,158,11,0.35)' : 'rgba(99,102,241,0.35)',
                }}
            >
                <div className="flex items-center gap-4 text-center sm:text-left">
                    <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-2xl"
                        style={{
                            background: insights.studentRank === 1 ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)',
                            border: `1px solid ${insights.studentRank === 1 ? 'rgba(245,158,11,0.5)' : 'rgba(99,102,241,0.5)'}`,
                        }}
                    >
                        {insights.studentRank === 1 ? '👑' : '🚀'}
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black text-white">
                            {insights.studentRank === 1 
                                ? 'Guruh yetakchisi! Siz 1-o\'rinda chempionsiz!' 
                                : `Siz guruhda ${insights.studentRank}-o'rindasiz!`}
                        </h3>
                        <p className="text-xs sm:text-sm text-white/70 font-medium mt-0.5">
                            {insights.studentRank === 1
                                ? 'Ajoyib natija! So\'zlarni takrorlab, chempionlikni saqlab qoling.'
                                : insights.aboveStudentName && insights.nextRankGap
                                    ? `Keyingi ${insights.studentRank - 1}-o'rindagi ${insights.aboveStudentName} dan o'tish uchun yana ${insights.nextRankGap} ball kerak.`
                                    : 'Mashq qiling va peshqadamlar safiga ko\'tariling!'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/student/random')}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shrink-0 btn-hover-glow"
                    style={{ background: 'var(--theme-primary, #6366f1)' }}
                >
                    <Flame className="w-4 h-4 text-amber-300" /> Mashq Boshlash
                </button>
            </div>

            {/* ── 3. TOP-3 PODIUM SHOWCASE ── */}
            {members.length >= 3 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-black text-white uppercase tracking-wider">Hafta Chempionlari</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-4">
                        {/* 🥈 #2 Place (Left) */}
                        {top2 && (
                            <div 
                                className="order-2 sm:order-1 rounded-2xl p-5 flex flex-col items-center text-center border relative overflow-hidden transition-transform hover:-translate-y-1 card-hover-glow"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderColor: 'rgba(203,213,225,0.3)',
                                }}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-300/20 border border-slate-300/40 text-slate-200 font-black text-sm flex items-center justify-center mb-2">
                                    2
                                </div>
                                <div className="w-14 h-14 rounded-full bg-slate-400/10 border-2 border-slate-300/50 flex items-center justify-center font-black text-xl text-slate-200 mb-2">
                                    {top2.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-black text-sm text-white truncate max-w-[140px]">{top2.name}</span>
                                <span className="text-[11px] text-amber-400 font-bold mt-1">🪙 {top2.totalCoinsEarned} coin</span>
                                <span className="text-[10px] text-white/40 mt-0.5">{top2.totalWordsSeen} so'z • {top2.accuracy}% aniqlik</span>
                            </div>
                        )}

                        {/* 🥇 #1 Place (Center - Elevated) */}
                        {top1 && (
                            <div 
                                className="order-1 sm:order-2 rounded-2xl p-6 flex flex-col items-center text-center border relative overflow-hidden shadow-2xl transition-transform hover:-translate-y-1 card-hover-glow"
                                style={{
                                    background: 'linear-gradient(180deg, rgba(245,158,11,0.15) 0%, rgba(20,15,35,0.6) 100%)',
                                    borderColor: 'rgba(245,158,11,0.5)',
                                }}
                            >
                                <div className="absolute top-2 right-2">
                                    <Crown className="w-5 h-5 text-amber-400 animate-bounce" />
                                </div>
                                <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/60 text-amber-300 font-black text-base flex items-center justify-center mb-2 shadow-lg shadow-amber-500/20">
                                    🥇 1
                                </div>
                                <div className="w-18 h-18 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center font-black text-2xl text-amber-300 mb-2 shadow-xl shadow-amber-500/30">
                                    {top1.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-black text-base text-white truncate max-w-[160px]">{top1.name}</span>
                                <span className="text-xs text-amber-300 font-black mt-1">🪙 {top1.totalCoinsEarned} MT Coin</span>
                                <span className="text-[11px] text-white/50 mt-0.5">{top1.totalWordsSeen} ta so'z • {top1.certificatesCount} ta sertifikat</span>
                            </div>
                        )}

                        {/* 🥉 #3 Place (Right) */}
                        {top3 && (
                            <div 
                                className="order-3 sm:order-3 rounded-2xl p-5 flex flex-col items-center text-center border relative overflow-hidden transition-transform hover:-translate-y-1 card-hover-glow"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    borderColor: 'rgba(217,119,6,0.3)',
                                }}
                            >
                                <div className="w-8 h-8 rounded-full bg-amber-700/20 border border-amber-700/40 text-amber-500 font-black text-sm flex items-center justify-center mb-2">
                                    3
                                </div>
                                <div className="w-14 h-14 rounded-full bg-amber-700/10 border-2 border-amber-600/50 flex items-center justify-center font-black text-xl text-amber-500 mb-2">
                                    {top3.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-black text-sm text-white truncate max-w-[140px]">{top3.name}</span>
                                <span className="text-[11px] text-amber-400 font-bold mt-1">🪙 {top3.totalCoinsEarned} coin</span>
                                <span className="text-[10px] text-white/40 mt-0.5">{top3.totalWordsSeen} so'z • {top3.accuracy}% aniqlik</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── 4. ACTIVE & PUBLISHED QUIZZES ── */}
            {groupData.activeQuiz && (
                <div 
                    className="relative overflow-hidden rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border cursor-pointer group card-hover-glow"
                    style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))',
                        borderColor: 'rgba(16,185,129,0.35)',
                    }}
                    onClick={() => router.push(`/student/quiz?groupSessionId=${groupData.activeQuiz!.id}&autoStart=true`)}
                >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg font-black animate-pulse">
                            <PlayCircle className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <h3 className="text-emerald-400 font-black tracking-widest text-[10px] uppercase">Aktiv Musobaqa</h3>
                            </div>
                            <h2 className="text-lg font-black text-white">{groupData.activeQuiz.title}</h2>
                            <p className="text-white/50 text-xs mt-1">
                                {groupData.activeQuiz.questionCount} ta savol • {groupData.activeQuiz.timeLimitSec}s vaqt
                            </p>
                        </div>
                    </div>
                    <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 btn-hover-glow">
                        Qatnashish <PlayCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── 5. SINGLE MASTER LEADERBOARD TABLE ── */}
            <div 
                className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                style={{
                    background: 'var(--theme-card-bg, rgba(15,20,35,0.65))',
                    backdropFilter: 'var(--theme-card-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--theme-card-blur, blur(20px))',
                }}
            >
                {/* Table Header / Title */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--theme-primary, #6366f1)' }}
                        >
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white">Guruh Statistikasi va Reytingi</h2>
                            <p className="text-xs text-white/40 font-bold mt-0.5">Online faollik, MT Coin, so'zlar va sertifikatlar asosida</p>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-white/40">
                        Jami: <span className="text-white font-black">{members.length}</span> o'quvchi
                    </div>
                </div>

                {/* Desktop & Mobile Responsive List / Table */}
                <div className="divide-y divide-white/5">
                    {members.map((member) => {
                        const isTop1 = member.rank === 1;
                        const isTop2 = member.rank === 2;
                        const isTop3 = member.rank === 3;

                        return (
                            <div 
                                key={member._id}
                                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                                    member.isCurrentUser 
                                        ? 'bg-indigo-500/10 border-l-4 border-indigo-500 shadow-lg' 
                                        : 'hover:bg-white/[0.03]'
                                }`}
                            >
                                {/* Left: Rank + Avatar + Name + Online Badge */}
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    {/* Rank Badge */}
                                    <div className="shrink-0 w-8 flex items-center justify-center font-black text-sm">
                                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : (
                                            <span className="text-white/40 font-mono text-xs">#{member.rank}</span>
                                        )}
                                    </div>

                                    {/* Avatar with Online Pulse */}
                                    <div className="relative shrink-0">
                                        <div 
                                            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-sm ${
                                                member.isCurrentUser 
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                                                    : 'bg-white/10 text-white/80'
                                            }`}
                                        >
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        {member.isOnline && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0f1423] animate-pulse" title="Online" />
                                        )}
                                    </div>

                                    {/* Name + Badges */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className={`text-sm sm:text-base font-black truncate ${member.isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                                                {member.name}
                                            </h4>
                                            {member.isCurrentUser && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                    Siz
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-white/40 font-medium mt-0.5 flex-wrap">
                                            <span className="flex items-center gap-1 text-white/60">
                                                <Clock className="w-3 h-3 text-indigo-400" /> {member.onlineTimeFormatted}
                                            </span>
                                            <span>•</span>
                                            <span className="text-emerald-400/90 font-bold">
                                                {member.accuracy}% aniqlik
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Statistics metrics & 1v1 Challenge Button */}
                                <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 flex-wrap sm:flex-nowrap">
                                    {/* MT Coins (Lifetime Earned) */}
                                    <div className="text-left md:text-right">
                                        <p className="text-[10px] uppercase font-bold text-amber-400/60 tracking-wider">Jami Coin</p>
                                        <p className="text-xs sm:text-sm font-black text-amber-400 flex items-center md:justify-end gap-1">
                                            🪙 {member.totalCoinsEarned}
                                        </p>
                                    </div>

                                    {/* Words Mastered */}
                                    <div className="text-left md:text-right">
                                        <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Yodlangan</p>
                                        <p className="text-xs sm:text-sm font-black text-white">
                                            {member.totalWordsSeen} so'z
                                        </p>
                                    </div>

                                    {/* Certificates */}
                                    <div className="text-left md:text-right hidden sm:block">
                                        <p className="text-[10px] uppercase font-bold text-purple-400/60 tracking-wider">Sertifikat</p>
                                        <p className="text-xs sm:text-sm font-black text-purple-300 flex items-center md:justify-end gap-1">
                                            <Award className="w-3.5 h-3.5" /> {member.certificatesCount}
                                        </p>
                                    </div>

                                    {/* 1v1 Duel Button (Disable for self) */}
                                    {!member.isCurrentUser ? (
                                        <button
                                            onClick={() => setDuelTarget(member)}
                                            className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-black transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 shrink-0 btn-hover-glow"
                                            title="1v1 Do'stlar Dueli"
                                        >
                                            <Swords className="w-3.5 h-3.5 text-indigo-400" /> Duel
                                        </button>
                                    ) : (
                                        <div className="w-16 hidden md:block" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── 6. OCHIQ VA YAKUNLANGAN DUELLAR (OPEN DUELS & BATTLE HISTORY) ── */}
            <div 
                className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl p-6 sm:p-8"
                style={{
                    background: 'var(--theme-card-bg, rgba(15,20,35,0.65))',
                    backdropFilter: 'var(--theme-card-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--theme-card-blur, blur(20px))',
                }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                            <Swords className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-white">Ochiq va Yakunlangan Duellar</h2>
                            <p className="text-xs text-white/40 font-bold mt-0.5">Guruhdoshlar bilan o'tkazilgan va kutilayotgan 1v1 janglar</p>
                        </div>
                    </div>

                    {/* Tab switch */}
                    <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                        <button
                            onClick={() => setDuelTab('open')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                duelTab === 'open' 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Faol Duellar ({openDuels.length})
                        </button>
                        <button
                            onClick={() => setDuelTab('history')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                duelTab === 'history' 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Tarix ({completedDuels.length})
                        </button>
                    </div>
                </div>

                {/* TAB 1: OPEN / PENDING DUELS */}
                {duelTab === 'open' && (
                    <div className="space-y-3">
                        {openDuels.map(d => (
                            <div 
                                key={d.id}
                                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                    d.isIncoming && d.status === 'PENDING'
                                        ? 'border-indigo-500/40 bg-indigo-500/10 shadow-lg'
                                        : 'border-white/10 bg-white/[0.02]'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black shrink-0">
                                        <Swords className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-white">
                                                {d.isIncoming ? d.challengerName : d.opponentName}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider bg-white/10 text-white/60">
                                                {d.isIncoming ? 'Sizga chaqiruv' : 'Siz yuborgan chaqiruv'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-amber-400 font-bold mt-0.5 flex items-center gap-2">
                                            <span>🎁 Yutuq: +{d.rewardCoins} MT Coin</span>
                                            <span className="text-white/30">•</span>
                                            <span className="text-white/50 font-normal">
                                                {d.myFinished ? 'Siz yakunladingiz (Raqib kutilmoqda)' : 'Siz hali o\'ynamadingiz'}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {d.isIncoming && d.status === 'PENDING' ? (
                                        <>
                                            <button
                                                onClick={() => handleAcceptDuel(d.id)}
                                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg btn-hover-glow"
                                            >
                                                Qabul Qilish
                                            </button>
                                            <button
                                                onClick={() => handleDeclineDuel(d.id)}
                                                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-bold text-xs transition-all"
                                            >
                                                Rad Etish
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => router.push(`/student/duel/${d.id}`)}
                                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 btn-hover-glow"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" /> 
                                            {d.myFinished ? 'Natijani Ko\'rish' : 'O\'ynash'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {openDuels.length === 0 && (
                            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                                    Hozircha ochiq duellar yo'q
                                </p>
                                <p className="text-white/20 text-xs mt-1">
                                    Yuqoridagi ro'yxatdan istalgan guruhdoshga duel tashlang!
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: COMPLETED DUELS HISTORY */}
                {duelTab === 'history' && (
                    <div className="space-y-3">
                        {completedDuels.map(d => (
                            <div 
                                key={d.id}
                                onClick={() => router.push(`/student/duel/${d.id}`)}
                                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer hover:bg-white/[0.04] ${
                                    d.isWinner 
                                        ? 'border-amber-500/30 bg-amber-500/5' 
                                        : d.isDraw 
                                            ? 'border-indigo-500/30 bg-indigo-500/5' 
                                            : 'border-white/5 bg-white/[0.02]'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shrink-0"
                                        style={{
                                            background: d.isWinner ? 'rgba(245,158,11,0.2)' : d.isDraw ? 'rgba(99,102,241,0.2)' : 'rgba(239,68,68,0.2)',
                                            border: `1px solid ${d.isWinner ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`
                                        }}
                                    >
                                        {d.isWinner ? '👑' : d.isDraw ? '⚔️' : '💔'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-white">
                                                VS {d.opponentDisplayName}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                                d.isWinner 
                                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                                    : d.isDraw 
                                                        ? 'bg-indigo-500/20 text-indigo-300' 
                                                        : 'bg-red-500/20 text-red-300'
                                            }`}>
                                                {d.isWinner ? 'G\'alaba' : d.isDraw ? 'Durang' : 'Mag\'lubiyat'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/50 font-medium mt-0.5">
                                            Siz: <strong className="text-white">{d.myCorrect}/10</strong> ({d.myTimeSec}s) • Raqib: <strong className="text-white">{d.opponentCorrect}/10</strong> ({d.opponentTimeSec}s)
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                                    {d.isWinner && (
                                        <span className="text-xs font-black text-amber-400">
                                            +{d.rewardCoins} MT Coin 🪙
                                        </span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-white/40" />
                                </div>
                            </div>
                        ))}

                        {completedDuels.length === 0 && (
                            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">
                                    Hozircha yakunlangan duellar yo'q
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── 7. 1V1 FRIEND DUEL MODAL ── */}
            {duelTarget && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div 
                        className="w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl relative"
                        style={{
                            background: 'var(--theme-card-bg, #0f1423)',
                            backdropFilter: 'blur(24px)',
                        }}
                    >
                        <button 
                            onClick={() => setDuelTarget(null)}
                            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3 text-indigo-400">
                                <Swords className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-1">1v1 Do'stlar Dueli</h3>
                            <p className="text-xs text-white/50 mb-6 max-w-xs">
                                <strong className="text-white">{duelTarget.name}</strong> bilan 10 talik tezkor quizda kuch sinashing!
                            </p>

                            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-center justify-around">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-white/40">Siz</p>
                                    <p className="text-sm font-black text-indigo-300">{user?.name?.split(' ')[0]}</p>
                                </div>
                                <div className="text-xs font-black text-amber-400 uppercase tracking-widest">VS</div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-white/40">Raqib</p>
                                    <p className="text-sm font-black text-purple-300">{duelTarget.name.split(' ')[0]}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleStartDuel(duelTarget._id)}
                                disabled={startingDuel}
                                className="w-full py-3.5 rounded-xl font-black text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 btn-hover-glow disabled:opacity-60"
                                style={{ background: 'var(--theme-primary, #6366f1)' }}
                            >
                                {startingDuel ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                {startingDuel ? 'Duel Tayyorlanmoqda...' : 'Duelni Boshlash (10 Savol)'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
