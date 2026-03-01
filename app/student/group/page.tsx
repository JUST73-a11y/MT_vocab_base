'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { Users, Loader2, Trophy, Activity, Medal, Star, ShieldCheck, PlayCircle, Timer, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserMember {
    _id: string;
    name: string;
    totalWordsSeen: number;
    todayWordsSeen: number;
    coinBalance: number;
    joinedAt: string;
    isCurrentUser: boolean;
}

interface GroupDetails {
    id: string;
    name: string;
    createdAt: string;
    memberCount: number;
}

interface GroupDataResponse {
    group: GroupDetails | null;
    activeQuiz: {
        id: string;
        questionCount: number;
        durationMin: number;
        startsAt: string;
    } | null;
    members: UserMember[];
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
            console.error('Failed to load group data:', error);
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
                    Sizni hali hech qaysi ustoz o'z guruhiga qo'shmagan. Ustozingiz sizni guruhga qo'shgandan so'ng, bu yerda guruhdoshlaringiz reytingi va qiziqarli statistikalarni ko'rishingiz mumkin bo'ladi.
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

    const { group, members } = groupData;

    return (
        <div className="w-full max-w-5xl mx-auto py-8 md:py-12 px-4 animate-fade-in flex flex-col gap-10">

            {/* ── Premium Group Header ── */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 via-[#161435] to-[#0f0d23] border border-white/10 p-8 md:p-12 pl-8 md:pl-16 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-4 group-hover-scale isolate">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">
                            Mening Guruhim
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex flex-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {group.memberCount} talaba
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-2" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                        {group.name}
                    </h1>
                    <p className="text-white/40 text-sm font-medium mt-3">
                        Guruh a'zolari bilan raqobatlashing va ko'proq MT Coin yig'ing!
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
                            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">Guruh Testi boshlandi!</h2>
                            <div className="flex items-center gap-3 mt-2 text-white/50 text-xs font-medium">
                                <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" /> {groupData.activeQuiz.questionCount} ta savol</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {groupData.activeQuiz.durationMin} daqiqa</span>
                            </div>
                        </div>
                    </div>
                    <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm transition-all shadow-lg shadow-emerald-500/20 shrink-0 relative z-10 group-hover:scale-105 active:scale-95 flex justify-center items-center gap-2">
                        Qatnashish <PlayCircle className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ── Leaderboard Section ── */}
            <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0 shadow-lg shadow-amber-500/5">
                        <Trophy className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white">Guruh Reytingi</h2>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">MT Coins va Faollik bo'yicha</p>
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

                        return (
                            <div
                                key={member._id}
                                className={`group flex items-center justify-between p-4 md:p-5 rounded-2xl transition-all border
                                    ${member.isCurrentUser
                                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5 scale-[1.02] transform'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                            >
                                <div className="flex items-center gap-4 md:gap-6">
                                    <div className="shrink-0">
                                        {rankBadge}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${member.isCurrentUser ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-800 text-gray-400'}`}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-black text-base md:text-lg ${member.isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                                                    {member.name}
                                                </h3>
                                                {member.isCurrentUser && (
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300">Siz</span>
                                                )}
                                                {isTop1 && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 ml-1" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 md:gap-8 text-right">
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-0.5">Bugungi so'zlar</p>
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
                            <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Hozircha guruhda talabalar yo'q</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
