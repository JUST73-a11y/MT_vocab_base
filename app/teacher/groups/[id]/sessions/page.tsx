'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Play, Square, ChevronDown, ChevronUp, Medal, Users, Clock, Target, RefreshCw } from 'lucide-react';

interface Session {
    _id: string;
    status: 'ACTIVE' | 'ENDED';
    questionCount: number;
    timeLimitSec: number;
    createdAt: string;
    endsAt?: string;
    unitIds: string[];
}

interface ResultEntry {
    rank: number;
    studentId: string;
    studentName: string;
    correctCount: number;
    answeredCount: number;
    accuracy: number;
}

interface SessionResults {
    sessionId: string;
    results: ResultEntry[];
    podium: ResultEntry[];
}

const RANK_COLORS = [
    { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)', text: '#eab308', label: '🥇' },
    { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', text: '#9ca3af', label: '🥈' },
    { bg: 'rgba(180,116,76,0.15)', border: 'rgba(180,116,76,0.3)', text: '#b47b4c', label: '🥉' },
];

function PodiumCard({ entry, position }: { entry: ResultEntry; position: number }) {
    const style = RANK_COLORS[position] || RANK_COLORS[2];
    const heights = ['h-28', 'h-20', 'h-16'];
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl"
                style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                {style.label}
            </div>
            <p className="text-xs font-black text-white text-center max-w-[80px] truncate">{entry.studentName}</p>
            <p className="text-xs font-black" style={{ color: style.text }}>{entry.correctCount} ✓</p>
            <div className={`w-20 ${heights[position]} rounded-t-2xl flex items-end justify-center pb-2`}
                style={{ background: style.bg, border: `1px solid ${style.border}`, borderBottom: 'none' }}>
                <span className="text-2xl font-black" style={{ color: style.text }}>#{position + 1}</span>
            </div>
        </div>
    );
}

