'use client';

import { useState, useEffect, useCallback } from 'react';
import { Coins, BookOpen, CheckCircle2, TrendingUp, LayoutGrid, Clock, Trophy, ChevronRight, RefreshCw } from 'lucide-react';

type Range = 'today' | '7d' | '30d' | 'all';

interface Stats {
    range: Range;
    wordsSeen: number;
    correct: number;
    accuracy: number;
    unitsPracticed: number;
    unitBreakdown: { unitId: string; seen: number; correct: number; accuracy: number }[];
}

interface WalletData {
    balance: number;
    transactions: { _id: string; type: string; amount: number; meta: any; createdAt: string }[];
}

interface Attempt {
    _id: string;
    mode: string;
    correctCount: number;
    answeredCount: number;
    questionCountPlanned: number;
    coinsEarned: number;
    startedAt: string;
    endedAt: string;
}

interface HistoryData {
    attempts: Attempt[];
    total: number;
    totalPages: number;
}

const RANGES: { label: string; value: Range }[] = [
    { label: 'Bugun', value: 'today' },
    { label: '7 kun', value: '7d' },
    { label: '30 kun', value: '30d' },
    { label: "Barcha vaqt", value: 'all' },
];

const txTypeLabel: Record<string, string> = {
    EARN_QUIZ: '🎓 Quiz',
    REDEEM_TEACHER: '🎁 Sovg\'a',
    ADJUST_ADMIN: '⚙️ Admin',
};

function StatCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
    return (
        <div className="glass-card p-6 flex flex-col gap-2" style={{ borderColor: `${color}22` }}>
            <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
                    {icon}
                </div>
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: `${color}99` }}>{label}</span>
            </div>
            <p className="text-4xl font-black text-white">{value}</p>
            {sub && <p className="text-xs text-white/30 font-bold">{sub}</p>}
        </div>
    );
}

