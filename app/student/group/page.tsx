'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { Users, Loader2, Trophy, Activity, Medal, Star, ShieldCheck, PlayCircle, Timer, ClipboardList, TrendingUp, Crown, Zap, Target, ArrowRight, CheckCircle, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserMember {
    _id: string;
    name: string;
    totalWordsSeen: number;
    todayWordsSeen: number;
    todayCorrect: number;
    coinBalance: number;
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

interface Insights {
    studentRank: number;
    groupTodayCorrect: number;
    groupAvgCorrect: number;
    studentTodayCorrect: number;
    studentCoinBalance: number;
    nextRankGap: number | null;
    memberCount: number;
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

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }
        if (user) {
            loadGroupData();
        }
    }, [user, loading, router]);

    const loadGroupData = async () => {
        setLoadingData(true);
        try {
            const data = await apiFetch('/api/student/group');
            setGroupData(data);
        } catch (error) {
            
        } finally {
            setLoadingData(false);
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
    const rankEmojis = ['🥇', '🥈', '🥉'];

    return (
        <div className="w-full max-w-5xl mx-auto py-8 md:py-12 px-4 animate-fade-in flex flex-col gap-8">

            {/* ── Premium Group Header ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 via-[#161435] to-[#0f0d23] border border-white/10 p-8 md:p-12 shadow-2xl isolate">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                            Mening Guruhim
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {group.memberCount} talaba
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 tracking-tighter mb-2 drop-shadow-2xl py-2">
                        {group.name}
                    </h1>
                    <p className="text-white/40 text-sm font-medium mt-3 flex items-center gap-2">
                        <span>Ustoz: <span className="text-indigo-300 font-bold">{group.teacherName}</span></span>
                    </p>
                </div>
            </div>

            {/* ── Student Rank + Insights ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rank Card */}
                <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px] -mr-8 -mt-8 pointer-events-none" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60 mb-2">Sizning o&apos;rningiz</p>
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-indigo-400">{insights.studentRank}</span>
                        <span className="text-2xl font-black text-indigo-400/40 mb-1">/ {insights.memberCount}</span>
                    </div>
                    {insights.nextRankGap && insights.nextRankGap > 0 && (
                        <p className="text-[10px] font-bold text-indigo-300/50 mt-3 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Yana {insights.nextRankGap} MT Coin yig&apos;sang {insights.studentRank - 1}-o&apos;ringa chiqasiz
                        </p>
                    )}
                </div>

                {/* Today correct */}
                <div className="rounded-3xl p-6" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/60 mb-2">Bugungi to&apos;g&apos;ri</p>
                    <p className="text-5xl font-black text-emerald-400">{insights.studentTodayCorrect}</p>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${insights.groupAvgCorrect > 0 ? Math.min(100, (insights.studentTodayCorrect / insights.groupAvgCorrect) * 50) : 0}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-white/20">O&apos;rta: {insights.groupAvgCorrect}</span>
                    </div>
                </div>

                {/* MT Coin Balance */}
                <div className="rounded-3xl p-6" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-400/60 mb-2">MT Coin</p>
                    <div className="flex items-center gap-2">
                        <span className="text-5xl font-black text-amber-400">{insights.studentCoinBalance}</span>
                        <span className="text-2xl">🪙</span>
                    </div>
                    <p className="text-[10px] font-bold text-amber-300/40 mt-3">
                        Guruh bo&apos;yicha bugun: {insights.groupTodayCorrect} to&apos;g&apos;ri javob
                    </p>
                </div>
            </div>

            {/* ── Active Quiz Banner ── */}
            {groupData.activeQuiz && (
                <div className="relative overflow-hidden rounded-3xl bg-emerald-500/10 border border-emerald-500/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_40px_rgba(16,185,129,0.1)] group cursor-pointer" onClick={() => router.push(`/student/quiz?groupSessionId=${groupData.activeQuiz!.id}&autoStart=true`)}>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 font-black animate-pulse">
                            <PlayCircle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <h3 className="text-emerald-400 font-black tracking-widest text-[10px] uppercase">Aktiv Musobaqa</h3>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{groupData.activeQuiz.title}</h2>
                            <div className="flex items-center gap-3 mt-2 text-white/50 text-xs font-medium">
                                <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> {groupData.activeQuiz.questionCount} ta savol</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {groupData.activeQuiz.timeLimitSec}s har savol</span>
                            </div>
                        </div>
                    </div>
                    <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm transition-all shadow-lg shadow-emerald-500/20 shrink-0 relative z-10 group-hover:scale-105 active:scale-95 flex justify-center items-center gap-2">
                        Qatnashish <PlayCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Published Group Quizzes ── */}
            {publishedQuizzes && publishedQuizzes.length > 0 && (
                <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 bg-white/[0.02]">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <Brain className="w-5 h-5 text-purple-400" />
                        </div>
                        <h2 className="text-lg font-black text-white">Guruh Quizlari</h2>
                    </div>
                    <div className="space-y-3">
                        {publishedQuizzes.map(quiz => (
                            <div key={quiz.id}
                                className={`p-5 rounded-2xl border transition-all ${quiz.studentCompleted
                                    ? 'bg-emerald-500/5 border-emerald-500/20'
                                    : 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10 cursor-pointer'}`}
                                onClick={() => !quiz.studentCompleted && router.push(`/student/quiz?groupSessionId=${quiz.id}&autoStart=true`)}
                            >
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div>
                                        <h3 className="text-base font-black text-white">{quiz.title}</h3>
                                        {quiz.description && <p className="text-xs text-white/30 mt-1">{quiz.description}</p>}
                                        <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                                            <span>{quiz.questionCount} ta savol</span>
                                            <span>•</span>
                                            <span>{quiz.timeLimitSec}s</span>
                                            <span>•</span>
                                            <span>{quiz.mode}</span>
                                        </div>
                                    </div>
                                    {quiz.studentCompleted && quiz.studentResult ? (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm font-black text-emerald-400">
                                                {quiz.studentResult.correctCount}/{quiz.studentResult.answeredCount}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <PlayCircle className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm font-black text-purple-400">Boshlash</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Group Statistics Chart ── */}
            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                        <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white">Guruh Statistikasi</h2>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">Bugungi Faollik Taqqoslash</p>
                    </div>
                </div>

                {/* Stacked bar chart - today correct per member */}
                <div className="mb-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Bugungi To'g'ri Javoblar</p>
                    <div className="space-y-3">
                        {members.slice(0, 8).map((member, i) => {
                            const maxCorrect = Math.max(...members.map(m => m.todayCorrect || 0), 1);
                            const pct = Math.round(((member.todayCorrect || 0) / maxCorrect) * 100);
                            const colors = [
                                'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                'linear-gradient(90deg,#10b981,#34d399)',
                                'linear-gradient(90deg,#f59e0b,#fbbf24)',
                                'linear-gradient(90deg,#ef4444,#f87171)',
                                'linear-gradient(90deg,#3b82f6,#60a5fa)',
                                'linear-gradient(90deg,#a855f7,#c084fc)',
                                'linear-gradient(90deg,#14b8a6,#2dd4bf)',
                                'linear-gradient(90deg,#f97316,#fb923c)',
                            ];
                            return (
                                <div key={member._id} className={`flex items-center gap-3 ${member.isCurrentUser ? 'opacity-100' : 'opacity-70'}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${member.isCurrentUser ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60'}`}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-black truncate max-w-[120px] ${member.isCurrentUser ? 'text-indigo-300' : 'text-white/60'}`}>
                                                {member.name.split(' ')[0]}{member.isCurrentUser ? ' (siz)' : ''}
                                            </span>
                                            <span className="text-xs font-black text-white/50">{member.todayCorrect || 0}</span>
                                        </div>
                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Coin balance bar chart */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">MT Coin Balansi</p>
                    <div className="space-y-3">
                        {members.slice(0, 8).map((member, i) => {
                            const maxCoins = Math.max(...members.map(m => m.coinBalance || 0), 1);
                            const pct = Math.round(((member.coinBalance || 0) / maxCoins) * 100);
                            return (
                                <div key={member._id} className={`flex items-center gap-3 ${member.isCurrentUser ? 'opacity-100' : 'opacity-70'}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${member.isCurrentUser ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'}`}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-black truncate max-w-[120px] ${member.isCurrentUser ? 'text-amber-300' : 'text-white/60'}`}>
                                                {member.name.split(' ')[0]}{member.isCurrentUser ? ' (siz)' : ''}
                                            </span>
                                            <span className="text-xs font-black text-amber-400/70">{member.coinBalance || 0} 🪙</span>
                                        </div>
                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary donut-style personal comparison */}
                <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                            <svg viewBox="0 0 64 64" className="-rotate-90 w-full h-full">
                                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle cx="32" cy="32" r="26" fill="none" stroke="#6366f1" strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 26}`}
                                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - Math.min(1, (insights.studentTodayCorrect || 0) / Math.max(insights.groupAvgCorrect, 1)))}`}
                                    strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-indigo-300">{insights.studentTodayCorrect}</span>
                            </div>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Sizning</p>
                    </div>
                    <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                            <svg viewBox="0 0 64 64" className="-rotate-90 w-full h-full">
                                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle cx="32" cy="32" r="26" fill="none" stroke="#10b981" strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 26}`}
                                    strokeDashoffset={`${2 * Math.PI * 26 * 0.5}`}
                                    strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-emerald-300">{insights.groupAvgCorrect}</span>
                            </div>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">O'rtacha</p>
                    </div>
                    <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2">
                            <svg viewBox="0 0 64 64" className="-rotate-90 w-full h-full">
                                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                <circle cx="32" cy="32" r="26" fill="none" stroke="#f59e0b" strokeWidth="8"
                                    strokeDasharray={`${2 * Math.PI * 26}`}
                                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - Math.min(1, (insights.studentRank - 1) / Math.max(insights.memberCount - 1, 1)))}`}
                                    strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-black text-amber-300">#{insights.studentRank}</span>
                            </div>
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/30">O'rningiz</p>
                    </div>
                </div>
            </div>

            {/* ── Leaderboard Section ── */}
            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-lg shadow-amber-500/5">
                        <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white">Guruh Reytingi</h2>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">MT Coins va Faollik bo&apos;yicha</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {members.map((member, index) => {
                        const isTop1 = index === 0;
                        const isTop2 = index === 1;
                        const isTop3 = index === 2;

                        let rankBadge = (
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-xs font-black text-white/40">
                                {index + 1}
                            </div>
                        );

                        if (isTop1) rankBadge = <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 border border-amber-500/30 text-lg font-black text-amber-400 shadow-lg shadow-amber-500/20"><Medal className="w-5 h-5 absolute opacity-20" />1</div>;
                        else if (isTop2) rankBadge = <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-300/20 border border-slate-300/30 text-base font-black text-slate-300 shadow-lg shadow-slate-300/10">2</div>;
                        else if (isTop3) rankBadge = <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-700/20 border border-amber-700/30 text-base font-black text-amber-600 shadow-lg shadow-amber-700/10">3</div>;

                        // Calculate relative bar width
                        const maxCoins = members[0]?.coinBalance || 1;
                        const barWidth = maxCoins > 0 ? ((member.coinBalance / maxCoins) * 100) : 0;

                        return (
                            <div
                                key={member._id}
                                className={`group flex items-center justify-between p-4 md:p-5 rounded-2xl transition-all border relative overflow-hidden
                                    ${member.isCurrentUser
                                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5 scale-[1.02] transform'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                            >
                                {/* Progress bar background */}
                                <div className="absolute inset-0 left-0 top-0 h-full bg-indigo-500/5 rounded-2xl pointer-events-none transition-all"
                                    style={{ width: `${barWidth}%` }} />

                                <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1 pr-4 relative z-10">
                                    <div className="shrink-0">
                                        {rankBadge}
                                    </div>
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 ${member.isCurrentUser ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-800 text-gray-400'}`}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <h3 className={`font-black text-sm md:text-lg truncate ${member.isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                                                    {member.name}
                                                </h3>
                                                {member.isCurrentUser && (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 shrink-0">Siz</span>
                                                )}
                                                {isTop1 && <Star className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-400 fill-amber-400 ml-1 shrink-0" />}
                                            </div>
                                            {/* Today correct mini stat */}
                                            <p className="text-[10px] text-white/20 font-bold mt-0.5">
                                                Bugun: {member.todayCorrect} to&apos;g&apos;ri
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 md:gap-8 text-right shrink-0 relative z-10">
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-0.5">Bugungi</p>
                                        <p className="text-sm font-black text-emerald-400">{member.todayWordsSeen || 0} ta</p>
                                    </div>
                                    <div className="pl-4 md:pl-6 border-l border-white/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/50 mb-0.5">MT Coins</p>
                                        <p className={`text-lg md:text-xl font-black ${isTop1 ? 'text-amber-400' : 'text-amber-500'}`}>
                                            {member.coinBalance}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {members.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Hozircha guruhda talabalar yo&apos;q</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
