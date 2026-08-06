'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award, Coins, Sparkles, X, ArrowRight, Download, Eye } from 'lucide-react';
import CertificateCard, { CertificateData } from './CertificateCard';

interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    unitTitle: string;
    totalWords: number;
    certificate: CertificateData;
}

export default function CertificateCelebrationModal({
    isOpen,
    onClose,
    unitTitle,
    totalWords,
    certificate,
}: CelebrationModalProps) {
    const [viewMode, setViewMode] = useState<'celebration' | 'certificate'>('celebration');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setViewMode('celebration');
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
            {/* Glowing Background Radial Effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/25 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/25 rounded-full blur-[120px] pointer-events-none" />

            {viewMode === 'celebration' ? (
                <div className="glass-card max-w-lg w-full p-6 md:p-10 relative z-10 animate-scale-in text-center flex flex-col items-center gap-5 border-indigo-500/40 my-auto shadow-[0_0_80px_rgba(99,102,241,0.3)]">
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Animated Trophy Icon Badge */}
                    <div className="relative">
                        <div className="w-20 md:w-24 h-20 md:h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/20 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.6)] animate-bounce">
                            <Award className="w-10 md:w-12 h-10 md:h-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-black p-1.5 rounded-full shadow-lg">
                            <Sparkles className="w-4 h-4 fill-current" />
                        </div>
                    </div>

                    {/* Header */}
                    <div>
                        <span className="px-3 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            100% Mukammal Yakunlandi! 🎉
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-2">
                            Tabriklaymiz!
                        </h2>
                        <p className="text-white/60 text-xs md:text-sm mt-1.5 max-w-md leading-relaxed">
                            Siz <strong className="text-indigo-400">{unitTitle}</strong> bo'limini muvaffaqiyatli tugatdingiz. Barcha <strong className="text-emerald-400">{totalWords} ta</strong> lug'at so'zi o'zlashtirildi!
                        </p>
                    </div>

                    {/* Rewards Card */}
                    <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left">
                            Siz qo'lga kiritdingiz:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2.5 text-left">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Award className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">🏆 Sertifikat</p>
                                    <p className="text-[9px] text-indigo-300/70 font-mono truncate">ID: {certificate.certId}</p>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-left">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <Coins className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-amber-300">+100 MT Coins</p>
                                    <p className="text-[9px] text-amber-500/70">Mukofot berildi</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
                        <button
                            onClick={() => setViewMode('certificate')}
                            className="btn-base btn-primary btn-md flex-1 text-xs"
                        >
                            <Eye className="w-4 h-4" /> Sertifikatni Ko'rish
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-base btn-ghost btn-md flex-1 text-xs"
                        >
                            Davom Etish <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-4xl relative z-10 my-auto py-4">
                    <button
                        onClick={() => setViewMode('celebration')}
                        className="mb-3 btn-base btn-ghost btn-sm text-xs"
                    >
                        ← Qaytish
                    </button>
                    <CertificateCard cert={certificate} onClose={onClose} showActions={true} />
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
