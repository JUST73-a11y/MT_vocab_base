'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { soundEngine } from '@/lib/sound/soundEngine';
import { fireVictoryConfetti } from '@/components/ui/ConfettiEffect';
import { ArrowLeft, Sparkles, Coins, Zap, Shield, Gift, RotateCcw } from 'lucide-react';

const SECTORS = [
    { index: 0, label: '50 MT', icon: '🪙', color: '#6366f1' },
    { index: 1, label: '+2 Energiya', icon: '⚡', color: '#10b981' },
    { index: 2, label: '100 MT', icon: '🪙', color: '#3b82f6' },
    { index: 3, label: 'Smart Karta', icon: '💳', color: '#f59e0b' },
    { index: 4, label: '250 MT', icon: '🪙', color: '#8b5cf6' },
    { index: 5, label: '+5 Energiya', icon: '⚡', color: '#06b6d4' },
    { index: 6, label: '24h Mavzu', icon: '🎨', color: '#ec4899' },
    { index: 7, label: '500 MT!', icon: '🌟', color: '#eab308' },
];

export default function WheelPage() {
    const router = useRouter();
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [prize, setPrize] = useState<any>(null);
    const [error, setError] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [isFree, setIsFree] = useState(true);

    useEffect(() => {
        fetch('/api/student/wallet')
            .then(r => r.json())
            .then(d => setBalance(d.balance ?? 0));
    }, []);

    const handleSpin = async () => {
        if (spinning) return;
        setError('');
        setPrize(null);
        setSpinning(true);

        try {
            const res = await fetch('/api/student/wheel/spin', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Spin amalga oshmadi');
                setSpinning(false);
                return;
            }

            const sectorIndex = data.sectorIndex;
            const numSectors = SECTORS.length;
            const sectorAngle = 360 / numSectors;

            // Target rotation so top indicator points to target sector
            const extraSpins = 5 * 360; // 5 full rotations
            const targetSectorAngle = 360 - (sectorIndex * sectorAngle + sectorAngle / 2);
            const finalRotation = rotation + extraSpins + (targetSectorAngle - (rotation % 360));

            // Sound tick loop during spin
            const startRot = rotation;
            const duration = 4000;
            const startTime = performance.now();
            let lastSectorTick = -1;

            const animateSpin = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                // Ease-out cubic deceleration
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentRot = startRot + (finalRotation - startRot) * easeOut;

                setRotation(currentRot);

                // Calculate current sector under indicator for tick sound
                const currentSector = Math.floor(((360 - (currentRot % 360)) % 360) / sectorAngle);
                if (currentSector !== lastSectorTick) {
                    lastSectorTick = currentSector;
                    soundEngine.playWheelTick();
                }

                if (progress < 1) {
                    requestAnimationFrame(animateSpin);
                } else {
                    setSpinning(false);
                    setPrize(data.prize);
                    if (data.newBalance !== undefined) setBalance(data.newBalance);
                    setIsFree(false);
                    soundEngine.playLevelUp();
                    fireVictoryConfetti();
                }
            };

            requestAnimationFrame(animateSpin);
        } catch {
            setError('Tarmoq xatosi');
            setSpinning(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col items-center min-h-[85vh] justify-between relative z-10">
            {/* Header */}
            <div className="w-full flex items-center justify-between">
                <button
                    onClick={() => router.push('/student/games')}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> O'yinlarga qarash
                </button>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                    <span className="text-xl">🪙</span>
                    <span className="font-black text-lg text-indigo-400">{balance !== null ? balance.toLocaleString() : '...'}</span>
                    <span className="text-xs text-white/50">MT</span>
                </div>
            </div>

            {/* Title */}
            <div className="text-center my-4">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-3">
                    🎡 Omad G'ildiragi
                </h1>
                <p className="text-sm text-white/60 mt-1">Har kuni tekin spin bosing va sovrinlar yutib oling!</p>
            </div>

            {/* 3D Wheel Container */}
            <div className="relative my-6 flex flex-col items-center justify-center">
                {/* Pointer indicator */}
                <div className="absolute -top-6 z-30 flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[32px] border-t-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)]" />
                </div>

                {/* Outer Ring */}
                <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] rounded-full p-4 bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-950 shadow-[0_0_60px_rgba(99,102,241,0.5)] border-4 border-amber-400 relative overflow-hidden flex items-center justify-center">
                    {/* Rotating Wheel */}
                    <div
                        className="w-full h-full rounded-full relative transition-transform"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center center',
                        }}
                    >
                        {SECTORS.map((s, idx) => {
                            const angle = 360 / SECTORS.length;
                            const rotateDeg = idx * angle;
                            return (
                                <div
                                    key={s.index}
                                    className="absolute top-0 left-0 w-full h-full flex justify-center"
                                    style={{
                                        transform: `rotate(${rotateDeg}deg)`,
                                        transformOrigin: '50% 50%',
                                    }}
                                >
                                    <div
                                        className="w-0 h-0 border-l-[66px] sm:border-l-[82px] border-l-transparent border-r-[66px] sm:border-r-[82px] border-r-transparent border-t-[160px] sm:border-t-[200px] origin-bottom flex flex-col items-center justify-start pt-4"
                                        style={{ borderTopColor: s.color }}
                                    >
                                        <div
                                            className="flex flex-col items-center font-black text-white text-xs sm:text-sm tracking-wide transform -translate-y-36 sm:-translate-y-44"
                                            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                                        >
                                            <span className="text-xl sm:text-2xl mb-0.5">{s.icon}</span>
                                            <span>{s.label}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Center Knob */}
                    <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-4 border-white shadow-2xl flex items-center justify-center font-black text-amber-950 text-xl z-20">
                        VOCAB
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                    {error}
                </div>
            )}

            {/* Prize Announcement */}
            {prize && (
                <div className="mb-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center animate-bounce">
                    <span className="text-4xl mb-1 block">🎉</span>
                    <h3 className="text-xl font-black text-emerald-300">Tabriklaymiz!</h3>
                    <p className="text-white font-bold">{prize.label} yutib oldingiz!</p>
                </div>
            )}

            {/* Spin Button */}
            <button
                onClick={handleSpin}
                disabled={spinning}
                className="w-full max-w-xs py-4 font-black text-lg rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-amber-950 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-3"
            >
                {spinning ? (
                    <div className="w-6 h-6 rounded-full border-3 border-amber-950 border-t-transparent animate-spin" />
                ) : (
                    <>
                        <Sparkles className="w-6 h-6" />
                        <span>Aylantirish (Spin)</span>
                    </>
                )}
            </button>
        </div>
    );
}