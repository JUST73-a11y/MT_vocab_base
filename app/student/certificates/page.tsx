'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import { Award, Loader2, Calendar, Clock, ExternalLink, Download, Printer, ShieldCheck, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import CertificateCard, { CertificateData } from '@/components/CertificateCard';
import Link from 'next/link';

export default function MyCertificatesPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [certificates, setCertificates] = useState<CertificateData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (user) {
            fetchCertificates();
        }
    }, [user, authLoading, router]);

    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/api/smartlex/certificates');
            setCertificates(data || []);
        } catch (error) {
            console.error('Error loading certificates:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="page-container flex flex-col gap-8 animate-fade-in py-8">
            {/* Header */}
            <div className="page-header flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-2">
                        <Award className="w-3.5 h-3.5" /> Sertifikatlar Kolleksiyasi
                    </div>
                    <h1 className="page-title">Mening Sertifikatlarim</h1>
                    <p className="page-subtitle">Siz 100% muvaffaqiyatli yakunlagan barcha lug'at bo'limlari uchun rasmiy sertifikatlar</p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        Jami: <strong className="text-indigo-400 font-black">{certificates.length} ta</strong>
                    </span>
                </div>
            </div>

            {/* Certificates List / Empty State */}
            {certificates.length === 0 ? (
                <div className="empty-state card py-16">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                        <Award className="w-10 h-10 text-indigo-400/50" />
                    </div>
                    <h3 className="empty-state-title text-2xl font-black text-white">Hozircha sertifikatlar yo'q</h3>
                    <p className="empty-state-desc max-w-md">
                        Lug'at bo'limlaridagi barcha so'zlarni 100% o'zlashtirib va 8 ta o'quv bosqichini yakunlab rasmiy sertifikat hamda +100 MT Coins mukofotini qo'lga kiriting!
                    </p>
                    <Link href="/student/dashboard" className="btn-base btn-primary btn-md mt-4">
                        <BookOpen className="w-4 h-4" /> Bo'limlarni O'rganish
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map((cert) => (
                        <div
                            key={cert.certId}
                            className="glass-card p-6 flex flex-col justify-between gap-6 group hover:-translate-y-1 transition-all duration-300 border-indigo-500/20 hover:border-indigo-500/40 relative overflow-hidden"
                        >
                            {/* Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

                            {/* Top Card Info */}
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                        <Award className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <span className="badge badge-success flex items-center gap-1 text-[10px] font-black uppercase">
                                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                    </span>
                                </div>

                                <div>
                                    <h3 className="font-black text-lg text-white leading-snug line-clamp-2">
                                        {cert.unitTitle}
                                    </h3>
                                    <p className="text-xs text-white/40 mt-1 font-mono">
                                        ID: <span className="text-indigo-300 font-bold">{cert.certId}</span>
                                    </p>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between text-xs text-white/60">
                                        <span className="flex items-center gap-1.5 text-white/40">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Sana:
                                        </span>
                                        <span className="font-bold text-white">
                                            {cert.completionDate || new Date(cert.earnedAt!).toLocaleDateString('uz-UZ')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-white/60">
                                        <span className="flex items-center gap-1.5 text-white/40">
                                            <Clock className="w-3.5 h-3.5 text-emerald-400" /> O'rganish vaqti:
                                        </span>
                                        <span className="font-bold text-emerald-400">
                                            {cert.formattedLearningTime || '2 Soat 36 Daqiqa'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 relative z-10">
                                <button
                                    onClick={() => setSelectedCert(cert)}
                                    className="btn-base btn-primary btn-sm w-full"
                                >
                                    <Award className="w-4 h-4" /> Ko'rish
                                </button>
                                <a
                                    href={`/verify-certificate?id=${cert.certId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-base btn-ghost btn-sm w-full flex items-center justify-center gap-1 text-xs"
                                >
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Tekshirish
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for viewing certificate */}
            {mounted && selectedCert && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
                    <div className="w-full max-w-4xl relative z-10 my-auto py-4">
                        <button
                            onClick={() => setSelectedCert(null)}
                            className="mb-3 btn-base btn-ghost btn-sm text-xs"
                        >
                            ← Qaytish
                        </button>
                        <CertificateCard cert={selectedCert} onClose={() => setSelectedCert(null)} showActions={true} />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
