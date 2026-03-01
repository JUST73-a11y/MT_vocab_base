'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getTodaySession } from '@/lib/firestore';
import { Session } from '@/lib/types';
import { Play, Loader2, TrendingUp, BookOpen } from 'lucide-react';

export default function StudentDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [gifts, setGifts] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }

        if (user) {
            loadData();
        }
    }, [user, loading, router]);

    const loadData = async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const [data, giftsData] = await Promise.all([
                fetch('/api/student/dashboard-summary').then(r => r.json()),
                fetch('/api/student/gifts').then(r => r.json())
            ]);
            setStats(data);
            setGifts(giftsData.gifts || []);
        } catch (error) {
            console.error('Failed to load data:', error);
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

    return (
        <div className="flex flex-col items-center w-full min-h-full bg-transparent p-4 md:p-12 overflow-y-auto overflow-x-hidden">
            <main className="max-w-6xl w-full animate-fade-in flex flex-col gap-8 md:gap-12">
                <div className="text-center md:text-left">
                    <h2 className="text-3xl md:text-6xl font-black text-white mb-2 tracking-tighter">
                        Xush kelibsiz, <span className="text-indigo-400">{user.name.split(' ')[0]}</span>!
                    </h2>
                    <p className="text-xs md:text-lg text-white/40 font-bold uppercase tracking-[0.2em]">
                        Mashg'ulotlarni davom ettirishga tayyormisiz?
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                    {/* Progress Card */}
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-indigo-500/30 transition-all border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-blue-500/10 rounded-xl md:rounded-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest">Progress</h3>
                        </div>
                        <p className="text-2xl md:text-5xl font-black text-white">
                            {loadingData ? '...' : stats?.todayWords || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1">so'z</span>
                        </p>
                    </div>

                    {/* Total Learned */}
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-emerald-500/30 transition-all border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-emerald-500/10 rounded-xl md:rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest">Jami</h3>
                        </div>
                        <p className="text-2xl md:text-5xl font-black text-white">
                            {loadingData ? '...' : stats?.totalWords || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1">so'z</span>
                        </p>
                    </div>

                    {/* Units Card */}
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-purple-500/30 transition-all border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-purple-500/10 rounded-xl md:rounded-2xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest">Bo'limlar</h3>
                        </div>
                        <p className="text-2xl md:text-5xl font-black text-white">
                            {loadingData ? '...' : stats?.availableUnits || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1">ta</span>
                        </p>
                    </div>

                    {/* Coins Card */}
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-amber-500/30 transition-all border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-amber-500/10 rounded-xl md:rounded-2xl border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-amber-400 rotate-90" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest">MT Coins</h3>
                        </div>
                        <p className="text-2xl md:text-5xl font-black text-amber-400">
                            {loadingData ? '...' : stats?.mtCoins || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1">tangalar</span>
                        </p>
                    </div>

                    {/* Correct Card */}
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-indigo-500/30 transition-all border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-indigo-500/10 rounded-xl md:rounded-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest">To'gri</h3>
                        </div>
                        <p className="text-2xl md:text-5xl font-black text-white">
                            {loadingData ? '...' : stats?.todayCorrect || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1">so'z</span>
                        </p>
                    </div>

                    {/* Accuracy Card */}
                    <div className="glass-card p-4 md:p-8 flex flex-col gap-4 md:gap-6 group hover:border-red-500/30 transition-all border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="p-2 md:p-3 bg-red-500/10 rounded-xl md:rounded-2xl border border-red-500/20 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                            </div>
                            <h3 className="text-[9px] md:text-sm font-black text-white/40 uppercase tracking-widest">Aniqlik</h3>
                        </div>
                        <p className="text-2xl md:text-5xl font-black text-white">
                            {loadingData ? '...' : stats?.todayAccuracy || 0}
                            <span className="text-[10px] text-white/20 uppercase tracking-widest ml-1">%</span>
                        </p>
                    </div>
                </div>

                {/* Start Button or Empty State */}
                <div className="flex flex-col items-center mt-4">
                    {stats?.availableUnits > 0 ? (
                        <div className="text-center w-full">
                            <Link
                                href="/student/random"
                                className="btn-premium w-full md:w-auto px-16 py-8 text-2xl group"
                            >
                                <Play className="w-8 h-8 fill-current" />
                                <span>Mashqni boshlash</span>
                                <div className="shimmer-active" />
                            </Link>
                            <p className="text-white/20 mt-8 font-black text-[10px] uppercase tracking-[0.4em]">
                                RANDOM REJIMIDA SO'ZLARNI TAKRORLASH
                            </p>
                        </div>
                    ) : !loadingData && (
                        <div className="glass-card p-12 md:p-20 text-center flex flex-col items-center gap-6 border-white/5 opacity-80">
                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                                <BookOpen className="w-10 h-10 text-white/20" />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Hali unitlar biriktirilmagan</h3>
                            <p className="text-white/40 max-w-md leading-relaxed">
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
                                    <h4 className="text-lg font-black text-white leading-tight mb-2">
                                        {gift.meta?.reason}
                                    </h4>
                                    <p className="text-xs font-bold text-pink-300/70 uppercase tracking-widest">
                                        {Math.abs(gift.amount)} MT Coin Evaziga
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
