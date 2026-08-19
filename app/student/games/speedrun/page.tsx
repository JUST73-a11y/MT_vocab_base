'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { soundEngine } from '@/lib/sound/soundEngine';
import { ParticleCanvas, ParticleCanvasRef } from '@/components/ui/ParticleCanvas';
import { fireVictoryConfetti } from '@/components/ui/ConfettiEffect';
import { ArrowLeft, Clock, Zap, Flame, Trophy, Coins, RotateCcw } from 'lucide-react';

export default function SpeedRunPage() {
    const router = useRouter();
    const particleRef = useRef<ParticleCanvasRef | null>(null);

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);

    const [timeLeft, setTimeLeft] = useState(60);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [comboText, setComboText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [gameResult, setGameResult] = useState<any>(null);

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

    useEffect(() => { loadQuestions(); }, []);

    // Timer countdown effect
    useEffect(() => {
        if (!gameStarted || gameOver) return;
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
    }, [gameStarted, gameOver]);

    const startGame = () => {
        setGameStarted(true);
        setGameOver(false);
        setTimeLeft(60);
        setScore(0);
        setStreak(0);
        setMaxStreak(0);
        setCurrentIndex(0);
        setGameResult(null);
    };

    const handleAnswer = (selectedUzbek: string, e: React.MouseEvent<HTMLButtonElement>) => {
        if (gameOver || !questions[currentIndex]) return;
        const currentQ = questions[currentIndex];
        const isCorrect = selectedUzbek === currentQ.correctUzbek;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;

        if (isCorrect) {
            soundEngine.playCorrect();
            particleRef.current?.triggerBurst(clickX, clickY, '#10b981', 20);

            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > maxStreak) setMaxStreak(newStreak);

            setScore(s => s + 1);

            // Combo multiplier bonuses
            if (newStreak >= 3) {
                soundEngine.playStreak(newStreak);
                setTimeLeft(t => t + 1); // +1 second bonus
                setComboText(`🔥 COMBO ${newStreak}X! (+1s)`);
                setTimeout(() => setComboText(''), 1000);
            }
        } else {
            soundEngine.playWrong();
            particleRef.current?.triggerBurst(clickX, clickY, '#ef4444', 15);
            setStreak(0);
        }

        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(i => i + 1);
        } else {
            // Loop back or fetch more
            setCurrentIndex(0);
        }
    };

    const finishGame = async () => {
        setGameOver(true);
        setSubmitting(true);
        try {
            const res = await fetch('/api/student/games/speedrun', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correctCount: score, maxStreak }),
            });
            const data = await res.json();
            setGameResult(data);
            if (data.isNewHighScore || score >= 15) {
                fireVictoryConfetti();
                soundEngine.playLevelUp();
            }
        } catch {
            setGameResult(null);
        }
        setSubmitting(false);
    };

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-6 flex flex-col items-center justify-between min-h-[85vh] relative z-10">
            <ParticleCanvas ref={particleRef} />

            {/* Top Bar */}
            <div className="w-full flex items-center justify-between">
                <button
                    onClick={() => router.push('/student/games')}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Chiqish
                </button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 font-black text-amber-400">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <span>{streak}x Streak</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 font-black text-indigo-400">
                        <Clock className="w-5 h-5" />
                        <span className="text-xl">{timeLeft}s</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {!gameStarted ? (
                /* Start Screen */
                <div className="flex flex-col items-center text-center my-auto py-10 gap-6">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(245,158,11,0.4)] animate-bounce">
                        ⚡
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black text-white">Speed Run Rejimi</h1>
                        <p className="text-white/60 mt-2 max-w-md">60 soniya ichida imkon qadar ko'proq so'zlarning o'zbekcha tarjimasini toping!</p>
                    </div>

                    {loading ? (
                        <div className="animate-spin w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent my-4" />
                    ) : questions.length === 0 ? (
                        <p className="text-red-400 text-sm font-bold">O'quv bo'limlarida so'zlar topilmadi</p>
                    ) : (
                        <button
                            onClick={startGame}
                            className="px-8 py-4 font-black text-xl rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-amber-950 shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-3"
                        >
                            <Zap className="w-6 h-6" /> O'yinni Boshlash!
                        </button>
                    )}
                </div>
            ) : gameOver ? (
                /* Game Over Screen */
                <div className="flex flex-col items-center text-center my-auto py-10 gap-6 w-full max-w-md">
                    <div className="text-6xl mb-2">{score >= 15 ? '🏆' : '⏱️'}</div>
                    <div>
                        <h2 className="text-3xl font-black text-white">Vaqt Tugadi!</h2>
                        <p className="text-white/60 text-sm mt-1">Siz {score} ta so'zni to'g'ri topdingiz</p>
                    </div>

                    <div className="w-full rounded-3xl p-6 bg-white/5 border border-white/10 flex flex-col gap-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">To'g'ri so'zlar</span>
                            <span className="font-black text-emerald-400 text-lg">{score} ta</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Maksimal Streak</span>
                            <span className="font-black text-amber-400 text-lg">{maxStreak}x</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Qozonilgan MT Tangalar</span>
                            <span className="font-black text-indigo-400 text-lg">+{gameResult?.coinsEarned || 0} MT</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Qozonilgan XP</span>
                            <span className="font-black text-purple-400 text-lg">+{gameResult?.xpEarned || 0} XP</span>
                        </div>

                        {gameResult?.isNewHighScore && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2">
                                🌟 YANGI REKORD!
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={startGame}
                            className="flex-1 py-3.5 font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" /> Qaytadan O'ynash
                        </button>
                    </div>
                </div>
            ) : (
                /* Active Game UI */
                <div className="w-full flex flex-col items-center my-auto gap-6 max-w-md">
                    {/* Combo streak overlay banner */}
                    {comboText && (
                        <div className="font-black text-amber-400 text-xl tracking-wider animate-bounce">
                            {comboText}
                        </div>
                    )}

                    {/* Word Card */}
                    <div className="w-full p-8 rounded-3xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border-2 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.2)] text-center flex flex-col items-center">
                        <span className="text-xs uppercase font-black tracking-widest text-indigo-300 mb-2">Inglizcha so'z</span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                            {questions[currentIndex]?.word}
                        </h2>
                    </div>

                    {/* 4 Option Buttons */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {questions[currentIndex]?.options.map((opt: string, idx: number) => (
                            <button
                                key={idx}
                                onClick={(e) => handleAnswer(opt, e)}
                                className="w-full py-4 px-5 rounded-2xl font-bold text-base bg-white/5 border border-white/10 hover:bg-indigo-600 hover:border-indigo-400 text-white transition-all active:scale-95 cursor-pointer text-center"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}