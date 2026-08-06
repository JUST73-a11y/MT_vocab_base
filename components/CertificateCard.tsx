'use client';

import React, { useRef } from 'react';
import { Award, CheckCircle2, Calendar, Clock, ShieldCheck, Download, Printer, ExternalLink, Sparkles } from 'lucide-react';

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

    const formattedDate = cert.completionDate || (cert.earnedAt ? new Date(cert.earnedAt).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '06 Avgust 2026');
    const formattedTime = cert.completionTime || (cert.earnedAt ? new Date(cert.earnedAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }) : '21:43');
    const learningTime = cert.formattedLearningTime || '2 Soat 36 Daqiqa';
    const teacherName = cert.teacherName || 'Ustoz';
    const groupName = cert.groupName || 'Tuesday 8:30';

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
            // Fallback to window.print if library unavailable
            window.print();
        }
    };

    const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-certificate?id=${cert.certId}` : `/verify-certificate?id=${cert.certId}`;

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
            {/* Action Bar (Top) */}
            {showActions && (
                <div className="flex items-center justify-between w-full print:hidden bg-[#12121c] p-4 rounded-2xl border border-white/10 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Award className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="font-black text-white text-sm">{cert.unitTitle}</p>
                            <p className="text-xs text-white/40 font-mono">ID: {cert.certId}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleDownloadPDF}
                            className="btn-base btn-primary btn-sm"
                        >
                            <Download className="w-4 h-4" /> PDF Yuklab Olish
                        </button>
                        <button
                            onClick={handlePrint}
                            className="btn-base btn-secondary btn-sm"
                        >
                            <Printer className="w-4 h-4" /> Chop Etish
                        </button>
                        <a
                            href={verifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-base btn-ghost btn-sm"
                        >
                            <ExternalLink className="w-4 h-4 text-emerald-400" /> Tekshirish
                        </a>
                    </div>
                </div>
            )}

            {/* Certificate Outer Container */}
            <div
                ref={certRef}
                className="certificate-print-container relative w-full aspect-[1.414/1] bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-[#e0e7ff] text-[#0f172a] rounded-[2rem] shadow-2xl overflow-hidden p-8 md:p-12 border-8 border-white flex flex-col justify-between select-none"
                style={{
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), inset 0 0 0 4px #818cf8',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
            >
                {/* Background Decorations */}
                {/* Top Right Moon & Girl */}
                <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-90">
                    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
                        {/* Crescent Moon */}
                        <path d="M140 20 C180 60 170 140 100 160 C160 140 170 80 140 20 Z" fill="#fde047" opacity="0.85" />
                        {/* Little Stars */}
                        <path d="M60 40 L63 46 L70 47 L65 52 L66 59 L60 55 L54 59 L55 52 L50 47 L57 46 Z" fill="#facc15" />
                        <path d="M170 110 L172 114 L177 115 L173 118 L174 123 L170 120 L166 123 L167 118 L163 115 L168 114 Z" fill="#facc15" />
                        <path d="M120 170 L122 174 L127 175 L123 178 L124 183 L120 180 L116 183 L117 178 L113 175 L118 174 Z" fill="#facc15" />
                    </svg>
                </div>

                {/* Top Left Math Symbols */}
                <div className="absolute top-6 left-8 pointer-events-none flex gap-4 text-3xl font-black opacity-30 select-none">
                    <span className="text-emerald-500 transform -rotate-12">÷</span>
                    <span className="text-rose-500 transform rotate-12">+</span>
                    <span className="text-amber-500 transform -rotate-6">×</span>
                    <span className="text-indigo-500 transform rotate-6">−</span>
                </div>

                {/* Bottom Left ABC Letters */}
                <div className="absolute bottom-6 left-6 pointer-events-none flex items-end gap-1 font-black opacity-80 select-none">
                    <span className="text-4xl text-amber-500 transform -rotate-12 drop-shadow-md">A</span>
                    <span className="text-5xl text-rose-500 transform rotate-6 drop-shadow-md">B</span>
                    <span className="text-4xl text-emerald-500 transform -rotate-6 drop-shadow-md">C</span>
                </div>

                {/* Bottom Right Astronaut Rocket */}
                <div className="absolute bottom-4 right-6 pointer-events-none opacity-90 w-48 h-48">
                    <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
                        {/* Rocket */}
                        <g transform="rotate(-35 100 100)">
                            <rect x="75" y="40" width="50" height="90" rx="25" fill="#ef4444" />
                            <path d="M75 65 L50 110 L75 105 Z" fill="#dc2626" />
                            <path d="M125 65 L150 110 L125 105 Z" fill="#dc2626" />
                            <circle cx="100" cy="75" r="16" fill="#e0f2fe" stroke="#1e293b" strokeWidth="4" />
                            <circle cx="100" cy="75" r="8" fill="#38bdf8" />
                            {/* Flame */}
                            <path d="M85 130 Q100 170 115 130 Q100 150 85 130 Z" fill="#f59e0b" />
                        </g>
                    </svg>
                </div>

                {/* Header Banner */}
                <div className="relative z-10 text-center mt-2">
                    <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-indigo-700 font-bold text-xs uppercase tracking-[0.25em] mb-2">
                        <Sparkles className="w-3.5 h-3.5" /> Official Certificate of Achievement
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#1e1b4b] uppercase leading-none drop-shadow-sm font-sans"
                        style={{ fontFamily: 'var(--font-fredoka), Inter, sans-serif' }}>
                        CERTIFICATE OF COMPLETION
                    </h1>

                    <p className="text-xs md:text-sm font-bold text-[#4338ca] uppercase tracking-[0.3em] mt-3">
                        THIS CERTIFICATE IS PROUDLY PRESENTED TO
                    </p>
                </div>

                {/* Center Student Name */}
                <div className="relative z-10 text-center my-4">
                    <div className="inline-block relative">
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#0f172a] tracking-tight border-b-4 border-[#6366f1] pb-2 px-8 inline-block drop-shadow-sm font-sans">
                            {cert.studentName}
                        </h2>
                    </div>

                    <p className="text-xs md:text-sm text-[#334155] font-medium max-w-xl mx-auto mt-4 leading-relaxed">
                        For successfully mastering 100% of all vocabulary words and completing all 8 required learning stages in{' '}
                        <strong className="text-[#3730a3] font-black">{cert.unitTitle}</strong> for group{' '}
                        <strong className="text-[#3730a3] font-black">{groupName}</strong> at MT-Vocab Academy.
                    </p>
                </div>

                {/* Details Grid & Seals / Signatures */}
                <div className="relative z-10 grid grid-cols-3 items-end pt-4 border-t border-indigo-200/60">
                    {/* Left: Metadata */}
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569]">
                            <Calendar className="w-3.5 h-3.5 text-[#6366f1]" />
                            <span>Sana: <strong className="text-[#0f172a]">{formattedDate} ({formattedTime})</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#475569]">
                            <Clock className="w-3.5 h-3.5 text-[#6366f1]" />
                            <span>Faol ta'lim vaqti: <strong className="text-[#0f172a]">{learningTime}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#64748b]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ID: <strong className="text-[#0f172a] font-mono">{cert.certId}</strong></span>
                        </div>
                    </div>

                    {/* Center: Gold Star Ribbon Badge */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            {/* Ribbon tails */}
                            <div className="absolute bottom-[-10px] left-3 w-6 h-10 bg-rose-600 transform -rotate-12 rounded-b-md" />
                            <div className="absolute bottom-[-10px] right-3 w-6 h-10 bg-rose-600 transform rotate-12 rounded-b-md" />
                            {/* Circle badge */}
                            <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 border-4 border-amber-200 shadow-lg flex items-center justify-center">
                                <Award className="w-9 h-9 text-amber-900" />
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#059669] mt-2 flex items-center gap-1 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                    </div>

                    {/* Right: Signature Lines & QR Code Placeholder */}
                    <div className="flex items-center justify-end gap-4 text-right">
                        <div className="text-center">
                            <div className="w-28 border-b-2 border-[#334155] mb-1 italic font-serif text-sm font-bold text-[#1e1b4b]">
                                {teacherName}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">O'QITUVCHI</p>
                        </div>
                        
                        {/* QR Code Placeholder */}
                        <div className="w-14 h-14 bg-white p-1 rounded-lg border border-indigo-200 shadow-sm flex flex-col items-center justify-center shrink-0">
                            {/* Simple inline SVG QR placeholder */}
                            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-indigo-900 stroke-current" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="3" height="3" fill="currentColor" />
                                <rect x="18" y="18" width="3" height="3" fill="currentColor" />
                            </svg>
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
                        padding: 2.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
