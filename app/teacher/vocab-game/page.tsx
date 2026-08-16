'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import {
    Play, Pause, CheckCircle2, XCircle, Loader2, Trophy, Users,
    BookOpen, ChevronRight, BarChart3, Send, Copy, Check,
    AlertTriangle, Star, RefreshCw, ArrowLeft, Zap, Target,
    Medal, TrendingUp, PieChart as PieIcon, Download, Volume2, Eye, EyeOff, Square
} from 'lucide-react';

// ─── Sound Effects (Web Audio API) ────────────────────────────────────────────
const playSuccessSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch {}
};

const playWrongSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch {}
};

// ─── Compact Circular Timer (Top-Center) ───────────────────────────────────
function CircularTimer({
    timeLeft,
    total,
    isPaused,
    onTogglePause
}: {
    timeLeft: number;
    total: number;
    isPaused: boolean;
    onTogglePause: () => void;
}) {
    const R = 64, C = 2 * Math.PI * R;
    const progress = total > 0 ? timeLeft / total : 0;
    const color = isPaused
        ? '#f59e0b'
        : progress > 0.5
        ? '#6366f1'
        : progress > 0.25
        ? '#f59e0b'
        : '#ef4444';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative flex items-center justify-center mx-auto drop-shadow-[0_0_25px_rgba(99,102,241,0.4)]" style={{ width: 150, height: 150 }}>
                <svg className="absolute inset-0 -rotate-90" style={{ width: '100%', height: '100%' }} viewBox="0 0 150 150">
                    <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="75" cy="75" r={R} fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={`${C * progress} ${C}`} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }} />
                </svg>
                <div className="text-center z-10 flex flex-col items-center justify-center">
                    <div className="text-5xl font-black tabular-nums text-white tracking-tight leading-none drop-shadow-md">
                        {timeLeft}
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-[0.2em] text-white/50 mt-1">
                        {isPaused ? 'PAUZADA' : 'SECONDS'}
                    </div>
                </div>
            </div>

            {/* Time Stop / Resume Button */}
            <button
                type="button"
                onClick={onTogglePause}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black transition-all active:scale-95 border shadow-md ${
                    isPaused
                        ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/40 animate-pulse'
                        : 'bg-white/10 text-white/90 hover:text-white hover:bg-white/20 border-white/20'
                }`}
            >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                <span>{isPaused ? 'Davom ettirish' : 'Vaqtni to\'xtatish'}</span>
            </button>
        </div>
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Group { _id: string; id?: string; name: string; vocabularyMode?: boolean; memberCount?: number; }
interface Unit { id: string; title: string; category?: string; }
interface Word { _id: string; englishWord: string; uzbekTranslation: string; phonetic?: string; }
interface Student { _id: string; name: string; email: string; warningCard?: boolean; }
interface GameResult {
    studentId: { _id: string; name: string; warningCard?: boolean };
    correctCount: number; wrongCount: number; accuracy: number; rank: number; warningCard: boolean; questionsAsked: number;
    totalTimeMs?: number; performanceScore?: number;
}
interface SummaryStats {
    totalStudents: number; avgScore: number; avgAccuracy: number;
    highestScore: number; lowestScore: number; passCount: number; failCount: number; warningCardCount: number;
}

// ─── Phases ──────────────────────────────────────────────────────────────────
type Phase = 'setup' | 'game' | 'ceremony' | 'summary' | 'history';

// ─── Confetti Effect ─────────────────────────────────────────────────────────
function Confetti({ trigger }: { trigger: boolean }) {
    if (!trigger) return null;
    const emojis = ['🎉', '✨', '🎊', '⭐', '🔥', '❤️', '👏', '🥳', '🌟', '💫'];
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 18 }).map((_, i) => (
                <div
                    key={i}
                    className="absolute text-2xl animate-bounce"
                    style={{
                        left: `${Math.random() * 90 + 5}%`,
                        top: `${Math.random() * 60 + 10}%`,
                        animationDelay: `${Math.random() * 0.5}s`,
                        animationDuration: `${0.5 + Math.random() * 0.5}s`,
                        opacity: 0,
                        animation: `confetti-float ${0.8 + Math.random() * 0.6}s ease-out ${Math.random() * 0.3}s forwards`,
                    }}
                >
                    {emojis[Math.floor(Math.random() * emojis.length)]}
                </div>
            ))}
            <style>{`
                @keyframes confetti-float {
                    0% { opacity: 0; transform: translateY(0) scale(0.5); }
                    30% { opacity: 1; transform: translateY(-30px) scale(1.2); }
                    100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
                }
            `}</style>
        </div>
    );
}

// ─── Wrong Animation ─────────────────────────────────────────────────────────
function WrongAnim({ trigger }: { trigger: boolean }) {
    if (!trigger) return null;
    const emojis = ['😔', '😢', '🙁', '💔', '😞', '😟', '❌'];
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
            <div className="text-6xl animate-bounce" style={{ animation: 'wrong-shake 0.6s ease-out forwards' }}>
                {emojis[Math.floor(Math.random() * emojis.length)]}
            </div>
            <style>{`
                @keyframes wrong-shake {
                    0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
                    30% { opacity: 1; transform: scale(1.3) rotate(5deg); }
                    60% { transform: scale(1) rotate(-3deg); }
                    100% { opacity: 0; transform: scale(0.8) rotate(0deg); }
                }
            `}</style>
        </div>
    );
}

// ─── Simple Bar Chart ─────────────────────────────────────────────────────────
function SimpleBarChart({ data }: { data: { name: string; correct: number; wrong: number }[] }) {
    const max = Math.max(...data.map(d => d.correct + d.wrong), 1);
    return (
        <div className="space-y-3">
            {data.map((d, i) => {
                const correctPct = (d.correct / max) * 100;
                const wrongPct = (d.wrong / max) * 100;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                    <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-white/80 truncate max-w-[140px]">{medals[i] || `${i + 1}.`} {d.name}</span>
                            <span className="text-white/50">{d.correct} ✅ / {d.wrong} ❌</span>
                        </div>
                        <div className="flex h-5 rounded-lg overflow-hidden gap-0.5">
                            {d.correct > 0 && (
                                <div
                                    className="bg-emerald-500/80 rounded-l-lg transition-all duration-700"
                                    style={{ width: `${correctPct}%` }}
                                />
                            )}
                            {d.wrong > 0 && (
                                <div
                                    className="bg-red-500/60 rounded-r-lg transition-all duration-700"
                                    style={{ width: `${wrongPct}%` }}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Simple Pie Chart ─────────────────────────────────────────────────────────
function SimplePieChart({ pass, fail }: { pass: number; fail: number }) {
    const total = pass + fail;
    if (total === 0) return null;
    const passPct = Math.round((pass / total) * 100);
    const radius = 45;
    const circ = 2 * Math.PI * radius;
    const passStroke = (pass / total) * circ;
    return (
        <div className="flex flex-col items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="10" />
                <circle
                    cx="50" cy="50" r={radius} fill="none"
                    stroke="#10b981" strokeWidth="10"
                    strokeDasharray={`${passStroke} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                />
            </svg>
            <div className="flex items-center gap-6 text-sm font-bold">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-white/70">O'tdi: {pass} ({passPct}%)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500/60" /><span className="text-white/70">O'tmadi: {fail}</span></div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VocabGamePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [phase, setPhase] = useState<Phase>('setup');

    // Setup
    const [groups, setGroups] = useState<Group[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [viewingUnits, setViewingUnits] = useState(false);
    const [questionsPerStudent, setQuestionsPerStudent] = useState(6);
    const [timerDuration, setTimerDuration] = useState<number>(10); // 5, 10, 15, 20, 25
    const [noSave, setNoSave] = useState(false); // No-Save Mode
    const [loadingSetup, setLoadingSetup] = useState(true);
    const [starting, setStarting] = useState(false);

    // Absent Students Feature
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [absentStudentIds, setAbsentStudentIds] = useState<string[]>([]);

    // Live Practice Timer & Translation Visibility
    const [timeLeft, setTimeLeft] = useState(10);
    const [timerActive, setTimerActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);

    // Auto-speech (Text to Speech)
    const handleSpeak = useCallback((text?: string) => {
        if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        setTimeout(() => {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-GB';
            u.rate = 1.0;
            const availableVoices = window.speechSynthesis.getVoices();
            const v = availableVoices.find(voice => voice.lang.startsWith('en')) || availableVoices[0];
            if (v) u.voice = v;
            window.speechSynthesis.speak(u);
        }, 60);
    }, []);

    // Category Map logic
    const categoryMap = units.reduce((acc, unit) => {
        const cat = unit.category || 'Kategoriyasiz';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(unit);
        return acc;
    }, {} as Record<string, Unit[]>);

    const categories = Object.keys(categoryMap).sort((a, b) =>
        a === 'Kategoriyasiz' ? 1 : b === 'Kategoriyasiz' ? -1 : a.localeCompare(b));
    const displayedUnits = activeCategory ? (categoryMap[activeCategory] || []) : units;

    const toggleUnitSelection = (unitId: string) => {
        setSelectedUnitIds(prev =>
            prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
        );
    };

    // Game state
    const [sessionId, setSessionId] = useState('');
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [currentWords, setCurrentWords] = useState<Word[]>([]);
    const [currentWordIdx, setCurrentWordIdx] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [showStopModal, setShowStopModal] = useState(false);
    
    // Performance Tracking
    const [studentTotalTimeMs, setStudentTotalTimeMs] = useState(0);
    const [wordStartTime, setWordStartTime] = useState<number>(0);

    // Animations
    const [showCorrect, setShowCorrect] = useState(false);
    const [showWrong, setShowWrong] = useState(false);

    // Summary
    const [summary, setSummary] = useState<any>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [copied, setCopied] = useState(false);

    // History
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) loadSetup();
    }, [user]);

    // Timer countdown effect
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (phase === 'game' && timerActive && !isPaused && timeLeft > 0 && !showTranslation) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setTimerActive(false);
                        setShowTranslation(true); // reveal translation automatically when timer reaches 0
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [phase, timerActive, isPaused, timeLeft, showTranslation]);

    // Ceremony auto-skip
    useEffect(() => {
        let t: NodeJS.Timeout;
        if (phase === 'ceremony' && summary) {
            t = setTimeout(() => {
                setPhase('summary');
            }, 8000); // 8 seconds
        }
        return () => clearTimeout(t);
    }, [phase, summary]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (phase !== 'game' || showStopModal || submitting) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (answeredChoice === null) handleAnswer(true);
                else handleNextWord();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (answeredChoice === null) handleAnswer(false);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (answeredChoice === null && !isPaused) {
                    setIsPaused(true);
                    setTimerActive(false);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (answeredChoice === null && isPaused) {
                    setIsPaused(false);
                    setTimerActive(true);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }); // Run on every render to ensure latest state is captured inside handleKeyDown without stale closures

    const [answeredChoice, setAnsweredChoice] = useState<'correct' | 'wrong' | null>(null);

    // Auto speak and reset states when word appears in game mode
    useEffect(() => {
        if (phase === 'game' && currentWords[currentWordIdx]?.englishWord) {
            const wordText = currentWords[currentWordIdx].englishWord;
            setShowTranslation(false);
            setAnsweredChoice(null);
            setTimeLeft(timerDuration);
            setTimerActive(true);
            setIsPaused(false);
            setWordStartTime(Date.now());
            const t = setTimeout(() => handleSpeak(wordText), 300);
            return () => clearTimeout(t);
        }
    }, [phase, currentStudentIndex, currentWordIdx, currentWords, timerDuration, handleSpeak]);

    const loadSetup = async () => {
        setLoadingSetup(true);
        try {
            const [gRes, uRes, treeRes] = await Promise.all([
                apiFetch('/api/teacher/groups'),
                apiFetch(`/api/units?teacherId=${user?.id}`),
                apiFetch('/api/teacher/categories/tree').catch(() => null)
            ]);

            let loadedUnits: Unit[] = uRes?.units || uRes || [];

            if (treeRes && Array.isArray(treeRes)) {
                const catIdToPathName: Record<string, string> = {};
                const flatten = (nodes: any[], depthStr: string) => {
                    nodes.forEach(n => {
                        catIdToPathName[n._id] = depthStr + n.name;
                        if (n.children && n.children.length > 0) {
                            flatten(n.children, depthStr + n.name + ' / ');
                        }
                    });
                };
                flatten(treeRes, '');
                loadedUnits = loadedUnits.map((u: any) => ({
                    ...u,
                    category: (u.categoryId && catIdToPathName[u.categoryId]) ? catIdToPathName[u.categoryId] : (u.category || 'Kategoriyasiz')
                }));
            }

            const vocabGroups = (gRes || []).filter((g: Group) => g.vocabularyMode !== false);
            setGroups(vocabGroups);
            setUnits(loadedUnits);
        } catch {
            toast.error('Ma\'lumotlarni yuklashda xatolik');
        } finally {
            setLoadingSetup(false);
        }
    };

    useEffect(() => {
        if (!selectedGroup) {
            setGroupMembers([]);
            setAbsentStudentIds([]);
            return;
        }
        apiFetch(`/api/teacher/groups/${selectedGroup}/members`)
            .then(data => {
                setGroupMembers(data || []);
                setAbsentStudentIds([]);
            })
            .catch(() => {});
    }, [selectedGroup]);

    const handleStartSession = async () => {
        if (!selectedGroup || selectedUnitIds.length === 0) {
            toast.error('Guruh va kamida bitta unit tanlang');
            return;
        }
        setStarting(true);
        try {
            const data = await apiFetch('/api/teacher/vocab-game/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: selectedGroup,
                    unitIds: selectedUnitIds,
                    questionsPerStudent,
                    timerDuration,
                    noSave,
                    absentStudentIds,
                }),
            });
            setSessionId(data.session._id);
            setCurrentStudent(data.currentStudent);
            setCurrentWords(data.words || []);
            setCurrentWordIdx(0);
            setCorrectCount(0);
            setWrongCount(0);
            setStudentTotalTimeMs(0);
            setTotalStudents(data.session.totalStudents);
            setCurrentStudentIndex(0);
            setTimeLeft(timerDuration);
            setTimerActive(true);
            setIsPaused(false);
            setShowTranslation(false);
            setAnsweredChoice(null);
            setPhase('game');
        } catch (err: any) {
            toast.error(err.message || 'Sessiyani boshlashda xatolik');
        } finally {
            setStarting(false);
        }
    };

    const handleAnswer = (isCorrect: boolean) => {
        if (answeredChoice !== null) return;

        const choice = isCorrect ? 'correct' : 'wrong';
        setAnsweredChoice(choice);
        setShowTranslation(true);
        setTimerActive(false);
        setIsPaused(false);

        const timeTaken = Date.now() - wordStartTime;
        setStudentTotalTimeMs(prev => prev + timeTaken);

        if (isCorrect) {
            setShowCorrect(true);
            setCorrectCount(c => c + 1);
            playSuccessSound();
            setTimeout(() => setShowCorrect(false), 1200);
        } else {
            setShowWrong(true);
            setWrongCount(w => w + 1);
            playWrongSound();
            setTimeout(() => setShowWrong(false), 1200);
        }
        // Word stays on current word. Pressed button transforms into "Keyingi so'z"
    };

    const handleNextWord = () => {
        const next = currentWordIdx + 1;
        if (next >= questionsPerStudent || next >= currentWords.length) {
            finishCurrentStudent(correctCount, wrongCount);
        } else {
            setCurrentWordIdx(next);
            setAnsweredChoice(null);
            setShowTranslation(false);
            setTimeLeft(timerDuration);
            setTimerActive(true);
            setIsPaused(false);
        }
    };

    const finishCurrentStudent = async (finalCorrect: number, finalWrong: number) => {
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/teacher/vocab-game/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    studentId: currentStudent?._id,
                    correctCount: finalCorrect,
                    wrongCount: finalWrong,
                    wordIds: currentWords.map(w => w._id),
                    totalTimeMs: studentTotalTimeMs
                }),
            });

            if (res.isFinished) {
                loadSummary(sessionId);
                setPhase('ceremony');
            } else {
                setCurrentStudent(res.nextStudent);
                setCurrentWords(res.nextWords || []);
                setCurrentWordIdx(0);
                setCorrectCount(0);
                setWrongCount(0);
                setStudentTotalTimeMs(0); // Reset for next student
                setCurrentStudentIndex(res.session.currentStudentIndex);
                setTimeLeft(timerDuration);
                setTimerActive(true);
                setIsPaused(false);
                setShowTranslation(false);
                setAnsweredChoice(null);
            }
        } catch (err: any) {
            toast.error(err.message || 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    const loadSummary = async (sid: string) => {
        setLoadingSummary(true);
        try {
            const data = await apiFetch(`/api/teacher/vocab-game/summary/${sid}`);
            setSummary(data);
        } catch {
            toast.error('Xulosa yuklanmadi');
        } finally {
            setLoadingSummary(false);
        }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await apiFetch('/api/teacher/vocab-game/session');
            setHistory(data || []);
        } catch {
            toast.error('Tarix yuklanmadi');
        } finally {
            setLoadingHistory(false);
        }
    };

    const copyTelegram = () => {
        if (!summary?.telegramMessage) return;
        navigator.clipboard.writeText(summary.telegramMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Telegram xabari nusxalandi!');
    };

    const currentWord = currentWords[currentWordIdx];
    const progressPct = totalStudents > 0 ? Math.round((currentStudentIndex / totalStudents) * 100) : 0;

    if (loading || !user) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    // ── SETUP PHASE ────────────────────────────────────────────────────────────
    if (phase === 'setup') {
        return (
            <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4 sm:p-6">
                <div className="max-w-2xl w-full mx-auto space-y-6 animate-fade-in my-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                <span className="text-4xl">🎯</span> Lug'at O'yini
                            </h1>
                            <p className="text-white/40 text-sm font-bold mt-1">O'qituvchi boshqaradigan live lug'at sessiyasi</p>
                        </div>
                        <button
                            onClick={() => { setPhase('history'); loadHistory(); }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white/60 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <BarChart3 className="w-4 h-4" /> Tarix
                        </button>
                    </div>

                    {/* Setup Card */}
                    <div className="glass-card p-8 space-y-6">
                        <h2 className="text-lg font-black text-white">Sessiyani sozlash</h2>

                        {/* Group Select */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Guruh</label>
                            {loadingSetup ? (
                                <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
                            ) : (
                                <select
                                    value={selectedGroup}
                                    onChange={e => setSelectedGroup(e.target.value)}
                                    className="w-full h-12 rounded-xl px-4 bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                                >
                                    <option value="" className="bg-gray-900">— Guruh tanlang —</option>
                                    {groups.map(g => (
                                        <option key={g._id || g.id} value={g._id || g.id} className="bg-gray-900">
                                            {g.name} {g.memberCount ? `(${g.memberCount} ta)` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {!loadingSetup && groups.length === 0 && (
                                <p className="text-xs text-amber-400/70 mt-1">⚠️ Lug'at rejimi yoqilgan guruhlar topilmadi. Guruhlar bo'limidan lug'at rejimini yoqing.</p>
                            )}
                        </div>

                        {/* Absent Students Selection */}
                        {selectedGroup && groupMembers.length > 0 && (
                            <div className="glass-card p-5 sm:p-6 flex flex-col gap-3 rounded-2xl bg-white/[0.02] border border-white/10">
                                <h2 className="text-sm font-black text-white uppercase tracking-[0.1em] flex items-center gap-2">
                                    <Users className="w-4 h-4 text-emerald-400" />
                                    O'quvchilar Davomati
                                </h2>
                                <p className="text-[10px] sm:text-xs text-white/50 font-bold uppercase tracking-widest">
                                    Kelmagan o'quvchilarni belgilang (ulardan so'ralmaydi)
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                                    {groupMembers.map(m => {
                                        const isAbsent = absentStudentIds.includes(m.id);
                                        return (
                                            <label
                                                key={m.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.98] select-none ${
                                                    isAbsent 
                                                    ? 'bg-red-500/10 border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.1)]' 
                                                    : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isAbsent}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAbsentStudentIds(prev => [...prev, m.id]);
                                                        } else {
                                                            setAbsentStudentIds(prev => prev.filter(id => id !== m.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded text-red-500 bg-white/10 border-white/20 focus:ring-red-500 focus:ring-offset-gray-900 cursor-pointer"
                                                />
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-black ${isAbsent ? 'text-red-400 line-through opacity-70' : 'text-emerald-400'}`}>
                                                        {m.name}
                                                    </span>
                                                    <span className={`text-[9px] uppercase tracking-widest font-bold ${isAbsent ? 'text-red-400/50' : 'text-emerald-400/50'}`}>
                                                        {isAbsent ? 'Kelmagan' : 'Kelgan'}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Unit Select (Checkbox Mode) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black uppercase tracking-widest text-white/50">
                                    Lug'at Bo'limlari ({selectedUnitIds.length} ta tanlandi)
                                </label>
                                {viewingUnits && (
                                    <button
                                        type="button"
                                        onClick={() => { setViewingUnits(false); setActiveCategory(null); }}
                                        className="text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" /> Kategoriyalarga qaytish
                                    </button>
                                )}
                            </div>

                            {loadingSetup ? (
                                <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
                            ) : (
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar">
                                    {!viewingUnits ? (
                                        <>
                                            {/* Categories list */}
                                            {categories.filter(cat => cat !== 'Kategoriyasiz' && cat !== 'Uncategorized').map(cat => {
                                                const unitsInCat = categoryMap[cat] || [];
                                                const selectedInCat = unitsInCat.filter(u => selectedUnitIds.includes(u.id)).length;
                                                return (
                                                    <button
                                                        key={cat}
                                                        type="button"
                                                        onClick={() => { setActiveCategory(cat); setViewingUnits(true); }}
                                                        className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-white/[0.03] hover:bg-white/10 border border-white/10 text-left group active:scale-[0.98]"
                                                    >
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/25 transition-all">
                                                                <BookOpen className="w-5 h-5 text-indigo-400" />
                                                            </div>
                                                            <div>
                                                                <span className="font-extrabold text-base text-white block leading-tight">{cat}</span>
                                                                <span className="text-xs text-white/40 font-bold">{unitsInCat.length} bo'lim</span>
                                                            </div>
                                                        </div>
                                                        {selectedInCat > 0 ? (
                                                            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black shadow-sm">
                                                                {selectedInCat} tanlandi
                                                            </span>
                                                        ) : (
                                                            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            {/* Root / Uncategorized units section */}
                                            {(() => {
                                                const rootUnits = units.filter(u => !u.category || u.category === 'Kategoriyasiz' || u.category === 'Uncategorized');
                                                if (rootUnits.length === 0) return null;
                                                return (
                                                    <div className="space-y-2 pt-2">
                                                        {categories.length > 1 && (
                                                            <div className="text-xs font-black uppercase tracking-widest text-white/40 pt-1 pb-1">
                                                                Kategoriyasiz bo'limlar
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const ids = rootUnits.map(u => u.id);
                                                                    setSelectedUnitIds(p => Array.from(new Set([...p, ...ids])));
                                                                }}
                                                                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all"
                                                            >
                                                                ✓ Hammasini tanlash
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const ids = rootUnits.map(u => u.id);
                                                                    setSelectedUnitIds(p => p.filter(id => !ids.includes(id)));
                                                                }}
                                                                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 active:scale-95 transition-all"
                                                            >
                                                                ✕ Bekor qilish
                                                            </button>
                                                        </div>
                                                        {rootUnits.map(unit => {
                                                            const sel = selectedUnitIds.includes(unit.id);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={unit.id}
                                                                    onClick={() => toggleUnitSelection(unit.id)}
                                                                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                                        sel ? 'bg-indigo-500/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                                                                    }`}
                                                                >
                                                                    <span className="text-sm font-extrabold text-left">{unit.title}</span>
                                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                                                        sel ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40' : 'bg-white/10 border border-white/20'
                                                                    }`}>
                                                                        {sel && <Check className="w-4 h-4 stroke-[3]" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setViewingUnits(false); setActiveCategory(null); }}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs sm:text-sm font-black transition-all active:scale-95 shadow-sm"
                                                    >
                                                        <ArrowLeft className="w-4 h-4" />
                                                        <span>Orqaga</span>
                                                    </button>
                                                    <span className="text-sm font-black text-white truncate max-w-[140px]">{activeCategory}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ids = displayedUnits.map(u => u.id);
                                                            setSelectedUnitIds(p => Array.from(new Set([...p, ...ids])));
                                                        }}
                                                        className="py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all shadow-sm"
                                                    >
                                                        ✓ Hammasi
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ids = displayedUnits.map(u => u.id);
                                                            setSelectedUnitIds(p => p.filter(id => !ids.includes(id)));
                                                        }}
                                                        className="py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 active:scale-95 transition-all shadow-sm"
                                                    >
                                                        ✕ Bekor
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {displayedUnits.map(unit => {
                                                    const sel = selectedUnitIds.includes(unit.id);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={unit.id}
                                                            onClick={() => toggleUnitSelection(unit.id)}
                                                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                                sel ? 'bg-indigo-500/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <span className="text-sm font-extrabold text-left">{unit.title}</span>
                                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                                                sel ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40' : 'bg-white/10 border border-white/20'
                                                            }`}>
                                                                {sel && <Check className="w-4 h-4 stroke-[3]" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Questions per Student */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-white/50">
                                Har bir o'quvchiga savol soni: <span className="text-indigo-400 text-base ml-1 font-black">{questionsPerStudent}</span>
                            </label>
                            <div className="flex items-center gap-3">
                                {[3, 5, 6, 8, 10, 12].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setQuestionsPerStudent(n)}
                                        className={`flex-1 py-3.5 rounded-xl text-sm sm:text-base font-black transition-all active:scale-95 ${
                                            questionsPerStudent === n
                                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]'
                                                : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timer per Word */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-widest text-white/50">
                                Har bir so'z uchun vaqt: <span className="text-indigo-400 text-base ml-1 font-black">{timerDuration} sek</span>
                            </label>
                            <div className="flex items-center gap-2 sm:gap-3">
                                {[5, 10, 15, 20, 25].map(sec => (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => setTimerDuration(sec)}
                                        className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                                            timerDuration === sec
                                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-[1.02]'
                                                : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {sec}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* No-Save Mode Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${noSave ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-white/30'}`}>
                                    🚫
                                </div>
                                <div>
                                    <p className="text-sm font-black text-white">Tarix saqlanmasin (No-Save Rejimi)</p>
                                    <p className="text-[11px] text-white/40 font-bold">Natijalar saqlanmaydi va reyting o'zgarmaydi</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNoSave(prev => !prev)}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${noSave ? 'bg-amber-500' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${noSave ? 'left-6' : 'left-0.5'}`} />
                            </button>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStartSession}
                            disabled={starting || !selectedGroup || selectedUnitIds.length === 0}
                            className="w-full font-black text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                            style={{
                                height: '42px',
                                margin: '6px 0px 0px 0px',
                                borderRadius: 'var(--theme-radius-btn, 12px)',
                                background: 'var(--theme-primary, linear-gradient(135deg, #6366f1, #4f46e5))',
                                boxShadow: 'var(--theme-shadow-btn, 0 4px 20px rgba(99,102,241,0.4))',
                                fontFamily: 'var(--theme-font-family, inherit)',
                            }}
                        >
                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                            {starting ? 'Boshlanmoqda...' : 'Sessiyani Boshlash'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── GAME PHASE ─────────────────────────────────────────────────────────────
    if (phase === 'game') {
        const accuracy = (correctCount + wrongCount) > 0
            ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
            : 0;

        return (
            <div className="min-h-[calc(100vh-80px)] py-6 px-4 flex flex-col justify-center items-center">
                <Confetti trigger={showCorrect} />
                <WrongAnim trigger={showWrong} />

                <div className="w-full max-w-5xl mx-auto space-y-4 my-auto flex flex-col justify-center animate-fade-in">
                    {/* Top Bar Navigation: Orqaga (Sessiyani yakunlash) */}
                    <div className="flex items-center justify-between px-2">
                        <button
                            type="button"
                            onClick={() => { setIsPaused(true); setShowStopModal(true); }}
                            className="inline-flex items-center justify-center px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-black transition-all active:scale-95 border border-white/15 shadow-md hover:border-white/30"
                            style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5 shrink-0" />
                            <span>Orqaga (Sessiyani yakunlash)</span>
                        </button>
                    </div>

                    {/* Top Main Glass Card */}
                    <div className="glass-card p-6 sm:p-10 relative overflow-hidden border border-white/15 rounded-3xl shadow-2xl backdrop-blur-2xl">
                        {/* Top Section: Student Info (Left) & Live Score (Right) */}
                        <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/10">
                            {/* Student Information (Top-Left) */}
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-lg shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 8px 25px rgba(99,102,241,0.4)' }}
                                >
                                    {currentStudent?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">{currentStudent?.name || "O'quvchi"}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wider">
                                            O'quvchi
                                        </span>
                                        {currentStudent?.warningCard && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Ogohlantirish bor
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Live Score Panel (Top-Right) */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-md">
                                    <span className="text-lg sm:text-2xl font-black">✔</span>
                                    <div className="text-left">
                                        <div className="text-lg sm:text-2xl font-black leading-none">{correctCount}</div>
                                        <div className="text-[9px] uppercase font-black text-emerald-400/70 tracking-wider">To'g'ri</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 shadow-md">
                                    <span className="text-lg sm:text-2xl font-black">✖</span>
                                    <div className="text-left">
                                        <div className="text-lg sm:text-2xl font-black leading-none">{wrongCount}</div>
                                        <div className="text-[9px] uppercase font-black text-red-400/70 tracking-wider">Noto'g'ri</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center Content: Timer at Top Center, Vocabulary Word at Visual Center */}
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-8">
                            {/* Huge 2.5x Timer at Top-Center */}
                            <CircularTimer
                                timeLeft={timeLeft}
                                total={timerDuration}
                                isPaused={isPaused}
                                onTogglePause={() => setIsPaused(p => !p)}
                            />

                            {/* Vocabulary Word Display */}
                            {currentWord && (
                                <div className="space-y-4 w-full max-w-4xl mx-auto flex flex-col items-center justify-center overflow-hidden px-2">
                                    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap max-w-full">
                                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight drop-shadow-[0_10px_40px_rgba(255,255,255,0.2)] break-words text-center leading-tight">
                                            {currentWord.englishWord}
                                        </h1>
                                        <button
                                            type="button"
                                            onClick={() => handleSpeak(currentWord.englishWord)}
                                            className="p-3 sm:p-4 rounded-2xl bg-white/10 hover:bg-white/20 text-indigo-300 transition-all active:scale-95 shadow-xl hover:shadow-indigo-500/20 hover:text-white shrink-0"
                                            title="Qayta o'qish"
                                        >
                                            <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
                                        </button>
                                    </div>

                                    {currentWord.phonetic && (
                                        <p className="text-xl sm:text-2xl text-indigo-300/80 font-semibold tracking-wide">
                                            {currentWord.phonetic}
                                        </p>
                                    )}

                                    {/* Uzbek Translation Box — Enlarged & Auto-flex wrap */}
                                    <div className="pt-3 w-full flex flex-col items-center justify-center">
                                        {showTranslation || timeLeft === 0 ? (
                                            <div className="animate-fade-in py-2 max-w-full">
                                                <p className="text-3xl sm:text-5xl md:text-6xl font-black text-emerald-400 tracking-wide drop-shadow-md break-words text-center leading-tight">
                                                    {currentWord.uzbekTranslation}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 py-2 flex flex-col items-center">
                                                <div className="text-3xl sm:text-5xl md:text-6xl text-indigo-300/20 font-black tracking-widest select-none blur-sm">
                                                    ••••••••••••
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowTranslation(true); setTimerActive(false); }}
                                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-black text-indigo-300 border border-white/10 transition-all active:scale-95 shadow-md"
                                                >
                                                    <Eye className="w-4 h-4" /> Javobni ko'rsatish
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons: ❌ Noto'g'ri | ⏸ Vaqtni to'xtatish | ✅ To'g'ri (Transforming in-place into Keyingi so'z) */}
                        <div className="pt-6 border-t border-white/10">
                            {submitting ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                    <span className="ml-3 text-white/70 font-black">Natija saqlanmoqda...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                    {/* 1. NOTO'G'RI (Red) OR TRANSFORMED INTO KEYINGI SO'Z */}
                                    {answeredChoice === 'wrong' ? (
                                        <button
                                            type="button"
                                            onClick={handleNextWord}
                                            className="group py-6 px-8 rounded-2xl flex items-center justify-center gap-3 font-black text-xl text-white transition-all duration-300 active:scale-95 shadow-2xl shadow-red-500/50 ring-4 ring-red-500/40 animate-pulse scale-[1.02]"
                                            style={{
                                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                border: '2px solid rgba(239,68,68,0.8)',
                                            }}
                                        >
                                            <span className="text-2xl">➡</span>
                                            <span>Keyingi so'z</span>
                                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleAnswer(false)}
                                            disabled={answeredChoice !== null}
                                            className={`group py-6 px-8 rounded-2xl flex items-center justify-center gap-3 font-black text-xl transition-all duration-200 active:scale-95 ${
                                                answeredChoice !== null
                                                    ? 'opacity-30 cursor-not-allowed border-red-500/20 text-red-400/40 bg-red-500/5'
                                                    : 'hover:-translate-y-1 shadow-2xl hover:shadow-red-500/30 hover:brightness-110'
                                            }`}
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(239,68,68,0.35), rgba(239,68,68,0.12))',
                                                border: '2px solid rgba(239,68,68,0.6)',
                                                color: '#fca5a5',
                                            }}
                                        >
                                            <XCircle className="w-8 h-8 text-red-400 group-hover:scale-110 transition-transform" />
                                            <span>Noto'g'ri</span>
                                        </button>
                                    )}

                                    {/* 2. VAQTNI TO'XTATISH (Pause / Resume Button) */}
                                    <button
                                        type="button"
                                        onClick={() => setIsPaused(p => !p)}
                                        disabled={answeredChoice !== null}
                                        className={`group py-6 px-8 rounded-2xl flex items-center justify-center gap-3 font-black text-xl transition-all duration-200 active:scale-95 ${
                                            answeredChoice !== null
                                                ? 'opacity-30 cursor-not-allowed border-amber-500/20 text-amber-400/40 bg-amber-500/5'
                                                : isPaused
                                                ? 'bg-amber-500 text-white border-amber-400 shadow-2xl shadow-amber-500/50 animate-pulse'
                                                : 'hover:-translate-y-1 shadow-2xl hover:shadow-amber-500/30 hover:brightness-110'
                                        }`}
                                        style={{
                                            background: isPaused
                                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                                : 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(245,158,11,0.12))',
                                            border: '2px solid rgba(245,158,11,0.6)',
                                            color: isPaused ? '#ffffff' : '#fcd34d',
                                        }}
                                    >
                                        {isPaused ? <Play className="w-8 h-8 fill-current text-white" /> : <Pause className="w-8 h-8 fill-current text-amber-400" />}
                                        <span>{isPaused ? 'Davom ettirish' : 'Vaqtni to\'xtatish'}</span>
                                    </button>

                                    {/* 3. TO'G'RI (Green) OR TRANSFORMED INTO KEYINGI SO'Z */}
                                    {answeredChoice === 'correct' ? (
                                        <button
                                            type="button"
                                            onClick={handleNextWord}
                                            className="group py-6 px-8 rounded-2xl flex items-center justify-center gap-3 font-black text-xl text-white transition-all duration-300 active:scale-95 shadow-2xl shadow-emerald-500/50 ring-4 ring-emerald-500/40 animate-pulse scale-[1.02]"
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                border: '2px solid rgba(16,185,129,0.8)',
                                            }}
                                        >
                                            <span className="text-2xl">➡</span>
                                            <span>Keyingi so'z</span>
                                            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleAnswer(true)}
                                            disabled={answeredChoice !== null}
                                            className={`group py-6 px-8 rounded-2xl flex items-center justify-center gap-3 font-black text-xl transition-all duration-200 active:scale-95 ${
                                                answeredChoice !== null
                                                    ? 'opacity-30 cursor-not-allowed border-emerald-500/20 text-emerald-400/40 bg-emerald-500/5'
                                                    : 'hover:-translate-y-1 shadow-2xl hover:shadow-emerald-500/30 hover:brightness-110'
                                            }`}
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(16,185,129,0.35), rgba(16,185,129,0.12))',
                                                border: '2px solid rgba(16,185,129,0.6)',
                                                color: '#6ee7b7',
                                            }}
                                        >
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                                            <span>To'g'ri</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Status Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="glass-card p-4 text-center rounded-2xl border border-white/10">
                            <div className="text-[10px] uppercase font-black text-white/40 tracking-wider">Joriy So'z</div>
                            <div className="text-xl font-black text-white mt-1">
                                {currentWordIdx + 1} / {Math.min(questionsPerStudent, currentWords.length)}
                            </div>
                        </div>
                        <div className="glass-card p-4 text-center rounded-2xl border border-white/10">
                            <div className="text-[10px] uppercase font-black text-emerald-400/70 tracking-wider">Jami To'g'ri</div>
                            <div className="text-xl font-black text-emerald-400 mt-1">✅ {correctCount}</div>
                        </div>
                        <div className="glass-card p-4 text-center rounded-2xl border border-white/10">
                            <div className="text-[10px] uppercase font-black text-red-400/70 tracking-wider">Jami Noto'g'ri</div>
                            <div className="text-xl font-black text-red-400 mt-1">❌ {wrongCount}</div>
                        </div>
                        <div className="glass-card p-4 text-center rounded-2xl border border-white/10">
                            <div className="text-[10px] uppercase font-black text-indigo-400/70 tracking-wider">Aniqlik</div>
                            <div className="text-xl font-black text-indigo-300 mt-1">🎯 {accuracy}%</div>
                        </div>
                        <div className="glass-card p-4 text-center rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
                            <div className="text-[10px] uppercase font-black text-white/40 tracking-wider">O'quvchi Progress</div>
                            <div className="text-xl font-black text-white mt-1">
                                👥 {currentStudentIndex + 1} / {totalStudents}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stop Session Confirmation Modal */}
                {showStopModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="glass-card max-w-md w-full p-6 sm:p-8 space-y-6 text-center border border-white/20 rounded-3xl shadow-2xl bg-slate-900/90">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-lg">
                                <Square className="w-8 h-8 fill-current" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-white tracking-tight">O'yinni yakunlaysizmi?</h3>
                                <p className="text-sm font-bold text-white/60">
                                    O'yin davomida to'xtatildi. Natijalarni saqlaysizmi yoki saqlamasdan chiqqan ma'qulmi?
                                </p>
                            </div>

                            <div className="space-y-3 pt-2">
                                {/* Save & Finish */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStopModal(false);
                                        finishCurrentStudent(correctCount, wrongCount);
                                    }}
                                    className="w-full px-6 rounded-2xl font-black text-xs sm:text-sm text-white transition-all active:scale-95 shadow-lg shadow-indigo-500/30 hover:brightness-110"
                                    style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
                                >
                                    <span className="mr-2">💾</span>
                                    <span>Natijalarni saqlab yakunlash</span>
                                </button>

                                {/* Discard & Quit */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStopModal(false);
                                        setPhase('setup');
                                    }}
                                    className="w-full px-6 rounded-2xl font-black text-xs sm:text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all active:scale-95"
                                    style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <span className="mr-2">🗑️</span>
                                    <span>Saqlamasdan chiqish</span>
                                </button>

                                {/* Cancel & Resume */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStopModal(false);
                                        setIsPaused(false);
                                    }}
                                    className="w-full px-6 rounded-2xl font-black text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all"
                                    style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <span>✕ Bekor qilish (O'yinni davom ettirish)</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── CEREMONY PHASE ─────────────────────────────────────────────────────────
    if (phase === 'ceremony') {
        if (!summary) {
            return (
                <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <h2 className="text-2xl font-black text-white tracking-widest uppercase animate-pulse">
                            Natijalar hisoblanmoqda...
                        </h2>
                    </div>
                </div>
            );
        }

        const sortedResults = [...(summary.results || [])].sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0));
        const top3 = sortedResults.slice(0, 3);
        const others = sortedResults.slice(3);

        return (
            <div className="min-h-screen relative overflow-hidden bg-slate-950 flex flex-col pt-12 pb-24 px-4 sm:px-6 z-0">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-10" />
                <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
                <Confetti trigger={true} />
                
                {/* Main Header */}
                <div className="relative z-10 text-center mb-16 animate-slide-down">
                    <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_0_25px_rgba(251,191,36,0.3)] uppercase tracking-tighter">
                        🎉 Natijalar 🎉
                    </h1>
                    <p className="text-lg sm:text-xl font-bold text-indigo-300 mt-4 tracking-widest uppercase">
                        Sessiya muvaffaqiyatli yakunlandi!
                    </p>
                </div>

                {/* Podium Area */}
                <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col justify-end items-center mb-24 min-h-[400px]">
                    <div className="flex items-end justify-center gap-2 sm:gap-6 w-full px-2">
                        
                        {/* 2nd Place */}
                        {top3[1] && (
                            <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                <div className="mb-4 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full border-4 border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.4)] mx-auto flex items-center justify-center text-2xl mb-3 z-10 relative">
                                        🥈
                                    </div>
                                    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700">
                                        <p className="text-white font-black text-xs sm:text-sm truncate w-24 sm:w-32">{top3[1].studentId.name}</p>
                                        <p className="text-emerald-400 font-bold text-[10px]">{top3[1].performanceScore} Ball</p>
                                    </div>
                                </div>
                                <div className="w-24 sm:w-32 h-32 sm:h-48 bg-gradient-to-t from-slate-800 to-slate-400/20 rounded-t-lg border-x border-t border-slate-400/30 flex items-start justify-center pt-4 relative overflow-hidden shadow-[0_-10px_30px_rgba(203,213,225,0.1)]">
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
                                    <span className="text-5xl sm:text-7xl font-black text-slate-300/40">2</span>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {top3[0] && (
                            <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.6s' }}>
                                <div className="mb-4 text-center relative">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</div>
                                    <div className="w-20 h-20 sm:w-28 sm:h-28 bg-amber-200 rounded-full border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.6)] mx-auto flex items-center justify-center text-4xl mb-3 z-10 relative">
                                        🥇
                                    </div>
                                    <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
                                        <p className="text-white font-black text-sm sm:text-base truncate w-28 sm:w-40">{top3[0].studentId.name}</p>
                                        <p className="text-amber-400 font-black text-xs">{top3[0].performanceScore} Ball</p>
                                    </div>
                                </div>
                                <div className="w-28 sm:w-40 h-40 sm:h-64 bg-gradient-to-t from-amber-900/50 to-amber-400/30 rounded-t-lg border-x border-t border-amber-400/50 flex items-start justify-center pt-6 relative overflow-hidden shadow-[0_-10px_40px_rgba(251,191,36,0.2)] z-0">
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
                                    <span className="text-7xl sm:text-9xl font-black text-amber-300/40">1</span>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {top3[2] && (
                            <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
                                <div className="mb-4 text-center">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-900/40 rounded-full border-4 border-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.4)] mx-auto flex items-center justify-center text-2xl mb-3 z-10 relative">
                                        🥉
                                    </div>
                                    <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-900/50">
                                        <p className="text-white font-black text-xs sm:text-sm truncate w-24 sm:w-32">{top3[2].studentId.name}</p>
                                        <p className="text-emerald-400 font-bold text-[10px]">{top3[2].performanceScore} Ball</p>
                                    </div>
                                </div>
                                <div className="w-24 sm:w-32 h-24 sm:h-40 bg-gradient-to-t from-amber-950 to-amber-700/30 rounded-t-lg border-x border-t border-amber-700/50 flex items-start justify-center pt-4 relative overflow-hidden shadow-[0_-10px_30px_rgba(180,83,9,0.1)]">
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
                                    <span className="text-5xl sm:text-7xl font-black text-amber-700/40">3</span>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Others List */}
                {others.length > 0 && (
                    <div className="relative z-10 w-full max-w-2xl mx-auto space-y-3 animate-fade-in" style={{ animationDelay: '1s', animationFillMode: 'both' }}>
                        <h3 className="text-sm font-black text-indigo-300/50 uppercase tracking-widest text-center mb-4">Qolgan O'quvchilar</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {others.map((r, i) => (
                                <div key={r._id || i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-white/50 text-xs border border-white/5">
                                            {i + 4}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{r.studentId.name}</p>
                                            <p className="text-emerald-400/70 text-[10px] font-black">{r.accuracy}% Aniqlik</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-indigo-300 font-black text-sm">{r.performanceScore} Ball</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom Actions Fixed */}
                <div className="fixed bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-50 flex justify-center gap-4 animate-slide-up" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
                    <button
                        onClick={() => setPhase('summary')}
                        className="px-6 py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-3 bg-indigo-500"
                    >
                        <span>📊</span> To'liq Statistikani Ko'rish
                    </button>
                    <button
                        onClick={() => {
                            copyTelegram();
                            setPhase('summary');
                        }}
                        className="px-6 py-4 rounded-2xl font-black text-white shadow-xl shadow-sky-500/20 hover:scale-105 transition-all flex items-center gap-3 bg-sky-500"
                    >
                        <span>✈️</span> Telegramga Yuborish
                    </button>
                </div>
            </div>
        );
    }

    // ── SUMMARY PHASE ──────────────────────────────────────────────────────────
    if (phase === 'summary') {
        return (
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-amber-400" /> Sessiya Natijalari
                            </h1>
                            <p className="text-white/40 text-sm font-bold mt-1">Barcha o'quvchilar tugatdi</p>
                        </div>
                        <button
                            onClick={() => { setPhase('setup'); setSummary(null); }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
                        >
                            <RefreshCw className="w-4 h-4" /> Yangi Sessiya
                        </button>
                    </div>

                    {(noSave || summary?.session?.noSave) && (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-black flex items-center gap-2.5 shadow-sm">
                            <span className="text-base">🚫</span>
                            <span>No-Save Rejimi: Ushbu sessiya natijalari va o'quvchilar ogohlantirishlari tarixga saqlanmadi.</span>
                        </div>
                    )}

                    {loadingSummary ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        </div>
                    ) : summary ? (
                        <>
                            {/* Stats Overview */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "O'rtacha ball", value: `${summary.stats.avgScore}`, icon: Target, color: 'indigo' },
                                    { label: 'Eng yuqori', value: `${summary.stats.highestScore}`, icon: Star, color: 'amber' },
                                    { label: 'Eng past', value: `${summary.stats.lowestScore}`, icon: TrendingUp, color: 'rose' },
                                    { label: 'Ogohlantirish', value: `${summary.stats.warningCardCount}`, icon: AlertTriangle, color: 'orange' },
                                ].map((s, i) => (
                                    <div key={i} className="glass-card p-5 text-center space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
                                        <p className="text-3xl font-black text-white">{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Leaderboard */}
                                <div className="glass-card p-6 space-y-4">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                                        <Medal className="w-4 h-4 text-amber-400" /> Reyting
                                    </h3>
                                    <div className="space-y-3">
                                        {summary.results.map((r: GameResult, i: number) => {
                                            const medals = ['🥇', '🥈', '🥉'];
                                            const medal = medals[i] || `${i + 1}.`;
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-4 p-3 rounded-xl transition-all"
                                                    style={{
                                                        background: i < 3 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
                                                        border: `1px solid ${i < 3 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)'}`,
                                                    }}
                                                >
                                                    <span className="text-xl w-8 text-center">{medal}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-white text-sm truncate">
                                                            {r.studentId?.name}
                                                            {r.warningCard && <span className="ml-2 text-amber-400 text-xs">⚠️</span>}
                                                        </p>
                                                        {/* Progress bar */}
                                                        <div className="mt-1 h-1.5 rounded-full bg-white/10">
                                                            <div
                                                                className="h-1.5 rounded-full bg-emerald-500 transition-all duration-700"
                                                                style={{ width: `${r.accuracy}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-black text-emerald-400">{r.correctCount} ✅</p>
                                                        <p className="text-[10px] text-white/30">{r.accuracy}%</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Charts */}
                                <div className="space-y-4">
                                    <div className="glass-card p-6 space-y-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                                            <PieIcon className="w-4 h-4 text-indigo-400" /> O'tish / O'tmaslik
                                        </h3>
                                        <SimplePieChart pass={summary.stats.passCount} fail={summary.stats.failCount} />
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart */}
                            <div className="glass-card p-6 space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-indigo-400" /> Natijalar Taqqoslamasi
                                </h3>
                                <SimpleBarChart data={summary.barChartData || []} />
                            </div>

                            {/* Warning Cards */}
                            {summary.stats.warningCardCount > 0 && (
                                <div
                                    className="glass-card p-6 border-amber-500/30 space-y-3"
                                    style={{ borderColor: 'rgba(245,158,11,0.3)' }}
                                >
                                    <h3 className="text-sm font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Ogohlantirish Kartasi Berildi
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {summary.results.filter((r: GameResult) => r.warningCard).map((r: GameResult, i: number) => (
                                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-black text-amber-400 bg-amber-400/10 border border-amber-400/20">
                                                ⚠️ {r.studentId?.name}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-white/40">Bu o'quvchilar 0 ta to'g'ri javob berdi. Keyingi darsga lug'atlarni yaxshiroq tayyorlab kelishlarini eslatib qo'ying.</p>
                                </div>
                            )}

                            {/* Telegram Section */}
                            <div className="glass-card p-6 space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                                    <Send className="w-4 h-4 text-blue-400" /> Telegram Xabari
                                </h3>
                                <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono bg-white/5 rounded-xl p-4 leading-relaxed border border-white/5">
                                    {summary.telegramMessage}
                                </pre>
                                <button
                                    onClick={copyTelegram}
                                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-black text-sm transition-all"
                                    style={{
                                        background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
                                        border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.35)'}`,
                                        color: copied ? '#34d399' : '#60a5fa',
                                    }}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Nusxalandi!' : 'Telegram uchun nusxalash'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-white/40">Natijalar yuklanmadi</p>
                    )}
                </div>
            </div>
        );
    }

    // ── HISTORY PHASE ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="flex items-center gap-4">
                    <button onClick={() => setPhase('setup')} className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-white">Sessiya Tarixi</h1>
                        <p className="text-white/40 text-sm">O'tgan lug'at sessiyalari</p>
                    </div>
                </div>

                {loadingHistory ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : history.length === 0 ? (
                    <div className="glass-card p-16 text-center">
                        <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/40 font-bold">Hali hech qanday sessiya o'tkazilmagan</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((s: any) => (
                            <button
                                key={s._id}
                                onClick={() => { loadSummary(s._id); setPhase('summary'); setSessionId(s._id); }}
                                className="w-full glass-card p-5 flex items-center gap-4 text-left hover:-translate-y-0.5 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Trophy className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-white">{s.groupId?.name || 'Guruh'}</p>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        {Array.isArray(s.unitIds) && s.unitIds.length > 0
                                            ? s.unitIds.map((u: any) => u.title || 'Unit').join(', ')
                                            : (s.unitId?.title || 'Unit')} · {s.questionsPerStudent} ta savol
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs font-black text-white/40">{new Date(s.createdAt).toLocaleDateString()}</p>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg mt-1 inline-block ${
                                        s.status === 'ENDED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                                    }`}>
                                        {s.status === 'ENDED' ? 'Tugatildi' : 'Faol'}
                                    </span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/20 shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
