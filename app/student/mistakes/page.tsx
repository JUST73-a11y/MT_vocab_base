'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import {
    Brain, Search, Filter, Loader2, BookOpen, RefreshCw,
    CheckCircle, AlertTriangle, ArrowLeft, Sparkles, XCircle, Clock
} from 'lucide-react';

interface MistakeWord {
    _id: string;
    wordId: string;
    unitId: string | null;
    unitTitle: string;
    englishWord: string;
    uzbekTranslation: string;
    phonetic: string | null;
    wrongCount: number;
    lastWrongAt: string;
    isLearned: boolean;
}

interface UnitOption {
    id: string;
    title: string;
}

export default function MistakesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [mistakes, setMistakes] = useState<MistakeWord[]>([]);
    const [units, setUnits] = useState<UnitOption[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [search, setSearch] = useState('');
    const [unitFilter, setUnitFilter] = useState('');
    const [sortBy, setSortBy] = useState<'wrongCount' | 'lastWrongAt'>('wrongCount');
    const [showLearned, setShowLearned] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }
        if (user) loadMistakes();
    }, [user, loading, router]);

    const loadMistakes = async () => {
        setLoadingData(true);
        try {
            const params = new URLSearchParams();
            params.set('sort', sortBy);
            if (unitFilter) params.set('unitId', unitFilter);
            if (showLearned) params.set('showLearned', 'true');

            const data = await apiFetch(`/api/student/mistakes?${params.toString()}`);
            setMistakes(data.mistakes || []);
            setUnits(data.units || []);
        } catch (err) {
            console.error('Failed to load mistakes:', err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (user) loadMistakes();
    }, [sortBy, unitFilter, showLearned]);

    const toggleLearned = async (mistakeId: string, currentState: boolean) => {
        try {
            await apiFetch('/api/student/mistakes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mistakeId, isLearned: !currentState }),
            });
            setMistakes(prev => prev.map(m =>
                m._id === mistakeId ? { ...m, isLearned: !currentState } : m
            ));
            toast.success(!currentState ? "O'rganildi deb belgilandi" : "Belgi olib tashlandi");
        } catch {
            toast.error('Xatolik yuz berdi');
        }
    };

    const startWrongQuiz = () => {
        const wordIds = filtered.filter(m => !m.isLearned).map(m => m.wordId);
        if (wordIds.length === 0) {
            toast.error("Xato so'zlar yo'q!");
            return;
        }
        // Store wrong word IDs in sessionStorage and navigate to quiz
        sessionStorage.setItem('reviewWordIds', JSON.stringify(wordIds));
        router.push('/student/quiz?reviewMode=true');
    };

    const filtered = mistakes.filter(m =>
        m.englishWord.toLowerCase().includes(search.toLowerCase()) ||
        m.uzbekTranslation.toLowerCase().includes(search.toLowerCase())
    );

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} daqiqa oldin`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} soat oldin`;
        const days = Math.floor(hours / 24);
        return `${days} kun oldin`;
    };

    if (loading || loadingData) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-8 md:py-12 px-4 animate-fade-in flex flex-col gap-8">

            {/* ── Header ── */}
            <div className="glass-card px-8 py-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <button onClick={() => router.back()}
                            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                            <ArrowLeft className="w-6 h-6 text-white/40" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Brain className="w-7 h-7 text-purple-400" />
                                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Yodlash</h1>
                                <div className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest">
                                    {filtered.length} ta so&apos;z
                                </div>
                            </div>
                            <p className="text-white/30 text-sm font-bold">Xato qilgan so&apos;zlaringizni qayta takrorlang</p>
                        </div>
                    </div>

                    {filtered.filter(m => !m.isLearned).length > 0 && (
                        <button onClick={startWrongQuiz}
                            className="btn-premium px-6 py-4 text-xs font-black shadow-purple-500/20 shrink-0 !bg-gradient-to-r !from-purple-600 !to-indigo-600">
                            <RefreshCw className="w-5 h-5" /> Xato quiz boshlash
                        </button>
                    )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                        type="text"
                        placeholder="So'z qidirish..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-premium pl-12 h-12"
                    />
                </div>

                <select
                    value={unitFilter}
                    onChange={e => setUnitFilter(e.target.value)}
                    className="h-12 bg-white/[0.03] border border-white/10 rounded-2xl px-4 text-sm font-bold text-white/80 outline-none focus:border-purple-500/40 transition-all appearance-none cursor-pointer"
                >
                    <option value="">Barcha unitlar</option>
                    {units.map(u => (
                        <option key={u.id} value={u.id}>{u.title}</option>
                    ))}
                </select>

                <div className="flex bg-gray-950 p-1 rounded-xl border border-white/5 shrink-0">
                    <button
                        onClick={() => setSortBy('wrongCount')}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${sortBy === 'wrongCount' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
                    >
                        Ko&apos;p xato
                    </button>
                    <button
                        onClick={() => setSortBy('lastWrongAt')}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${sortBy === 'lastWrongAt' ? 'bg-purple-600 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
                    >
                        Yangi xato
                    </button>
                </div>
            </div>

            {/* ── Empty State ── */}
            {filtered.length === 0 && (
                <div className="glass-card py-20 text-center flex flex-col items-center gap-6 !bg-emerald-500/[0.02] border-dashed !border-emerald-500/20">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-emerald-400 mb-2">Hech qanday xato yo&apos;q!</h3>
                        <p className="text-white/30 text-sm font-bold">Siz barcha so&apos;zlarni to&apos;g&apos;ri bilasiz. Ajoyib!</p>
                    </div>
                    <button onClick={() => router.push('/student/quiz')} className="btn-premium px-8 py-3 text-xs">
                        <BookOpen className="w-4 h-4" /> Quizga qaytish
                    </button>
                </div>
            )}

            {/* ── Word Cards ── */}
            <div className="grid grid-cols-1 gap-4">
                {filtered.map(m => (
                    <div key={m._id}
                        className={`glass-card !rounded-2xl p-6 flex items-center gap-5 group transition-all ${m.isLearned ? 'opacity-50' : ''}`}
                    >
                        {/* Wrong count badge */}
                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${m.wrongCount >= 5 ? 'bg-red-500/10 border-red-500/20' : m.wrongCount >= 3 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                            <span className={`text-xl font-black ${m.wrongCount >= 5 ? 'text-red-400' : m.wrongCount >= 3 ? 'text-amber-400' : 'text-white/60'}`}>
                                {m.wrongCount}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">xato</span>
                        </div>

                        {/* Word info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                                <h3 className="text-xl font-black text-white break-words">{m.englishWord}</h3>
                                {m.phonetic && (
                                    <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10">
                                        [{m.phonetic}]
                                    </span>
                                )}
                                {m.wrongCount >= 3 && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                                        Weak word
                                    </span>
                                )}
                            </div>
                            <p className="text-lg font-bold text-indigo-400 break-words">{m.uzbekTranslation}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-white/20 font-bold uppercase tracking-widest flex-wrap">
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3" /> {m.unitTitle}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {timeAgo(m.lastWrongAt)}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <button
                            onClick={() => toggleLearned(m._id, m.isLearned)}
                            className={`p-3 rounded-xl transition-all shrink-0 ${m.isLearned
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-white/20 border border-white/10 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                }`}
                            title={m.isLearned ? "O'rganilmaganga qaytarish" : "O'rganildi deb belgilash"}
                        >
                            <CheckCircle className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
