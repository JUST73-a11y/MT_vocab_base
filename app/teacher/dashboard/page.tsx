'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnits } from '@/lib/useUnits';
import { Unit } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import {
    BookOpen, Plus, Loader2, ChevronRight, FolderOpen,
    ArrowLeft, BarChart3, Clock, Users, Copy, Check,
    TrendingUp, Layers, ExternalLink, Trash2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Delete Confirmation Modal ──────────────────────────────────────────────
function DeleteConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    loading = false
}: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card w-full max-w-md p-10 flex flex-col gap-8 relative !bg-gray-950/95 border-red-500/30 shadow-2xl shadow-red-500/20"
            >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{title}</h3>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest leading-relaxed whitespace-pre-wrap">
                        {message}
                    </p>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full py-6 rounded-2xl bg-red-500 hover:bg-red-400 text-black font-[900] uppercase tracking-[0.25em] text-[15px] transition-all active:scale-95 shadow-2xl shadow-red-500/30 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Ha, o\'chirilsin'}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="w-full py-6 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-[900] uppercase tracking-[0.25em] text-[15px] transition-all"
                    >
                        Bekor qilish
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function TeacherDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { units, loading: unitsLoading, refetch } = useUnits(user?.id);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [studentCount, setStudentCount] = useState<number | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        type: 'unit' | 'category';
        id?: string;
        name: string;
    }>({ isOpen: false, type: 'unit', name: '' });
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'teacher')) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch student count
    useEffect(() => {
        if (user?.role === 'teacher') {
            apiFetch('/api/teacher/students')
                .then((data: any) => setStudentCount(Array.isArray(data) ? data.length : 0))
                .catch(() => setStudentCount(0));
        }
    }, [user]);

    const handleCopy = useCallback(() => {
        if (!user?.teacherCode) return;
        navigator.clipboard.writeText(user.teacherCode);
        setCopied(true);
        toast.success('Teacher kodi nusxalandi!');
        setTimeout(() => setCopied(false), 2000);
    }, [user?.teacherCode]);

    const handleDelete = async () => {
        if (!deleteModal.name) return;
        setDeleting(true);
        try {
            const body = deleteModal.type === 'category'
                ? { categoryName: deleteModal.name, cascade: true }
                : { unitIds: [deleteModal.id] };

            const res = await fetch('/api/teacher/units/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error('O\'chirishda xatolik yuz berdi');

            toast.success(deleteModal.type === 'category'
                ? `"${deleteModal.name}" kategoriyasi va uning barcha unitlari o'chirildi`
                : `"${deleteModal.name}" uniti o'chirildi`);

            if (deleteModal.type === 'category') setSelectedCategory(null);
            refetch(true); // Force absolute baseline refresh
            setDeleteModal({ ...deleteModal, isOpen: false });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
        }
    };

    // Group by category
    const grouped = units.reduce((acc, unit) => {
        const cat = unit.category?.trim() || 'Kategoriyasiz';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(unit);
        return acc;
    }, {} as Record<string, Unit[]>);

    const categories = Object.entries(grouped).sort(([a], [b]) => {
        if (a === 'Kategoriyasiz') return 1;
        if (b === 'Kategoriyasiz') return -1;
        return a.localeCompare(b);
    });

    const unitsInSelected = selectedCategory ? (grouped[selectedCategory] || []) : [];

    if (authLoading || !user) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const stats = [
        {
            label: 'Jami Unitlar',
            value: unitsLoading ? '...' : units.length,
            icon: BookOpen,
            color: 'indigo',
            href: '/teacher/units',
            gradient: 'from-indigo-500/20 to-indigo-600/5',
            border: 'border-indigo-500/20',
            iconColor: 'text-indigo-400',
            glow: 'shadow-indigo-500/20',
        },
        {
            label: 'Kategoriyalar',
            value: unitsLoading ? '...' : categories.length,
            icon: Layers,
            color: 'purple',
            href: '/teacher/units',
            gradient: 'from-purple-500/20 to-purple-600/5',
            border: 'border-purple-500/20',
            iconColor: 'text-purple-400',
            glow: 'shadow-purple-500/20',
        },
        {
            label: 'Talabalar',
            value: studentCount === null ? '...' : studentCount,
            icon: Users,
            color: 'emerald',
            href: '/teacher/students',
            gradient: 'from-emerald-500/20 to-emerald-600/5',
            border: 'border-emerald-500/20',
            iconColor: 'text-emerald-400',
            glow: 'shadow-emerald-500/20',
        },
        {
            label: 'Oxirgi Unit',
            value: unitsLoading ? '...' : (units.length > 0 ? units[0].title : '—'),
            isText: true,
            icon: Clock,
            color: 'amber',
            href: units.length > 0 ? `/teacher/units/${units[0].id}` : '/teacher/units',
            gradient: 'from-amber-500/20 to-amber-600/5',
            border: 'border-amber-500/20',
            iconColor: 'text-amber-400',
            glow: 'shadow-amber-500/20',
        },
    ];

    return (
        <div className="min-h-screen text-white">
            <main className="page-container flex flex-col gap-8 animate-fade-in">

                {/* ── Hero Header ── */}
                <header className="relative overflow-hidden rounded-3xl p-8 md:p-10"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 50%, rgba(16,185,129,0.04) 100%)', border: '1px solid rgba(99,102,241,0.15)' }}>

                    {/* Glow orbs */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/8 rounded-full blur-[80px] pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                    <TrendingUp className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Faol</span>
                                </div>
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2 break-words whitespace-normal leading-tight">
                                Salom, {user.name?.split(' ')[0] || 'O\'qituvchi'} 👋
                            </h1>
                            <p className="text-white/40 font-bold uppercase tracking-widest text-[11px]">
                                O'qituvchi boshqaruv paneli
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Teacher Code badge */}
                            {user.teacherCode && (
                                <button onClick={handleCopy}
                                    className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all active:scale-95"
                                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 text-left">Teacher Code</p>
                                        <p className="text-lg font-black text-amber-300 tracking-widest">{user.teacherCode}</p>
                                    </div>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500/20' : 'bg-amber-500/10 group-hover:bg-amber-500/20'}`}>
                                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                                    </div>
                                </button>
                            )}
                            <Link href="/teacher/units/new" className="btn-premium px-6 py-3.5 h-auto text-sm shrink-0">
                                <Plus className="w-5 h-5" /> Yangi Unit
                            </Link>
                        </div>
                    </div>
                </header>

                {/* ── Stats Grid ── */}
                <div className="grid-stats">
                    {stats.map((stat) => (
                        <Link key={stat.label} href={stat.href} className="stat-card">
                            <div
                                className="stat-card-icon"
                                style={{
                                    background: `linear-gradient(135deg, ${stat.gradient.split(' ')[0].replace('from-', '').replace('[', '').replace(']', '')}`,
                                    border: `1px solid ${stat.border}`,
                                }}
                            >
                                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                            </div>
                            <div>
                                <p className="stat-card-label">{stat.label}</p>
                                {stat.isText ? (
                                    <p className="font-black text-white text-lg leading-tight line-clamp-1 mt-1">{stat.value}</p>
                                ) : (
                                    <p className="stat-card-value">{stat.value}</p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>

                {/* ── Quick Actions ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Unitlar',    href: '/teacher/units',    icon: BookOpen,   color: '#818cf8', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.18)' },
                        { label: 'Talabalar',  href: '/teacher/students', icon: Users,      color: '#34d399', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.18)' },
                        { label: 'Guruhlar',   href: '/teacher/groups',   icon: BarChart3,  color: '#c084fc', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.18)' },
                        { label: 'Ulashilgan', href: '/teacher/shared',   icon: TrendingUp, color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.18)' },
                    ].map(({ label, href, icon: Icon, color, bg, border }) => (
                        <Link key={href} href={href}
                            className="card flex items-center gap-3 font-bold text-sm transition-all hover:-translate-y-0.5 group"
                            style={{ padding: '16px' }}>
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                                style={{ background: bg, border: `1px solid ${border}`, color }}
                            >
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                        </Link>
                    ))}
                </div>

                {/* ── Categories / Units Section ── */}
                <div className="flex flex-col gap-5">
                    {/* Section header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                            {selectedCategory && (
                                <button onClick={() => setSelectedCategory(null)}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-white" />
                                </button>
                            )}
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                        {selectedCategory ?? 'Kategoriyalar'}
                                    </h2>
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.8)' }}>
                                        {selectedCategory ? `${unitsInSelected.length} unit` : `${categories.length} ta`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/25">
                                        {selectedCategory ? "Unitlarni boshqarish" : "O'quv yo'nalishlari"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {!selectedCategory ? (
                            <Link href="/teacher/units"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-indigo-400 hover:text-white transition-all group"
                                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                                Barchasini ko'rish
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        ) : (
                            <Link href={`/teacher/units/new?category=${selectedCategory}`}
                                className="btn-premium px-4 py-2.5 h-auto text-xs">
                                <Plus className="w-4 h-4" /> Yangi Unit
                            </Link>
                        )}
                    </div>

                    {unitsLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="rounded-2xl p-5 animate-pulse h-[180px] flex flex-col gap-3"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="flex items-start justify-between">
                                        <div className="w-11 h-11 rounded-2xl bg-white/8" />
                                        <div className="w-10 h-6 rounded-lg bg-white/5" />
                                    </div>
                                    <div className="h-4 bg-white/8 rounded-lg w-4/5 mt-auto" />
                                    <div className="h-3 bg-white/5 rounded-lg w-3/5" />
                                    <div className="h-px bg-white/5 mt-1" />
                                    <div className="h-3 bg-white/5 rounded-lg w-2/5" />
                                </div>
                            ))}
                        </div>
                    ) : units.length === 0 ? (
                        <div className="rounded-3xl p-16 md:p-24 text-center flex flex-col items-center gap-5"
                            style={{ background: 'rgba(99,102,241,0.04)', border: '1px dashed rgba(99,102,241,0.2)' }}>
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/15 to-purple-500/5 border border-indigo-500/20 flex items-center justify-center mx-auto">
                                <BookOpen className="w-10 h-10 text-indigo-400/50" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white mb-2">Birinchi unitni yarating</h3>
                                <p className="text-white/30 text-sm font-medium max-w-xs mx-auto">Talabalaringiz uchun lug'at unitini yaratishni boshlang</p>
                            </div>
                            <Link href="/teacher/units/new" className="btn-premium px-8 py-4 h-auto text-sm">
                                <Plus className="w-5 h-5" /> Boshlash
                            </Link>
                        </div>
                    ) : selectedCategory === null ? (
                        /* ── CATEGORIES GRID ── */
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {categories.map(([cat, catUnits], idx) => {
                                const palettes = [
                                    { from: 'rgba(99,102,241,0.12)', to: 'rgba(99,102,241,0.04)', glow: 'rgba(99,102,241,0.25)', border: 'rgba(99,102,241,0.25)', hborder: 'rgba(99,102,241,0.5)', icon: '#818cf8', badge: 'rgba(99,102,241,0.15)', badgeText: '#a5b4fc' },
                                    { from: 'rgba(168,85,247,0.12)', to: 'rgba(168,85,247,0.04)', glow: 'rgba(168,85,247,0.25)', border: 'rgba(168,85,247,0.25)', hborder: 'rgba(168,85,247,0.5)', icon: '#c084fc', badge: 'rgba(168,85,247,0.15)', badgeText: '#d8b4fe' },
                                    { from: 'rgba(16,185,129,0.12)', to: 'rgba(16,185,129,0.04)', glow: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.25)', hborder: 'rgba(16,185,129,0.5)', icon: '#34d399', badge: 'rgba(16,185,129,0.15)', badgeText: '#6ee7b7' },
                                    { from: 'rgba(245,158,11,0.12)', to: 'rgba(245,158,11,0.04)', glow: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.25)', hborder: 'rgba(245,158,11,0.5)', icon: '#fbbf24', badge: 'rgba(245,158,11,0.15)', badgeText: '#fde68a' },
                                    { from: 'rgba(239,68,68,0.12)', to: 'rgba(239,68,68,0.04)', glow: 'rgba(239,68,68,0.25)', border: 'rgba(239,68,68,0.25)', hborder: 'rgba(239,68,68,0.5)', icon: '#f87171', badge: 'rgba(239,68,68,0.15)', badgeText: '#fca5a5' },
                                ];
                                const p = palettes[idx % palettes.length];
                                return (
                                    <div key={cat} onClick={() => setSelectedCategory(cat)}
                                        className="group relative overflow-hidden rounded-2xl p-5 text-left flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98] cursor-pointer"
                                        style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})`, border: `1px solid ${p.border}`, boxShadow: 'none', transition: 'all 0.3s' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px ${p.glow}`; (e.currentTarget as HTMLElement).style.borderColor = p.hborder; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = p.border; }}>
                                        {/* Glow orb */}
                                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-4 -mt-4 opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none"
                                            style={{ background: p.glow }} />
                                        {/* Header row */}
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
                                                style={{ background: p.badge, border: `1px solid ${p.border}` }}>
                                                <FolderOpen className="w-5 h-5" style={{ color: p.icon }} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteModal({ isOpen: true, type: 'category', name: cat });
                                                    }}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <span className="text-[11px] font-black px-2.5 py-1 rounded-lg"
                                                    style={{ background: p.badge, color: p.badgeText }}>
                                                    {catUnits.length} ta
                                                </span>
                                            </div>
                                        </div>
                                        {/* Title */}
                                        <div className="relative z-10 flex-1">
                                            <h3 className="font-black text-white text-sm leading-snug truncate group-hover:opacity-90 transition-opacity">{cat}</h3>
                                        </div>
                                        {/* Footer */}
                                        <div className="flex items-center gap-1.5 relative z-10 pt-3"
                                            style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.badgeText, opacity: 0.7 }}>Ochish</span>
                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" style={{ color: p.badgeText, opacity: 0.7 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ── UNITS GRID ── */
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {unitsInSelected.map((unit, idx) => (
                                <div key={unit.id} onClick={() => router.push(`/teacher/units/${unit.id}`)}
                                    className="group relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1.5 active:scale-[0.98] cursor-pointer"
                                    style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', boxShadow: 'none', transition: 'all 0.3s' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(99,102,241,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.45)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.15)'; }}>
                                    {/* Glow orb */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/20 rounded-full blur-2xl -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    {/* Icon */}
                                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all relative z-10">
                                        <BookOpen className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    {/* Title */}
                                    <div className="flex-1 relative z-10">
                                        <h3 className="font-black text-white text-sm leading-snug line-clamp-2 group-hover:text-indigo-100 transition-colors">{unit.title}</h3>
                                        <p className="text-[9px] uppercase tracking-widest text-white/20 mt-1.5">
                                            {new Date(unit.createdAt).toLocaleDateString('uz-UZ')}
                                        </p>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-3 relative z-10"
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDeleteModal({ isOpen: true, type: 'unit', id: unit.id, name: unit.title });
                                            }}
                                            className="text-[9px] font-black text-red-400/60 uppercase tracking-widest hover:text-red-400 transition-colors flex items-center gap-1 group/btn"
                                        >
                                            <Trash2 className="w-3 h-3" /> O'chirish
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </div>
                            ))}
                            {/* Add unit card */}
                            <Link href={`/teacher/units/new?category=${selectedCategory}`}
                                className="group relative overflow-hidden rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[180px] transition-all duration-300 hover:-translate-y-1.5"
                                style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.1)', boxShadow: 'none', transition: 'all 0.3s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all">
                                    <Plus className="w-5 h-5 text-white/30 group-hover:text-indigo-300 transition-colors" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-indigo-300/70 transition-colors text-center">Yangi Unit</span>
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                title={deleteModal.type === 'category' ? "Kategoriyani o'chirish" : "Unitni o'chirish"}
                message={deleteModal.type === 'category'
                    ? `"${deleteModal.name}" kategoriyasidagi barcha unitlar doimiy ravishda o'chiriladi. Ushbu amalni bekor qilib bo'lmaydi.`
                    : `"${deleteModal.name}" uniti o'chiriladi. Davom etasizmi?`}
                onConfirm={handleDelete}
                onCancel={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                loading={deleting}
            />
        </div>
    );
}
