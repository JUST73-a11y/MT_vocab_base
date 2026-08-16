'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { soundManager } from '@/lib/soundManager';
import { 
    Swords, Trophy, Clock, CheckCircle2, XCircle, Volume2, VolumeX,
    ArrowRight, Loader2, Sparkles, Medal, ShieldAlert, RotateCcw, Home, Flame, Zap
} from 'lucide-react';

interface DuelQuestion {
    index: number;
    word: string;
    options: string[];
    audioUrl?: string;
    correctTranslation?: string;
}

interface DuelData {
    id: string;
    status: string;
    rewardCoins: number;
    isChallenger: boolean;
    challengerName: string;
    opponentName: string;
    myScore: {
        isFinished: boolean;
        correctCount: number;
        timeSpentSec: number;
    };
    opponentScore: {
        isFinished: boolean;
        correctCount?: number;
        timeSpentSec?: number;
    };
    winnerId?: string;
    questions: DuelQuestion[];
}

export default function StudentDuelGamePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const duelId = params?.id as string;

    const [duel, setDuel] = useState<DuelData | null>(null);
    const [loading, setLoading] = useState(true);

    // Intro Battle Splash
    const [battleStarted, setBattleStarted] = useState(false);
    const [introCount, setIntroCount] = useState<number | null>(null);

    // Audio SFX state
    const [sfxOn, setSfxOn] = useState(true);

    // Gameplay states
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [activeEmoji, setActiveEmoji] = useState<string | null>(null);
    const [answers, setAnswers] = useState<{ questionIndex: number; selected: string }[]>([]);
    const [startTime, setStartTime] = useState<number>(0);
    const [timerSec, setTimerSec] = useState<number>(10);
    const [streak, setStreak] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const GOOD_EMOJIS = ['✅', '🔥', '😁', '👍', '❤️', '⚡', '🎉', '🌟', '🥳', '😎'];
    const BAD_EMOJIS = ['❌', '🤣', '😒', '😑', '😪', '😴', '🥱', '💀', '🤦‍♂️', '💔'];

    useEffect(() => {
        loadDuel();
    }, [duelId]);

    const loadDuel = async () => {
        setLoading(true);
        try {
            const data = await apiFetch(`/api/student/duel/${duelId}`);
            setDuel(data);
            if (data.myScore?.isFinished) {
                setIsFinished(true);
                setBattleStarted(true);
            }
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    // Trigger VS Intro Countdown when page loads
    const startBattleCountdown = () => {
        setIntroCount(3);
        soundManager.playBattleCountdown(3);

        const countInterval = setInterval(() => {
            setIntroCount(prev => {
                if (prev === null) return null;
                if (prev === 1) {
                    clearInterval(countInterval);
                    soundManager.playBattleCountdown(0); // FIGHT! sound + sword clash
                    setTimeout(() => {
                        setIntroCount(null);
                        setBattleStarted(true);
                        setStartTime(Date.now());
                    }, 800);
                    return 0;
                }
                const next = prev - 1;
                soundManager.playBattleCountdown(next);
                return next;
            });
        }, 1000);
    };

    // Question Timer Loop
    useEffect(() => {
        if (!duel || !battleStarted || isFinished || duel.myScore?.isFinished) return;

        setTimerSec(10);
        setSelectedOption(null);
        setAnswerStatus('idle');
        setActiveEmoji(null);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimerSec(prev => {
                if (prev <= 4 && prev > 1) {
                    soundManager.playTick();
                }
                if (prev <= 1) {
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIdx, battleStarted, isFinished, duel]);

    const toggleSfx = () => {
        const next = !sfxOn;
        setSfxOn(next);
        soundManager.setSfxEnabled(next);
    };

    const playWordAudio = (text: string, audioUrl?: string) => {
        if (audioUrl) {
            new Audio(audioUrl).play().catch(() => {});
        } else if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            window.speechSynthesis.speak(u);
        }
    };

    const handleOptionSelect = (option: string) => {
        if (selectedOption !== null || !duel) return;
        if (timerRef.current) clearInterval(timerRef.current);

        setSelectedOption(option);

        // Check if correct
        const q = duel.questions[currentIdx];
        const isCorrect = Boolean(q && q.correctTranslation && option === q.correctTranslation);

        if (isCorrect) {
            setAnswerStatus('correct');
            soundManager.playCorrect();
            const emoji = GOOD_EMOJIS[Math.floor(Math.random() * GOOD_EMOJIS.length)];
            setActiveEmoji(emoji);

            const nextStreak = streak + 1;
            setStreak(nextStreak);
            if (nextStreak >= 3) {
                soundManager.playStreakFire();
            }
        } else {
            setAnswerStatus('wrong');
            soundManager.playWrong();
            const emoji = BAD_EMOJIS[Math.floor(Math.random() * BAD_EMOJIS.length)];
            setActiveEmoji(emoji);
            setStreak(0);
        }

        const newAnswers = [...answers, { questionIndex: currentIdx, selected: option }];
        setAnswers(newAnswers);

        setTimeout(() => {
            if (currentIdx < duel.questions.length - 1) {
                setCurrentIdx(prev => prev + 1);
            } else {
                finishDuel(newAnswers);
            }
        }, 850);
    };

    const handleTimeOut = () => {
        if (selectedOption !== null || !duel) return;
        soundManager.playWrong();
        setStreak(0);
        setAnswerStatus('wrong');
        const timeoutEmojis = ['😴', '🥱', '⏰', '💀', '🤦‍♂️', '❌'];
        setActiveEmoji(timeoutEmojis[Math.floor(Math.random() * timeoutEmojis.length)]);

        const newAnswers = [...answers, { questionIndex: currentIdx, selected: '__TIMEOUT__' }];
        setAnswers(newAnswers);

        setTimeout(() => {
            if (currentIdx < duel.questions.length - 1) {
                setCurrentIdx(prev => prev + 1);
            } else {
                finishDuel(newAnswers);
            }
        }, 600);
    };

    const finishDuel = async (finalAnswers: any[]) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setSubmitting(true);

        const totalElapsedSec = Math.max(1, Math.round((Date.now() - (startTime || Date.now())) / 1000));

        try {
            await apiFetch(`/api/student/duel/${duelId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: finalAnswers,
                    timeSpentSec: totalElapsedSec,
                }),
            });

            setIsFinished(true);
            const updated = await apiFetch(`/api/student/duel/${duelId}`);
            setDuel(updated);

            if (updated.winnerId === user?.id) {
                soundManager.playVictoryFanfare();
            } else if (updated.status === 'COMPLETED') {
                soundManager.playDefeatTone();
            }
        } catch (e) {
            // ignore
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!duel) {
        return (
            <div className="text-center py-20">
                <p className="text-white/50">Duel topilmadi</p>
                <button onClick={() => router.push('/student/group')} className="mt-4 px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold">
                    Guruhga qaytish
                </button>
            </div>
        );
    }

    // ── 1. CINEMATIC VS BATTLE INTRO SPLASH ──────────────────────────────────
    if (!battleStarted && !duel.myScore?.isFinished) {
        const challenger = duel.challengerName;
        const opponent = duel.opponentName;

        return (
            <div className="w-full max-w-4xl mx-auto py-10 px-4 min-h-[75vh] flex flex-col items-center justify-center text-center relative overflow-hidden animate-fade-in">
                {/* Background battle spotlights */}
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center w-full">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black text-xs uppercase tracking-widest mb-8">
                        <Swords className="w-4 h-4 animate-spin" /> 1v1 Arena Duellari
                    </div>

                    {/* VS Battle Avatars Side-by-Side */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center w-full max-w-2xl mb-10">
                        {/* Challenger (Left) */}
                        <div className="p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent flex flex-col items-center animate-duel-left shadow-2xl">
                            <div className="w-20 h-20 rounded-2xl bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-3xl font-black text-blue-300 shadow-xl shadow-blue-500/30 mb-3">
                                {challenger.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="font-black text-lg text-white">{challenger}</h3>
                            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mt-1">Chaqiruvchi</span>
                        </div>

                        {/* VS Emblem (Center) */}
                        <div className="flex flex-col items-center justify-center animate-duel-vs my-2 sm:my-0">
                            <div className="w-18 h-18 rounded-full bg-gradient-to-br from-amber-500 via-red-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-red-500/50 border-2 border-amber-300">
                                <span className="font-black text-2xl text-white italic tracking-tighter drop-shadow-lg">VS</span>
                            </div>
                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-[0.2em] mt-2">
                                10 Ta Savol
                            </span>
                        </div>

                        {/* Opponent (Right) */}
                        <div className="p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent flex flex-col items-center animate-duel-right shadow-2xl">
                            <div className="w-20 h-20 rounded-2xl bg-purple-600/30 border-2 border-purple-400 flex items-center justify-center text-3xl font-black text-purple-300 shadow-xl shadow-purple-500/30 mb-3">
                                {opponent.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="font-black text-lg text-white">{opponent}</h3>
                            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest mt-1">Raqib</span>
                        </div>
                    </div>

                    {/* Countdown or Start Action */}
                    {introCount !== null ? (
                        <div className="flex flex-col items-center gap-2 animate-bounce">
                            <div className="w-24 h-24 rounded-3xl bg-indigo-600/40 border-2 border-indigo-400 flex items-center justify-center text-5xl font-black text-white shadow-2xl shadow-indigo-500/40">
                                {introCount === 0 ? 'GO!' : introCount}
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-300 mt-2">
                                {introCount === 0 ? 'JANG BOSHLANDI!' : 'TAYYOR TURING!'}
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={startBattleCountdown}
                            className="px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-base uppercase tracking-wider shadow-2xl shadow-indigo-600/40 flex items-center gap-3 transition-all hover:scale-105 active:scale-95 btn-hover-glow"
                        >
                            <Swords className="w-5 h-5" /> Jangni Boshlash (Start Duel)
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── 2. RESULT & CELEBRATION SCREEN ───────────────────────────────────────
    if (isFinished || duel.status === 'COMPLETED') {
        const isWinner = duel.winnerId === user?.id;
        const isDraw = duel.winnerId === 'DRAW';
        const isCompleted = duel.status === 'COMPLETED';

        return (
            <div className="w-full max-w-xl mx-auto py-10 px-4 animate-fade-in text-center flex flex-col items-center relative">
                {/* Confetti Glow */}
                {isWinner && (
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none" />
                )}

                <div 
                    className={`w-28 h-28 rounded-3xl flex items-center justify-center mb-6 shadow-2xl text-5xl transition-transform ${isWinner ? 'animate-bounce shadow-amber-500/40' : ''}`}
                    style={{
                        background: isWinner 
                            ? 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(234,88,12,0.25))' 
                            : isDraw 
                                ? 'rgba(99,102,241,0.2)' 
                                : 'rgba(239,68,68,0.2)',
                        border: `2px solid ${isWinner ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                >
                    {isWinner ? '👑' : isDraw ? '⚔️' : isCompleted ? '💔' : '⏳'}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">
                    {isCompleted 
                        ? (isWinner ? 'G\'alaba!' : isDraw ? 'Durang!' : 'Mag\'lubiyat') 
                        : 'Siz o\'yiningizni tugatdingiz!'}
                </h1>

                <p className="text-sm sm:text-base text-white/70 mb-8 max-w-sm">
                    {isCompleted 
                        ? (isWinner ? `Ajoyib! Siz +${duel.rewardCoins} MT Coin mukofotini qo'lga kiritdingiz!` : 'Raqib bilan qizg\'in jang bo\'ldi!') 
                        : 'Raqibingiz savollarga javob berishini kuting. Natija avtomatik guruh reytingiga qo\'shiladi.'}
                </p>

                {/* Score Summary Box */}
                <div 
                    className="w-full p-6 sm:p-8 rounded-3xl border border-white/10 mb-8 shadow-2xl relative overflow-hidden"
                    style={{
                        background: 'var(--theme-card-bg, rgba(15,20,35,0.75))',
                        backdropFilter: 'var(--theme-card-blur, blur(20px))',
                    }}
                >
                    <div className="grid grid-cols-2 gap-4 divide-x divide-white/10">
                        {/* You */}
                        <div className="px-2 flex flex-col items-center">
                            <p className="text-xs uppercase font-black text-indigo-400 mb-1">
                                Siz ({duel.isChallenger ? duel.challengerName : duel.opponentName})
                            </p>
                            <p className="text-4xl font-black text-white">
                                {duel.myScore.correctCount} <span className="text-lg text-white/40">/ {duel.questions.length}</span>
                            </p>
                            <p className="text-xs text-white/50 mt-2 flex items-center gap-1.5 font-mono">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" /> {duel.myScore.timeSpentSec}s
                            </p>
                        </div>

                        {/* Opponent */}
                        <div className="px-2 flex flex-col items-center">
                            <p className="text-xs uppercase font-black text-purple-400 mb-1">
                                Raqib ({duel.isChallenger ? duel.opponentName : duel.challengerName})
                            </p>
                            <p className="text-4xl font-black text-white">
                                {isCompleted ? duel.opponentScore.correctCount : (duel.opponentScore.isFinished ? 'Tugatdi' : '...')}
                                {isCompleted && <span className="text-lg text-white/40">/ {duel.questions.length}</span>}
                            </p>
                            <p className="text-xs text-white/50 mt-2 flex items-center gap-1.5 font-mono">
                                <Clock className="w-3.5 h-3.5 text-purple-400" /> {isCompleted ? `${duel.opponentScore.timeSpentSec}s` : 'Kutilmoqda'}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/student/group')}
                    className="px-8 py-4 rounded-2xl font-black text-sm text-white shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 btn-hover-glow"
                    style={{ background: 'var(--theme-primary, #6366f1)' }}
                >
                    <Home className="w-4 h-4" /> Guruh Reytingiga Qaytish
                </button>
            </div>
        );
    }

    // ── 3. GAMEPLAY SCREEN WITH DYNAMIC SFX & ANIMATIONS ──────────────────────
    const currentQ = duel.questions[currentIdx];

    return (
        <div className="w-full max-w-2xl mx-auto py-8 px-4 animate-fade-in flex flex-col items-center">
            {/* Top Battle Stats Bar */}
            <div className="w-full flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black">
                        <Swords className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-xs font-black uppercase text-white tracking-wider">
                            Savol {currentIdx + 1} / {duel.questions.length}
                        </span>
                        <p className="text-[10px] text-white/40 font-bold">1v1 Duel Arena</p>
                    </div>
                </div>

                {/* Streak & SFX Toggle */}
                <div className="flex items-center gap-3">
                    {streak >= 2 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs uppercase animate-flame">
                            <Flame className="w-4 h-4 text-orange-500" /> {streak}x STREAK
                        </div>
                    )}

                    <button 
                        onClick={toggleSfx}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title={sfxOn ? "Ovozni o'chirish" : "Ovozni yoqish"}
                    >
                        {sfxOn ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
                    </button>
                </div>
            </div>

            {/* Time progress bar */}
            <div className="w-full flex items-center justify-between mb-1.5 text-xs font-mono font-black">
                <span className="text-white/40 text-[10px] uppercase">Qolgan vaqt</span>
                <span className={timerSec <= 3 ? 'text-red-400 animate-pulse' : 'text-amber-300'}>
                    00:0{timerSec}s
                </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-8 shadow-inner">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                        timerSec <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500'
                    }`}
                    style={{ width: `${(timerSec / 10) * 100}%` }}
                />
            </div>

            {/* Fullscreen Floating Reaction Emoji Explosion (100% Unclipped & Centered) */}
            {activeEmoji && (
                <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
                    <div className="relative flex items-center justify-center">
                        {/* Left mini companion */}
                        <span className="absolute text-5xl sm:text-7xl animate-emoji-burst-left select-none drop-shadow-2xl">
                            {activeEmoji}
                        </span>

                        {/* Center Giant Emoji */}
                        <span className="text-8xl sm:text-9xl md:text-[130px] drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] animate-emoji-float select-none">
                            {activeEmoji}
                        </span>

                        {/* Right mini companion */}
                        <span className="absolute text-5xl sm:text-7xl animate-emoji-burst-right select-none drop-shadow-2xl">
                            {activeEmoji}
                        </span>
                    </div>
                </div>
            )}

            {/* Question Word Card */}
            <div 
                className={`w-full p-8 sm:p-12 rounded-3xl border text-center relative shadow-2xl mb-8 transition-all ${
                    answerStatus === 'correct' 
                        ? 'border-emerald-500/50 bg-emerald-950/30 animate-pop-success' 
                        : answerStatus === 'wrong' 
                            ? 'border-red-500/50 bg-red-950/30 animate-shake-error' 
                            : 'border-white/10'
                }`}
                style={{
                    background: answerStatus === 'idle' ? 'var(--theme-card-bg, rgba(15,20,35,0.75))' : undefined,
                    backdropFilter: 'var(--theme-card-blur, blur(20px))',
                }}
            >
                <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                        {currentQ.word}
                    </h2>
                    <button 
                        onClick={() => playWordAudio(currentQ.word, currentQ.audioUrl)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-400 transition-colors"
                        title="Ovozli eshitish"
                    >
                        <Volume2 className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-xs uppercase font-bold text-white/40 tracking-widest mt-3">To'g'ri tarjimani tanlang</p>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                {currentQ.options.map((option, i) => {
                    const isChosen = selectedOption === option;
                    const isCorrectAnswer = currentQ.correctTranslation && option === currentQ.correctTranslation;

                    // Compute dynamic button styling
                    let btnStyle = 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/90 active:scale-98';

                    if (isChosen) {
                        if (answerStatus === 'correct') {
                            btnStyle = 'bg-emerald-600 border-emerald-400 text-white scale-102 shadow-xl shadow-emerald-500/40 animate-pop-success';
                        } else if (answerStatus === 'wrong') {
                            btnStyle = 'bg-red-600 border-red-400 text-white scale-102 shadow-xl shadow-red-500/40 animate-shake-error';
                        }
                    } else if (selectedOption !== null && answerStatus === 'wrong' && isCorrectAnswer) {
                        // Reveal correct option in emerald border
                        btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-300';
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => handleOptionSelect(option)}
                            disabled={selectedOption !== null}
                            className={`p-4 sm:p-5 rounded-2xl border text-left font-black text-base transition-all duration-200 shadow-md flex items-center justify-between ${btnStyle}`}
                        >
                            <span className="flex items-center gap-2">
                                {isChosen && answerStatus === 'correct' && <CheckCircle2 className="w-5 h-5 text-emerald-200" />}
                                {isChosen && answerStatus === 'wrong' && <XCircle className="w-5 h-5 text-red-200" />}
                                {option}
                            </span>
                            <span className="text-xs font-mono opacity-40">[{i + 1}]</span>
                        </button>
                    );
                })}
            </div>

            {submitting && (
                <div className="mt-6 flex items-center gap-2 text-indigo-400 text-xs font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" /> Natijalar serverga yuborilmoqda...
                </div>
            )}
        </div>
    );
}