export default function StudentStatsPage() {
    const [range, setRange] = useState<Range>('today');
    const [stats, setStats] = useState<Stats | null>(null);
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [history, setHistory] = useState<HistoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [histPage, setHistPage] = useState(1);
    const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

    const fetchStats = useCallback(async (r: Range) => {
        setLoading(true);
        try {
            const [statsRes, walletRes, histRes] = await Promise.all([
                fetch(`/api/quiz/student/stats?range=${r}`),
                fetch('/api/student/wallet'),
                fetch(`/api/quiz/student/history?page=${histPage}`),
            ]);
            const [s, w, h] = await Promise.all([statsRes.json(), walletRes.json(), histRes.json()]);
            setStats(s);
            setWallet(w);
            setHistory(h);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [histPage]);

    useEffect(() => { fetchStats(range); }, [range, histPage]);

    const formatDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
    const formatTime = (d: string) => new Date(d).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-10 animate-fade-in justify-center self-center w-full" style={{ justifySelf: "center" }}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Mening Statistikam</h1>
                    <p className="text-sm text-white/40 mt-1">Quiz natijalari va MT Coin balansi</p>
                </div>
                <button onClick={() => fetchStats(range)}
                    className="p-3 rounded-2xl text-white/40 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* MT Coin Balance Banner */}
            <div className="rounded-3xl p-6 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg,rgba(234,179,8,0.15),rgba(234,179,8,0.05))', border: '1px solid rgba(234,179,8,0.25)' }}>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)' }}>
                        <Coins className="w-7 h-7 text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-yellow-400/70 uppercase tracking-widest">MT Coin Balansi</p>
                        <p className="text-4xl font-black text-yellow-300">
                            {loading ? '—' : wallet?.balance ?? 0}
                            <span className="text-lg text-yellow-400/50 ml-2">MT Coin</span>
                        </p>
                    </div>
                </div>
                {/* Qanday coin topiladi — tushunarliroq */}
                <div className="hidden md:flex flex-col gap-2 text-right">
                    <p className="text-xs font-black text-yellow-400/80 uppercase tracking-widest mb-1">Qanday topiladi?</p>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm">✅</span>
                        <p className="text-xs text-white/50">1 to&apos;g&apos;ri javob = <strong className="text-yellow-300">1 🪙</strong></p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm">🎯</span>
                        <p className="text-xs text-white/50">≥80% aniqlik + ≥10 savol = <strong className="text-yellow-300">+5 🪙 bonus</strong></p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-sm">🎁</span>
                        <p className="text-xs text-white/40 italic">O&apos;qituvchiga sovg&apos;aga almashtirish mumkin</p>
                    </div>
                </div>
            </div>

            {/* Range Selector */}
            <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {RANGES.map(r => (
                    <button key={r.value} onClick={() => setRange(r.value)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
                        style={{
                            background: range === r.value ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                            color: range === r.value ? '#fff' : 'rgba(255,255,255,0.35)',
                            boxShadow: range === r.value ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
                        }}>
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<BookOpen className="w-5 h-5 text-indigo-400" />} label="Ko'rilgan so'zlar" color="#6366f1"
                    value={loading ? '—' : stats?.wordsSeen ?? 0} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />} label="To'g'ri javoblar" color="#10b981"
                    value={loading ? '—' : stats?.correct ?? 0} />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-cyan-400" />} label="Aniqlik" color="#06b6d4"
                    value={loading ? '—' : `${stats?.accuracy ?? 0}%`} />
                <StatCard icon={<LayoutGrid className="w-5 h-5 text-purple-400" />} label="Unitlar" color="#a855f7"
                    value={loading ? '—' : stats?.unitsPracticed ?? 0} sub="mashq qilingan" />
            </div>

            {/* Unit Breakdown */}
            {stats && stats.unitBreakdown.length > 0 && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-base font-black text-white/70 uppercase tracking-widest">Unit bo&apos;yicha natijalar</h2>
                    <div className="space-y-3">
                        {stats.unitBreakdown.map((u, i) => (
                            <div key={u.unitId || i} className="space-y-1.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60 font-bold">{u.unitId ? `Unit ${i + 1}` : 'Noma\'lum unit'}</span>
                                    <span className="text-white/80 font-black">{u.correct}/{u.seen} • {u.accuracy}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${u.accuracy}%`,
                                            background: u.accuracy >= 80 ? 'linear-gradient(90deg,#10b981,#059669)' :
                                                u.accuracy >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' :
                                                    'linear-gradient(90deg,#ef4444,#dc2626)',
                                        }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quiz History */}
            <div className="glass-card p-6 space-y-4">
                <h2 className="text-base font-black text-white/70 uppercase tracking-widest">Quiz tarixi</h2>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                ) : history?.attempts.length === 0 ? (
                    <p className="text-center text-white/30 py-8 font-bold">Hali quiz ishlanmagan</p>
                ) : (
                    <div className="space-y-2">
                        {history?.attempts.map(a => (
                            <button key={a._id} onClick={() => setSelectedAttempt(a)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all hover:scale-[1.01]"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: a.mode === 'GROUP_SESSION' ? 'rgba(168,85,247,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${a.mode === 'GROUP_SESSION' ? 'rgba(168,85,247,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
                                        <Trophy className="w-5 h-5" style={{ color: a.mode === 'GROUP_SESSION' ? '#a855f7' : '#6366f1' }} />
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-sm">
                                            {a.correctCount}/{a.answeredCount} to&apos;g&apos;ri
                                            {a.questionCountPlanned && <span className="text-white/40"> / {a.questionCountPlanned} savol</span>}
                                        </p>
                                        <p className="text-xs text-white/40">
                                            {formatDate(a.endedAt || a.startedAt)} • {formatTime(a.endedAt || a.startedAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {(a.coinsEarned ?? 0) > 0 && (
                                        <span className="text-yellow-400 font-black text-sm">+{a.coinsEarned} 🪙</span>
                                    )}
                                    <span className="text-white/60 font-black text-sm"
                                        style={{ color: a.answeredCount > 0 && Math.round((a.correctCount / a.answeredCount) * 100) >= 80 ? '#10b981' : '#f59e0b' }}>
                                        {a.answeredCount > 0 ? Math.round((a.correctCount / a.answeredCount) * 100) : 0}%
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-white/20" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {history && history.totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-2">
                        <button disabled={histPage <= 1} onClick={() => setHistPage(p => p - 1)}
                            className="px-4 py-2 rounded-xl text-sm font-black disabled:opacity-30 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                            ← Oldingi
                        </button>
                        <span className="px-4 py-2 text-white/50 text-sm font-bold">{histPage} / {history.totalPages}</span>
                        <button disabled={histPage >= history.totalPages} onClick={() => setHistPage(p => p + 1)}
                            className="px-4 py-2 rounded-xl text-sm font-black disabled:opacity-30 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                            Keyingi →
                        </button>
                    </div>
                )}
            </div>

            {/* Wallet Transactions */}
            {wallet && wallet.transactions.length > 0 && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="text-base font-black text-white/70 uppercase tracking-widest">MT Coin Tarixi</h2>
                    <div className="space-y-2">
                        {wallet.transactions.map(t => (
                            <div key={t._id} className="flex items-center justify-between p-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{t.amount > 0 ? '🟢' : '🔴'}</span>
                                    <div>
                                        <p className="text-sm font-black text-white">{txTypeLabel[t.type] || t.type}</p>
                                        <p className="text-xs text-white/30">{formatDate(t.createdAt)}</p>
                                    </div>
                                </div>
                                <span className={`font-black text-base ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {t.amount > 0 ? '+' : ''}{t.amount} 🪙
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attempt Detail Modal */}
            {selectedAttempt && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setSelectedAttempt(null)}>
                    <div className="w-full max-w-md rounded-3xl p-6 space-y-4 animate-fade-in"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.12)' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white">Quiz Natijalari</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "To'g'ri", value: selectedAttempt.correctCount, color: '#10b981' },
                                { label: 'Javoblangan', value: selectedAttempt.answeredCount, color: '#6366f1' },
                                { label: 'Aniqlik', value: `${selectedAttempt.answeredCount > 0 ? Math.round((selectedAttempt.correctCount / selectedAttempt.answeredCount) * 100) : 0}%`, color: '#06b6d4' },
                                { label: 'MT Coin', value: `+${selectedAttempt.coinsEarned ?? 0} 🪙`, color: '#eab308' },
                            ].map(item => (
                                <div key={item.label} className="p-4 rounded-2xl" style={{ background: `${item.color}12`, border: `1px solid ${item.color}25` }}>
                                    <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: `${item.color}80` }}>{item.label}</p>
                                    <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/30">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(selectedAttempt.startedAt)} • {formatTime(selectedAttempt.startedAt)}</span>
                        </div>
                        <button onClick={() => setSelectedAttempt(null)}
                            className="w-full py-3 rounded-2xl font-black text-white text-sm transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Yopish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
