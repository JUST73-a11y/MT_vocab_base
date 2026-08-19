'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { soundEngine } from '@/lib/sound/soundEngine';
import { ParticleCanvas, ParticleCanvasRef } from '@/components/ui/ParticleCanvas';
import { fireVictoryConfetti } from '@/components/ui/ConfettiEffect';
import { ArrowLeft, Clock, Zap, Flame, Trophy, Coins, RotateCcw, AlertTriangle, X } from 'lucide-react';

const TIME_OPTIONS = [15, 30, 45, 60];

export default function SpeedRunPage() {
    const router = useRouter();
    const particleRef = useRef<ParticleCanvasRef | null>(null);

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedDuration, setSelectedDuration] = useState(60);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [comboText, setComboText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [gameResult, setGameResult] = useState<any>(null);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [feedbackState, setFeedbackState] = useState<'correct' | 'wrong' | null>(null);

    useEffect(() => {
        setMounted(true);
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/student/games/speedrun');
            const data = await res.json();
            setQuestions(data.questions || []);
        } catch {
            setQuestions([]);
        }
        setLoading(false);
    };

    // Timer countdown effect (paused if exit confirm modal is open)
    useEffect(() => {
        if (!gameStarted || gameOver || showExitConfirm) return;
        const interval = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(interval);
                    finishGame();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [gameStarted, gameOver, showExitConfirm]);

    const startGame = () => {
        setGameStarted(true);
        setGameOver(false);
        setShowExitConfirm(false);
        setTimeLeft(selectedDuration);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setCurrentIndex(0);
        setGameResult(null);
        setFeedbackState(null);
    };

    const handleExitClick = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (gameStarted && !gameOver) {
            setShowExitConfirm(true);
        } else {
            router.push('/student/games');
        }
    };

    const confirmExit = () => {
        setShowExitConfirm(false);
        setGameStarted(false);
        setGameOver(false);
        router.push('/student/games');
    };

    const handleAnswer = (selectedUzbek: string, e: React.MouseEvent<HTMLButtonElement>) => {
        if (gameOver || !questions[currentIndex] || selectedOption !== null) return;
        setSelectedOption(selectedUzbek);

        const currentQ = questions[currentIndex];
        const isCorrect = selectedUzbek === currentQ.correctUzbek;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;

        if (isCorrect) {
            setFeedbackState('correct');
            soundEngine.playCorrect();
            particleRef.current?.triggerBurst(clickX, clickY, '#10b981', 25);

            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > maxStreak) setMaxStreak(newStreak);

            setScore(s => s + 1);

            if (newStreak >= 3) {
                soundEngine.playStreak(newStreak);
                setTimeLeft(t => t + 2);
                setComboText(`🔥 COMBO ${newStreak}X! (+2s)`);
                setTimeout(() => setComboText(''), 900);
            }
        } else {
            setFeedbackState('wrong');
            soundEngine.playWrong();
            particleRef.current?.triggerBurst(clickX, clickY, '#ef4444', 15);
            setStreak(0);
        }

        setTimeout(() => {
            setSelectedOption(null);
            setFeedbackState(null);
            if (currentIndex + 1 < questions.length) {
                setCurrentIndex(i => i + 1);
            } else {
                setCurrentIndex(0);
            }
        }, 220);
    };

    const finishGame = async () => {
        setGameOver(true);
        setSubmitting(true);
        try {
            const res = await fetch('/api/student/games/speedrun', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correctCount: score, maxStreak, duration: selectedDuration }),
            });
            const data = await res.json();
            setGameResult(data);
            if (data.isNewHighScore || score >= 10) {
                fireVictoryConfetti();
                soundEngine.playLevelUp();
            }
        } catch {
            setGameResult(null);
        }
        setSubmitting(false);
    };

    const progressPct = Math.max(0, Math.min(100, (timeLeft / selectedDuration) * 100));

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-4 flex flex-col items-center justify-start min-h-[82vh] relative z-10 gap-6">
            <ParticleCanvas ref={particleRef} />

            {/* Top Bar */}
            <div className="w-full flex items-center justify-between shrink-0 relative z-50">
                <button
                    type="button"
                    onClick={handleExitClick}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm bg-white/10 hover:bg-white/20 border border-white/20 hover:border-indigo-400 text-white transition-all shadow-lg cursor-pointer active:scale-95"
                >
                    <ArrowLeft className="w-4 h-4" /> Chiqish
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 font-black text-amber-400 shadow-md">
                        <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                        <span>{streak}x Streak</span>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-black text-white transition-all shadow-md ${
                        timeLeft <= 5 ? 'bg-red-500/25 border-red-500/60 text-red-400 animate-bounce' : 'bg-indigo-500/15 border-indigo-500/30'
                    }`}>
                        <Clock className="w-5 h-5" />
                        <span className="text-xl font-mono">{timeLeft}s</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full flex flex-col items-center justify-center my-auto relative z-20">
                {!gameStarted ? (
                    /* Start Screen */
                    <div className="flex flex-col items-center text-center py-6 gap-6 w-full max-w-md my-auto">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center text-4xl sm:text-5xl shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-bounce">
                            ⚡
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Speed Run 2.0</h1>
                            <p className="text-white/60 text-xs sm:text-sm mt-1.5">Vaqtni tanlang va eng ko'p so'zlarning tarjimasini toping!</p>
                        </div>

                        {/* Time Selection Mode Pills */}
                        <div className="w-full flex flex-col gap-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-amber-400/80">Vaqt rejimini tanlang:</label>
                            <div className="grid grid-cols-4 gap-2">
                                {TIME_OPTIONS.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedDuration(time)}
                                        className={`py-2.5 sm:py-3 rounded-2xl font-black text-sm sm:text-base transition-all border cursor-pointer ${
                                            selectedDuration === time
                                                ? 'bg-amber-500 text-amber-950 border-amber-400 shadow-lg shadow-amber-500/30 scale-105'
                                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        {time}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loading ? (
                            <div className="animate-spin w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent my-4" />
                        ) : questions.length === 0 ? (
                            <p className="text-red-400 text-sm font-bold">O'quv bo'limlarida so'zlar topilmadi</p>
                        ) : (
                            <button
                                onClick={startGame}
                                className="w-full py-4 font-black text-lg sm:text-xl rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-amber-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-3 mt-1"
                            >
                                <Zap className="w-6 h-6 fill-current" /> Boshlash ({selectedDuration}s)
                            </button>
                        )}
                    </div>
                ) : gameOver ? (
                    /* Game Over Screen */
                    <div className="flex flex-col items-center text-center py-6 gap-6 w-full max-w-md my-auto">
                        <div className="text-6xl mb-1">{score >= 10 ? '🏆' : '⏱️'}</div>
                        <div>
                            <h2 className="text-3xl font-black text-white">Vaqt Tugadi!</h2>
                            <p className="text-white/60 text-sm mt-1">{selectedDuration}s ichida {score} ta so'z topdingiz</p>
                        </div>

                        <div className="w-full rounded-3xl p-6 bg-slate-950/80 border border-white/15 flex flex-col gap-3.5 backdrop-blur-xl shadow-2xl">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/60 font-semibold">To'g'ri javoblar</span>
                                <span className="font-black text-emerald-400 text-lg">{score} ta</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/60 font-semibold">Maksimal Streak</span>
                                <span className="font-black text-amber-400 text-lg">{maxStreak}x</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/60 font-semibold">Qozonilgan MT Tangalar</span>
                                <span className="font-black text-indigo-400 text-lg">+{gameResult?.coinsEarned || 0} MT</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/60 font-semibold">Qozonilgan XP</span>
                                <span className="font-black text-purple-400 text-lg">+{gameResult?.xpEarned || 0} XP</span>
                            </div>

                            {gameResult?.isNewHighScore && (
                                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2">
                                    🌟 YANGI MUDDAT REKORDI!
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={startGame}
                                className="flex-1 py-3.5 font-bold rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 transition-all cursor-pointer flex items-center justify-center gap-2 font-black shadow-lg shadow-amber-500/20"
                            >
                                <RotateCcw className="w-4 h-4" /> Qayta O'ynash ({selectedDuration}s)
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Active Game Play Screen — HIGH-ENERGY VIBRANT NEON STYLING */
                    <div className="w-full flex flex-col items-center my-auto gap-6 max-w-lg">
                        {/* Glowing Progress Bar */}
                        <div className="w-full h-3 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.7)]"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>

                        {/* Combo streak popup */}
                        {comboText && (
                            <div className="font-black text-amber-400 text-2xl tracking-wider animate-bounce drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]">
                                {comboText}
                            </div>
                        )}

                        {/* Word Card */}
                        <div className="w-full p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-950/90 via-slate-950/95 to-purple-950/90 border-2 border-indigo-500/50 shadow-[0_0_60px_rgba(99,102,241,0.35)] backdrop-blur-2xl text-center flex flex-col items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 text-7xl opacity-5 pointer-events-none select-none">⚡</div>
                            <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[11px] uppercase font-black tracking-widest text-indigo-300 mb-3 shadow-inner">
                                INGLIZCHA SO'Z
                            </span>
                            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                                {questions[currentIndex]?.word}
                            </h2>
                        </div>

                        {/* 4 Option Buttons */}
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {questions[currentIndex]?.options.map((opt: string, idx: number) => {
                                const isSelected = selectedOption === opt;
                                let btnStyle = 'bg-slate-900/90 border-white/15 hover:border-indigo-400 hover:bg-indigo-600/90 text-white hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]';

                                if (isSelected && feedbackState === 'correct') {
                                    btnStyle = 'bg-gradient-to-r from-emerald-600 to-green-500 border-emerald-300 text-white scale-105 shadow-[0_0_30px_rgba(16,185,129,0.7)]';
                                } else if (isSelected && feedbackState === 'wrong') {
                                    btnStyle = 'bg-gradient-to-r from-red-600 to-rose-600 border-red-300 text-white scale-95 shadow-[0_0_20px_rgba(239,68,68,0.5)]';
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={(e) => handleAnswer(opt, e)}
                                        disabled={selectedOption !== null}
                                        className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg border backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer text-center flex items-center justify-center shadow-lg ${btnStyle}`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Exit Warning Modal during active gameplay — Using Portal to document.body */}
            {mounted && showExitConfirm && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-900 border border-amber-500/40 text-center shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white mb-1">O'yindan chiqmoqchimisiz?</h3>
                            <p className="text-white/60 text-xs leading-relaxed">
                                Hozirgi Speed Run o'yiningiz to'xtatiladi va to'plagan ballaringiz saqlanmaydi.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full mt-2">
                            <button
                                type="button"
                                onClick={() => setShowExitConfirm(false)}
                                className="py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer"
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                onClick={confirmExit}
                                className="py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-red-600/30"
                            >
                                Ha, chiqaman
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}