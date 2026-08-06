'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, XCircle, Award, Calendar, Clock, User, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import CertificateCard, { CertificateData } from '@/components/CertificateCard';

function CertificateVerificationContent() {
    const searchParams = useSearchParams();
    const certId = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [cert, setCert] = useState<CertificateData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (certId) {
            verifyCert(certId);
        } else {
            setLoading(false);
            setError('Sertifikat ID kiritilmagan');
        }
    }, [certId]);

    const verifyCert = async (id: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/certificates/verify?id=${encodeURIComponent(id)}`);
            const data = await res.json();

            if (res.ok && data.isValid) {
                setCert(data.certificate);
            } else {
                setError(data.message || 'Sertifikat haqiqiy emas yoki topilmadi');
            }
        } catch (e) {
            setError('Tekshirishda xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0f] text-white">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-white/60">Sertifikat tekshirilmoqda...</p>
            </div>
        );
    }

    if (error || !cert) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0f] text-white">
                <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center gap-5 border-rose-500/30">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-rose-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white mb-1">Sertifikat Topilmadi</h2>
                        <p className="text-xs text-rose-400 font-bold">{error}</p>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">
                        Kiritilgan sertifikat ID ({certId || '—'}) ma'lumotlar bazasida mavjud emas yoki soxtalashtirilgan bo'lishi mumkin.
                    </p>
                    <Link href="/login" className="btn-base btn-ghost btn-sm mt-2">
                        <ArrowLeft className="w-4 h-4" /> Asosiy sahifaga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-8 flex flex-col items-center gap-8">
            {/* Top Verification Banner */}
            <div className="w-full max-w-5xl bg-emerald-500/10 border border-emerald-500/30 p-4 md:p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-white">RASMIY TASDIQLANGAN SERTIFIKAT</h2>
                            <span className="bg-emerald-500 text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                VERIFIED
                            </span>
                        </div>
                        <p className="text-xs text-emerald-300/80 mt-0.5">
                            Ushbu sertifikat MT-Vocab ta'lim platformasi tomonidan rasman berilgan va haqiqiyligi tasdiqlangan.
                        </p>
                    </div>
                </div>

                <Link href="/login" className="btn-base btn-ghost btn-sm whitespace-nowrap shrink-0">
                    MT-Vocab Kirish →
                </Link>
            </div>

            {/* Render Certificate */}
            <CertificateCard cert={cert} showActions={true} />
        </div>
    );
}

export default function VerifyCertificatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        }>
            <CertificateVerificationContent />
        </Suspense>
    );
}
