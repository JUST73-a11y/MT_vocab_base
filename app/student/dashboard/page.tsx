'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { Play, Loader2, TrendingUp, BookOpen, Flame, Star, Award, Zap, Trophy, Gamepad2 } from 'lucide-react';

const LEVELS = [
    { level: 1, name: "Yangi boshlovchi", xpNeeded: 0, icon: "🌱", color: '#6ee7b7' },
    { level: 2, name: "O'rganuvchi", xpNeeded: 100, icon: "📖", color: '#60a5fa' },
    { level: 3, name: "So'z ustasi", xpNeeded: 300, icon: "⚡", color: '#a78bfa' },
    { level: 4, name: "Leksikon", xpNeeded: 700, icon: "🧠", color: '#f59e0b' },
    { level: 5, name: "Vocabulary Master", xpNeeded: 1500, icon: "🏆", color: '#f87171' },
];

export default function StudentDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [gifts, setGifts] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [streak, setStreak] = useState<any>(null);
    const [gameProfile, setGameProfile] = useState<any>(null);
    const [energyData, setEnergyData] = useState<any>(null);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }
        if (user) loadData();
    }, [user, loading, router]);

    const loadData = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const [data, giftsData, streakData, gameData, energy] = await Promise.all([
                fetch('/api/student/dashboard-summary').then(r => r.json()),
                fetch('/api/student/gifts').then(r => r.json()),
                fetch('/api/student/streak').then(r => r.json()).catch(() => null),
                fetch('/api/student/gamification').then(r => r.json()).catch(() => null),
                fetch('/api/student/energy').then(r => r.json()).catch(() => null),
            ]);
            setStats(data);
            setGifts(giftsData.gifts || []);
            setStreak(streakData);
            setGameProfile(gameData);
            setEnergyData(energy);
        } catch (error) {
            
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const currentLevel = LEVELS.find(l => l.level === (gameProfile?.level || 1)) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.level === (gameProfile?.level || 1) + 1);
    const xpProgress = gameProfile && nextLevel
        ? Math.round(((gameProfile.xp - currentLevel.xpNeeded) / (nextLevel.xpNeeded - currentLevel.xpNeeded)) * 100)
        : 100;

    return (
        <div className="flex flex-col items-center w-full min-h-full bg-transparent p-4 md:p-8 xl:p-12 overflow-y-auto overflow-x-hidden">
            <main className="max-w-6xl w-full flex flex-col gap-8 md:gap-12 min-w-0">
                <div className="text-center md:text-left break-words">
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-2 tracking-tighter leading-tight">
                        Xush kelibsiz, <span className="text-indigo-400">{user.name.split(' ')[0]}</span>!
                    </h2>
                    <p className="text-xs md:text-sm lg:text-lg text-white/40 font-bold uppercase tracking-[0.2em] mt-2">
                        Mashg'ulotlarni davom ettirishga tayyormisiz?
                    </p>
                </div>

                {/* ── Streak + Level + Energy Banner ── */}
                {(streak || gameProfile || energyData) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Streak Card */}
                        <div className="relative overflow-hidden rounded-2xl p-5 md:p-6 flex items-center gap-5"
                            style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(239,68,68,0.08))', border: '1px solid rgba(251,146,60,0.25)' }}>
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                                style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)' }}>
                                🔥
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/70 mb-0.5">Davomiylik</p>
                                <p className="text-3xl md:text-4xl font-black text-white">
                                    {streak?.currentStreak || 0}
                                    <span className="text-sm font-black text-orange-400 ml-2">kun</span>
                                </p>
                                <p className="text-[10px] text-white/30 font-bold mt-1">
                                    Eng uzun: {streak?.longestStreak || 0} kun · Jami faol: {streak?.totalActiveDays || 0} kun
                                </p>
                            </div>
                        </div>

                        {/* XP / Level Card */}
                        <div className="relative overflow-hidden rounded-2xl p-5 md:p-6"
                            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))', border: '1px solid rgba(139,92,246,0.25)' }}>
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                                    {currentLevel.icon}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 mb-0.5">Daraja</p>
                                    <p className="text-lg font-black text-white leading-tight">{currentLevel.name}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-2xl font-black text-purple-300">{gameProfile?.xp || 0}</p>
                                    <p className="text-[9px] text-white/30 font-bold">XP</p>
                                </div>
                            </div>
                            {/* XP Progress Bar */}
                            {nextLevel && (
                                <div>
                                    <div className="flex justify-between text-[9px] font-black text-white/30 mb-1.5">
                                        <span>Daraja {currentLevel.level}</span>
                                        <span>{xpProgress}% · {nextLevel.xpNeeded - (gameProfile?.xp || 0)} XP qoldi</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <div className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${Math.min(xpProgress, 100)}%`,
                                                background: 'linear-gradient(90deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))',
                                                boxShadow: '0 0 8px rgba(139,92,246,0.5)'
                                            }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ⚡ Energy Card */}
                        {energyData && (
                            <div className="relative overflow-hidden rounded-2xl p-5 md:p-6"
                                style={{
                                    background: energyData.energy === 0
                                        ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(185,28,28,0.08))'
                                        : 'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(161,98,7,0.08))',
                                    border: energyData.energy === 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(234,179,8,0.25)'
                                }}>
                                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
                                    style={{ background: energyData.energy === 0 ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)' }} />
                                <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                    style={{ color: energyData.energy === 0 ? 'rgba(239,68,68,0.7)' : 'rgba(234,179,8,0.7)' }}>
                                    Kunlik Energiya
                                </p>
                                {/* Pip dots */}
                                <div className="flex gap-1.5 mb-3 flex-wrap">
                                    {Array.from({ length: energyData.maxEnergy || 10 }).map((_, i) => (
                                        <div key={i} className="w-5 h-5 rounded-md flex items-center justify-center text-xs transition-all"
                                            style={{
                                                background: i < energyData.energy
                                                    ? (energyData.energy <= 3 ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.3)')
                                                    : 'rgba(255,255,255,0.05)',
                                                border: i < energyData.energy
                                                    ? (energyData.energy <= 3 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(234,179,8,0.4)')
                                                    : '1px solid rgba(255,255,255,0.07)',
                                            }}>
                                            {i < energyData.energy && <span style={{ fontSize: '10px' }}>⚡</span>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xl font-black text-white">
                                    {energyData.energy}
                                    <span className="text-sm font-black ml-1" style={{ color: 'rgba(234,179,8,0.6)' }}>
                                        / {energyData.maxEnergy || 10}
                                    </span>
                                </p>
                                {energyData.energy < (energyData.maxEnergy || 10) && (
                                    <p className="text-[10px] text-white/30 font-bold mt-1">
                                        {energyData.energy === 0 ? '⏳ ' : ''}
                                        {energyData.nextRefillHours}s {energyData.nextRefillMins}d dan keyin to'ladi
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 min-w-0">
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-indigo-500/30 transition-all border-white/5 bg-white/[0.02] min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 truncate">
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-xl md:rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest w-full truncate whitespace-normal leading-tight">Bugungi O'rganilgan</h3>
                        </div>
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-white truncate w-full">
                            {loadingData ? '...' : stats?.todayWords || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1 hidden sm:inline">so'z</span>
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-emerald-500/30 transition-all border-white/5 bg-white/[0.02] min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 truncate">
                            <div className="p-2 md:p-3 bg-emerald-500/10 rounded-xl md:rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest w-full truncate whitespace-normal leading-tight">Jami So'zlar</h3>
                        </div>
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-white truncate w-full">
                            {loadingData ? '...' : stats?.totalWords || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1 hidden sm:inline">so'z</span>
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-purple-500/30 transition-all border-white/5 bg-white/[0.02] min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 truncate">
                            <div className="p-2 md:p-3 bg-purple-500/10 rounded-xl md:rounded-2xl border border-purple-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <Play className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest w-full truncate whitespace-normal leading-tight">Faol Bo'limlar</h3>
                        </div>
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-white truncate w-full">
                            {loadingData ? '...' : stats?.availableUnits || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1 hidden sm:inline">ta</span>
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-amber-500/30 transition-all border-white/5 bg-white/[0.02] min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 truncate">
                            <div className="p-2 md:p-3 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <Star className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest w-full truncate whitespace-normal leading-tight">MT Coinlar</h3>
                        </div>
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-amber-400 truncate w-full">
                            {loadingData ? '...' : stats?.mtCoins || 0}
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-indigo-500/30 transition-all border-white/5 bg-white/[0.02] min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 truncate">
                            <div className="p-2 md:p-3 bg-indigo-500/10 rounded-xl md:rounded-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <Zap className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest w-full truncate whitespace-normal leading-tight">To'g'ri Javoblar</h3>
                        </div>
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-white truncate w-full">
                            {loadingData ? '...' : stats?.todayCorrect || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1 hidden sm:inline">so'z</span>
                        </p>
                    </div>

                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-red-500/30 transition-all border-white/5 bg-white/[0.02] min-w-0">
                        <div className="flex items-center gap-3 md:gap-4 truncate">
                            <div className="p-2 md:p-3 bg-red-500/10 rounded-xl md:rounded-2xl border border-red-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest truncate">Aniqlik</h3>
                        </div>
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-white truncate w-full">
                            {loadingData ? '...' : stats?.todayAccuracy || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1 hidden sm:inline">%</span>
                        </p>
                    </div>
                </div>

                {/* Badges */}
                {gameProfile?.badges?.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-black text-white">Nishonlar</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {gameProfile.badges.map((badge: any) => (
                                <div key={badge.id}
                                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-105"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    title={badge.description}>
                                    <span className="text-xl">{badge.icon}</span>
                                    <span className="text-white/80">{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Start Button or Empty State */}
                <div className="flex flex-col items-center mt-4 w-full min-w-0">
                    {stats?.availableUnits > 0 ? (
                        <div className="text-center w-full px-2 min-w-0 flex flex-col items-center gap-6">
                            <div className="flex flex-col md:flex-row gap-5 w-full items-stretch md:items-center justify-center">
                                <Link
                                    href="/student/random"
                                    className="group relative flex items-center justify-center gap-4 rounded-2xl font-black text-white transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        boxShadow: '0 20px 50px -12px rgba(99,102,241,0.55)',
                                        padding: '22px 40px',
                                        fontSize: '18px',
                                        minWidth: '260px',
                                    }}
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{background: 'linear-gradient(135deg, #4f46e5, #7c3aed)'}} />
                                    <Play className="relative z-10 shrink-0" style={{width:'26px',height:'26px',fill:'currentColor'}} />
                                    <span className="relative z-10">Mashqni boshlash</span>
                                    <div className="shimmer-active" />
                                </Link>

                                <Link
                                    href="/student/games"
                                    className="group relative flex items-center justify-center gap-4 rounded-2xl font-black text-white transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        boxShadow: '0 20px 50px -12px rgba(16,185,129,0.50)',
                                        padding: '22px 40px',
                                        fontSize: '18px',
                                        minWidth: '260px',
                                    }}
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{background: 'linear-gradient(135deg, #059669, #047857)'}} />
                                    <Gamepad2 className="relative z-10 shrink-0" style={{width:'26px',height:'26px'}} />
                                    <span className="relative z-10">O&apos;yinlarni o&apos;ynash</span>
                                    <div className="shimmer-active" />
                                </Link>
                            </div>
                            <p className="text-white/20 mt-2 font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em] px-4 break-words text-center max-w-full">
                                RANDOM REJIMIDA SO'ZLARNI TAKRORLASH YOKI O'YINLAR ORQALI O'RGANISH
                            </p>
                        </div>
                    ) : !loadingData && (
                        <div className="glass-card p-8 md:p-12 lg:p-20 text-center flex flex-col items-center gap-6 border-white/5 opacity-80 w-full min-w-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 md:mb-4 shrink-0">
                                <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-white/20" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">Hali unitlar biriktirilmagan</h3>
                            <p className="text-sm md:text-base text-white/40 max-w-md leading-relaxed">
                                Sizga hali hech qanday o'quv bo'limi biriktirilmagan. Iltimos, o'qituvchingiz bilan bog'laning.
                            </p>
                        </div>
                    )}
                </div>

                {/* 🎁 Sovg'alar qismi */}
                {gifts.length > 0 && (
                    <div className="mt-8 md:mt-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                                <span className="text-xl">🎁</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Olingan Sovg'alar</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {gifts.map((gift) => (
                                <div key={gift._id} className="glass-card p-5 border-pink-500/20 bg-pink-500/5 group hover:bg-pink-500/10 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-2xl group-hover:scale-110 transition-transform origin-bottom-left">🎁</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-pink-400/50 bg-pink-500/10 px-2 py-1 rounded-md">
                                            {new Date(gift.createdAt).toLocaleDateString('uz-UZ')}
                                        </span>
                                    </div>
                                    <h4 className="text-lg font-black text-white leading-tight mb-2">{gift.meta?.reason}</h4>
                                    <p className="text-xs font-bold text-pink-300/70 uppercase tracking-widest">{Math.abs(gift.amount)} MT Coin Evaziga</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
