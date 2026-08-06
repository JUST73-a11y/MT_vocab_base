'use client';

import React, { useRef } from 'react';
import { Award, CheckCircle2, Calendar, Clock, ShieldCheck, Download, Printer, ExternalLink, Sparkles, Target } from 'lucide-react';

export interface CertificateData {
    certId: string;
    studentName: string;
    groupName?: string;
    teacherName?: string;
    unitTitle: string;
    completionDate?: string;
    completionTime?: string;
    formattedLearningTime?: string;
    activeLearningTimeSeconds?: number;
    accuracyPercentage?: number;
    totalWords?: number;
    status?: string;
    earnedAt?: string | Date;
}

interface CertificateCardProps {
    cert: CertificateData;
    onClose?: () => void;
    showActions?: boolean;
}

export default function CertificateCard({ cert, onClose, showActions = true }: CertificateCardProps) {
    const certRef = useRef<HTMLDivElement>(null);

    const formattedDate = cert.completionDate || (cert.earnedAt ? new Date(cert.earnedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '06 August, 2026');
    const learningTime = cert.formattedLearningTime || '2 Hours 10 Minutes';
    const accuracy = cert.accuracyPercentage || 98;

    // Clean unit display name (e.g. "UNIT 3" or "UNIT 5")
    let rawTitle = (cert.unitTitle || 'Unit 3').trim();
    let unitBadgeText = rawTitle.toUpperCase();
    if (!unitBadgeText.startsWith('UNIT') && !unitBadgeText.startsWith("BO'LIM")) {
        unitBadgeText = `UNIT ${unitBadgeText}`;
    }

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
            
            if (!certRef.current) return;
            
            const canvas = await html2canvas(certRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });
            
            const imgWidth = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`MT-Vocab_Certificate_${cert.certId}.pdf`);
        } catch (e) {
            console.error('PDF download error:', e);
            window.print();
        }
    };

    const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-certificate?id=${cert.certId}` : `/verify-certificate?id=${cert.certId}`;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-5xl mx-auto my-auto font-sans">
            {/* Action Bar (Top) */}
            {showActions && (
                <div className="flex items-center justify-between w-full print:hidden bg-[#0F1E4D] p-3 md:p-4 rounded-2xl border border-white/10 flex-wrap gap-3 shadow-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#315EFB]/20 border border-[#315EFB]/40 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5 text-[#315EFB]" />
                        </div>
                        <div>
                            <p className="font-black text-white text-xs md:text-sm flex items-center gap-2">
                                <span>{cert.unitTitle}</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">VERIFIED CERTIFICATE</span>
                            </p>
                            <p className="text-[10px] md:text-xs text-white/50 font-mono">ID: {cert.certId}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleDownloadPDF}
                            className="btn-base btn-primary btn-sm text-xs"
                        >
                            <Download className="w-3.5 h-3.5" /> PDF Yuklab Olish
                        </button>
                        <button
                            onClick={handlePrint}
                            className="btn-base btn-secondary btn-sm text-xs"
                        >
                            <Printer className="w-3.5 h-3.5" /> Chop Etish
                        </button>
                        <a
                            href={verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-base btn-ghost btn-sm text-xs"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Tekshirish
                        </a>
                    </div>
                </div>
            )}

            {/* Ultra-Luxury Certificate Outer Canvas (A4 Aspect 1.414:1) */}
            <div
                ref={certRef}
                className="certificate-print-container relative w-full aspect-[1.414/1] bg-gradient-to-br from-[#f8fafc] via-[#ffffff] to-[#eef6ff] text-[#0F1E4D] rounded-[1.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden p-6 md:p-10 border-4 md:border-[6px] border-[#0F1E4D] flex flex-col justify-between select-none"
                style={{
                    boxShadow: '0 25px 60px -15px rgba(15, 30, 77, 0.25), inset 0 0 0 3px #D4AF37',
                }}
            >
                {/* Metallic Gold Inner Frame Border */}
                <div className="absolute inset-3 md:inset-4 border border-[#D4AF37]/60 rounded-[1.2rem] md:rounded-[1.6rem] pointer-events-none z-10" />

                {/* Corner Metallic Flourishes */}
                <div className="absolute top-4 left-4 z-20 pointer-events-none text-[#D4AF37]">
                    <svg viewBox="0 0 40 40" fill="currentColor" className="w-6 h-6">
                        <path d="M0 0 L15 0 L0 15 Z" />
                        <circle cx="8" cy="8" r="2" fill="#D4AF37" />
                    </svg>
                </div>
                <div className="absolute top-4 right-4 z-20 pointer-events-none text-[#D4AF37]">
                    <svg viewBox="0 0 40 40" fill="currentColor" className="w-6 h-6 transform rotate-90">
                        <path d="M0 0 L15 0 L0 15 Z" />
                        <circle cx="8" cy="8" r="2" fill="#D4AF37" />
                    </svg>
                </div>
                <div className="absolute bottom-4 left-4 z-20 pointer-events-none text-[#D4AF37]">
                    <svg viewBox="0 0 40 40" fill="currentColor" className="w-6 h-6 transform -rotate-90">
                        <path d="M0 0 L15 0 L0 15 Z" />
                        <circle cx="8" cy="8" r="2" fill="#D4AF37" />
                    </svg>
                </div>
                <div className="absolute bottom-4 right-4 z-20 pointer-events-none text-[#D4AF37]">
                    <svg viewBox="0 0 40 40" fill="currentColor" className="w-6 h-6 transform rotate-180">
                        <path d="M0 0 L15 0 L0 15 Z" />
                        <circle cx="8" cy="8" r="2" fill="#D4AF37" />
                    </svg>
                </div>

                {/* Subtle Abstract Wave Vector Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden z-0">
                    <svg viewBox="0 0 1000 700" fill="none" className="w-full h-full">
                        <path d="M-100 600 C 200 400, 400 700, 1100 300 L 1100 700 L -100 700 Z" fill="url(#waveGrad1)" opacity="0.15" />
                        <path d="M-100 650 C 300 500, 600 650, 1100 450 L 1100 700 L -100 700 Z" fill="url(#waveGrad2)" opacity="0.25" />
                        <path d="M0 100 C 300 200, 700 0, 1000 150" stroke="#315EFB" strokeWidth="0.8" opacity="0.2" fill="none" />
                        <path d="M0 120 C 350 220, 650 20, 1000 170" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" fill="none" />
                        <defs>
                            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#315EFB" />
                                <stop offset="100%" stopColor="#D4AF37" />
                            </linearGradient>
                            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#EEF6FF" />
                                <stop offset="100%" stopColor="#315EFB" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* Tiny Gold Sparkles & Stars */}
                <div className="absolute top-8 left-12 pointer-events-none text-xs text-[#D4AF37] opacity-60">✦</div>
                <div className="absolute top-16 right-16 pointer-events-none text-base text-[#D4AF37] opacity-70">★</div>
                <div className="absolute bottom-20 left-16 pointer-events-none text-sm text-[#D4AF37] opacity-50">✦</div>
                <div className="absolute bottom-24 right-20 pointer-events-none text-xs text-[#315EFB] opacity-40">✦</div>

                {/* TOP CENTER: Luxury Academic Emblem & Header */}
                <div className="relative z-20 text-center mt-1">
                    <div className="inline-flex flex-col items-center justify-center mb-1">
                        {/* Gold Graduation Cap + Open Book Icon */}
                        <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-[#D4AF37]">
                            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full filter drop-shadow">
                                <path d="M50 15 L90 35 L50 55 L10 35 Z" fill="#D4AF37" />
                                <path d="M25 43.5 L25 65 C25 70, 75 70, 75 65 L75 43.5 L50 56 Z" fill="#B8860B" />
                                <path d="M85 37.5 L85 62 L81 62 L81 37.5 Z" fill="#D4AF37" />
                                <circle cx="83" cy="65" r="3" fill="#D4AF37" />
                                <path d="M20 72 Q 50 62 50 78 Q 50 62 80 72 L 80 82 Q 50 72 50 88 Q 50 72 20 82 Z" fill="#0F1E4D" opacity="0.9" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F1E4D] uppercase leading-none font-serif"
                        style={{ fontFamily: 'Times New Roman, Georgia, serif', letterSpacing: '0.04em' }}>
                        CERTIFICATE OF COMPLETION
                    </h1>

                    <div className="flex items-center justify-center gap-3 mt-2">
                        <div className="h-[1px] w-12 md:w-20 bg-gradient-to-r from-transparent to-[#D4AF37]" />
                        <p className="text-[10px] md:text-xs font-bold text-[#315EFB] uppercase tracking-[0.25em]">
                            PRESENTED WITH PRIDE TO
                        </p>
                        <div className="h-[1px] w-12 md:w-20 bg-gradient-to-l from-transparent to-[#D4AF37]" />
                    </div>
                </div>

                {/* CENTER FOCUS: Student Name + Gold Laurel Wreaths */}
                <div className="relative z-20 text-center my-1 md:my-2 flex flex-col items-center justify-center">
                    <div className="relative flex items-center justify-center gap-4 md:gap-8 w-full max-w-3xl">
                        
                        {/* Left Gold Laurel Branch */}
                        <div className="w-12 md:w-16 h-20 md:h-24 shrink-0 text-[#D4AF37] opacity-90 hidden sm:block">
                            <svg viewBox="0 0 100 160" fill="currentColor" className="w-full h-full">
                                <path d="M50 150 C 40 110, 20 70, 45 10 C 25 35, 10 75, 40 120 Z" />
                                <path d="M42 135 C 20 125, 10 105, 30 95 C 40 110, 40 125, 42 135 Z" />
                                <path d="M38 105 C 10 95, 5 70, 25 65 C 35 80, 35 95, 38 105 Z" />
                                <path d="M35 75 C 10 60, 5 35, 25 35 C 32 50, 32 65, 35 75 Z" />
                                <path d="M38 45 C 20 25, 15 10, 35 10 C 40 25, 38 35, 38 45 Z" />
                                <path d="M48 140 C 60 120, 55 95, 46 80 C 58 95, 55 125, 48 140 Z" />
                                <path d="M44 100 C 55 80, 50 60, 42 45 C 54 60, 50 85, 44 100 Z" />
                            </svg>
                        </div>

                        {/* Student Name */}
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-[#0F1E4D] tracking-tight font-sans text-center">
                            {cert.studentName}
                        </h2>

                        {/* Right Gold Laurel Branch */}
                        <div className="w-12 md:w-16 h-20 md:h-24 shrink-0 text-[#D4AF37] opacity-90 hidden sm:block transform scale-x-[-1]">
                            <svg viewBox="0 0 100 160" fill="currentColor" className="w-full h-full">
                                <path d="M50 150 C 40 110, 20 70, 45 10 C 25 35, 10 75, 40 120 Z" />
                                <path d="M42 135 C 20 125, 10 105, 30 95 C 40 110, 40 125, 42 135 Z" />
                                <path d="M38 105 C 10 95, 5 70, 25 65 C 35 80, 35 95, 38 105 Z" />
                                <path d="M35 75 C 10 60, 5 35, 25 35 C 32 50, 32 65, 35 75 Z" />
                                <path d="M38 45 C 20 25, 15 10, 35 10 C 40 25, 38 35, 38 45 Z" />
                                <path d="M48 140 C 60 120, 55 95, 46 80 C 58 95, 55 125, 48 140 Z" />
                                <path d="M44 100 C 55 80, 50 60, 42 45 C 54 60, 50 85, 44 100 Z" />
                            </svg>
                        </div>

                    </div>

                    {/* Soft Gold Underline Below Name */}
                    <div className="w-48 md:w-72 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mt-1 mb-2 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#D4AF37]" />
                    </div>

                    {/* MOVED LOWER (PASTROQQA): Small Rounded Premium Blue Badge */}
                    <div className="my-1.5 flex items-center justify-center">
                        <span className="bg-[#315EFB] text-white px-4 py-1 rounded-full font-black text-xs md:text-sm tracking-widest uppercase shadow-md shadow-[#315EFB]/30 shrink-0 border border-white/20">
                            {unitBadgeText}
                        </span>
                    </div>

                    {/* Body Text */}
                    <p className="text-[11px] md:text-xs text-[#334155] font-medium max-w-xl mx-auto text-center leading-relaxed mt-1">
                        Awarded for successfully mastering 100% of the vocabulary and completing all learning requirements with outstanding dedication, consistency, and excellent performance throughout the course.
                    </p>

                    {/* Motivational Quote */}
                    <p className="text-[10px] md:text-[11px] font-bold text-[#315EFB] tracking-wide mt-1.5 italic text-center">
                        Keep learning. Keep growing. Your future starts today.
                    </p>
                </div>

                {/* BOTTOM SECTION: 3 Columns (Glassmorphism Stats Card | Gold VERIFIED Medal | Signature) */}
                <div className="relative z-20 grid grid-cols-12 items-end pt-3 border-t border-[#315EFB]/15 gap-2">

                    {/* BOTTOM LEFT: Premium Glassmorphism Statistics Card */}
                    <div className="col-span-4 text-left bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-[#315EFB]/20 shadow-lg space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#334155]">
                            <Calendar className="w-3.5 h-3.5 text-[#315EFB] shrink-0" />
                            <span>DATE: <strong className="text-[#0F1E4D] font-extrabold">{formattedDate}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#334155]">
                            <Clock className="w-3.5 h-3.5 text-[#315EFB] shrink-0" />
                            <span>STUDY TIME: <strong className="text-[#0F1E4D] font-extrabold">{learningTime}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#334155]">
                            <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>ACCURACY: <strong className="text-emerald-700 font-extrabold">{accuracy}%</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#64748b]">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#315EFB] shrink-0" />
                            <span>CERTIFICATE ID: <strong className="text-[#0F1E4D] font-mono font-bold">{cert.certId}</strong></span>
                        </div>
                    </div>

                    {/* BOTTOM CENTER: Large Premium Embossed Gold VERIFIED Medal */}
                    <div className="col-span-4 flex flex-col items-center justify-center relative">
                        <div className="relative flex flex-col items-center justify-center">
                            {/* Deep Navy Ribbons Hanging Below Medal */}
                            <div className="absolute top-10 flex gap-2 z-0">
                                <div className="w-5 h-12 bg-[#0F1E4D] transform -rotate-12 rounded-b-sm border-r border-[#D4AF37]" />
                                <div className="w-5 h-12 bg-[#0F1E4D] transform rotate-12 rounded-b-sm border-l border-[#D4AF37]" />
                            </div>

                            {/* Luxury 3D Gold Medal Circle */}
                            <div className="relative z-10 w-16 md:w-20 h-16 md:h-20 rounded-full bg-gradient-to-br from-[#FFE58F] via-[#D4AF37] to-[#996515] border-4 border-[#FFF5C0] shadow-xl flex flex-col items-center justify-center text-center p-1"
                                style={{ boxShadow: '0 10px 25px rgba(212, 175, 55, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.8)' }}>
                                {/* Inner Embossed Ring */}
                                <div className="w-full h-full rounded-full border-2 border-dashed border-[#85580F]/40 flex flex-col items-center justify-center p-1 bg-gradient-to-tr from-[#E5C158] to-[#FDF0A6]">
                                    {/* Crown */}
                                    <span className="text-[10px] text-[#734A08] leading-none font-black">👑</span>
                                    {/* Stars */}
                                    <span className="text-[8px] text-[#734A08] tracking-widest leading-none my-0.5">★★★</span>
                                    {/* VERIFIED Text */}
                                    <span className="text-[10px] md:text-xs font-black tracking-widest text-[#4A2E00] uppercase leading-none drop-shadow-sm">
                                        VERIFIED
                                    </span>
                                    {/* Bottom Stars */}
                                    <span className="text-[8px] text-[#734A08] tracking-widest leading-none mt-0.5">★★★</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM RIGHT: Handwritten Signature (justAli + LEAD INSTRUCTOR) */}
                    <div className="col-span-4 flex flex-col items-end text-right">
                        <div className="flex flex-col items-center">
                            {/* Elegant Cursive Handwritten Signature */}
                            <div className="font-serif italic text-2xl md:text-3xl font-bold text-[#0F1E4D] tracking-wide mb-1 leading-none"
                                style={{ fontFamily: 'Brush Script MT, cursive, Georgia, serif' }}>
                                justAli
                            </div>

                            {/* Luxury Signature Underline Line */}
                            <div className="w-28 md:w-36 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mb-1" />

                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#315EFB] flex items-center gap-1">
                                <span className="text-[#D4AF37]">★</span> LEAD INSTRUCTOR <span className="text-[#D4AF37]">★</span>
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Print CSS styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .certificate-print-container, .certificate-print-container * {
                        visibility: visible;
                    }
                    .certificate-print-container {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: 100vh;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 2rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