export default function GroupSessionsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [groupId, setGroupId] = useState<string>('');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [results, setResults] = useState<Record<string, SessionResults>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [ending, setEnding] = useState(false);

    useEffect(() => {
        params.then(p => {
            setGroupId(p.id);
            fetchAll(p.id);
        });
    }, []);

    async function fetchAll(gid: string) {
        setLoading(true);
        try {
            const [sessRes, activeRes] = await Promise.all([
                fetch(`/api/teacher/groups/${gid}/quiz-sessions`),
                fetch(`/api/teacher/groups/${gid}/quiz-session`),
            ]);
            const [sessData, activeData] = await Promise.all([sessRes.json(), activeRes.json()]);
            setSessions(sessData.sessions || []);
            setActiveSession(activeData.session || null);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function endSession() {
        if (!groupId || ending) return;
        setEnding(true);
        try {
            await fetch(`/api/teacher/groups/${groupId}/quiz-session`, { method: 'DELETE' });
            await fetchAll(groupId);
        } finally { setEnding(false); }
    }

    async function loadResults(sessionId: string) {
        if (results[sessionId]) {
            setExpandedId(id => id === sessionId ? null : sessionId);
            return;
        }
        try {
            const res = await fetch(`/api/teacher/groups/${groupId}/quiz-session/${sessionId}/results`);
            const data = await res.json();
            setResults(prev => ({ ...prev, [sessionId]: data }));
            setExpandedId(sessionId);
        } catch (e) { console.error(e); }
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Guruh Quiz Sessiyalari</h1>
                    <p className="text-sm text-white/40 mt-1">Sessiya tarixi va natijalari</p>
                </div>
                <button onClick={() => groupId && fetchAll(groupId)}
                    className="p-3 rounded-2xl text-white/40 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Active Session Banner */}
            {activeSession && (
                <div className="rounded-3xl p-6 space-y-4 animate-fade-in"
                    style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06))', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                            <div>
                                <p className="text-xs font-black text-emerald-400/70 uppercase tracking-widest">Faol Sessiya</p>
                                <p className="text-lg font-black text-white">
                                    {activeSession.questionCount} savol • {activeSession.timeLimitSec}s/savol
                                </p>
                            </div>
                        </div>
                        <button onClick={endSession} disabled={ending}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-white text-sm transition-all disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                            <Square className="w-4 h-4" />
                            {ending ? 'Tugatilmoqda...' : "Sessiayni Tugatish"}
                        </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-white/40">
                        <span>🕐 Boshlangan: {formatDate(activeSession.createdAt)}</span>
                        <span>• {activeSession.unitIds?.length || 0} unit</span>
                    </div>
                </div>
            )}

            {/* Sessions List */}
            {loading ? (
                <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>
            ) : sessions.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/40 font-black">Hali hech qanday sessiya bo&apos;lmagan</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <div key={session._id} className="glass-card overflow-hidden">
                            <button
                                onClick={() => session.status === 'ENDED' && loadResults(session._id)}
                                className="w-full p-5 flex items-center justify-between text-left transition-all hover:bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                        style={{ background: session.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', border: `1px solid ${session.status === 'ACTIVE' ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
                                        {session.status === 'ACTIVE' ? <Play className="w-5 h-5 text-emerald-400" /> : <Trophy className="w-5 h-5 text-indigo-400" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-black text-white">{session.questionCount} savol</p>
                                            <span className="text-xs px-2 py-0.5 rounded-full font-black"
                                                style={{ background: session.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', color: session.status === 'ACTIVE' ? '#10b981' : 'rgba(255,255,255,0.4)' }}>
                                                {session.status === 'ACTIVE' ? 'Faol' : 'Tugagan'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.timeLimitSec}s/savol</span>
                                            <span className="flex items-center gap-1"><Target className="w-3 h-3" />{session.unitIds?.length || 0} unit</span>
                                            <span>{formatDate(session.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                                {session.status === 'ENDED' && (
                                    expandedId === session._id
                                        ? <ChevronUp className="w-5 h-5 text-white/40" />
                                        : <ChevronDown className="w-5 h-5 text-white/40" />
                                )}
                            </button>

                            {/* Expanded Results */}
                            {expandedId === session._id && results[session._id] && (
                                <div className="border-t border-white/5 p-5 space-y-6 animate-fade-in">
                                    {/* Podium */}
                                    {results[session._id].podium.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-4">🏆 Podium</h3>
                                            <div className="flex items-end justify-center gap-4">
                                                {/* Reorder: 2nd, 1st, 3rd */}
                                                {[1, 0, 2].map(pos => {
                                                    const entry = results[session._id].podium[pos];
                                                    if (!entry) return <div key={pos} className="w-24" />;
                                                    return <PodiumCard key={pos} entry={entry} position={pos} />;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Full Leaderboard */}
                                    {results[session._id].results.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5" /> Barcha natijalar
                                            </h3>
                                            <div className="space-y-2">
                                                {results[session._id].results.map(r => (
                                                    <div key={r.studentId} className="flex items-center gap-3 p-3 rounded-2xl"
                                                        style={{ background: r.rank <= 3 ? `${RANK_COLORS[r.rank - 1]?.bg}` : 'rgba(255,255,255,0.02)', border: `1px solid ${r.rank <= 3 ? RANK_COLORS[r.rank - 1]?.border : 'rgba(255,255,255,0.05)'}` }}>
                                                        <span className="w-8 text-center font-black text-sm"
                                                            style={{ color: r.rank <= 3 ? RANK_COLORS[r.rank - 1]?.text : 'rgba(255,255,255,0.3)' }}>
                                                            {r.rank <= 3 ? RANK_COLORS[r.rank - 1]?.label : `#${r.rank}`}
                                                        </span>
                                                        <span className="flex-1 font-black text-white text-sm">{r.studentName}</span>
                                                        <span className="text-emerald-400 font-black text-sm">{r.correctCount} ✓</span>
                                                        <span className="text-white/40 font-bold text-xs">{r.accuracy}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
