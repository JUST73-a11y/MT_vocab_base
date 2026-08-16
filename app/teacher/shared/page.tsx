'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Share2, Loader2, ArrowUpRight, CheckCircle2, XCircle, Clock, Trash2, BookOpen, Folder, User, ChevronDown, ChevronRight } from 'lucide-react';
import { getUnits } from '@/lib/firestore';
import { Unit } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';
import { useCategoryTree } from '@/lib/useCategoryTree';
import { motion, AnimatePresence } from 'framer-motion';
import ShareModal from '@/components/teacher/ShareModal';
import toast from 'react-hot-toast';

interface Share {
    _id: string;
    unitId: { _id: string, title: string, category: string };
    fromTeacherId: { _id: string, name: string, email: string };
    toTeacherId: { _id: string, name: string, email: string };
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';
    targetCategoryId?: string;
    createdAt: string;
}

type TabType = 'incoming' | 'outgoing' | 'accepted';

export default function TeacherSharedPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [incomingShares, setIncomingShares] = useState<Share[]>([]);
    const [outgoingShares, setOutgoingShares] = useState<Share[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('incoming');
    const [showShareModal, setShowShareModal] = useState(false);
    const [acceptingAll, setAcceptingAll] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    const toggleFolder = (folderKey: string) => setExpandedFolders(p => ({ ...p, [folderKey]: !p[folderKey] }));

    const { tree: categoriesTree } = useCategoryTree(user?.id);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }
        if (user) loadData();
    }, [user, loading, router]);

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [inRes, outRes, uData] = await Promise.all([
                apiFetch('/api/teacher/shares?type=incoming'),
                apiFetch('/api/teacher/shares?type=outgoing'),
                getUnits(user?.id)
            ]);
            setIncomingShares(inRes);
            setOutgoingShares(outRes);
            setUnits(uData);
        } catch (error) {
        } finally {
            setLoadingData(false);
        }
    };

    // Hammasini qabul qilish — bulk accept, sender nomi bilan papka avtomatik yaratiladi
    const handleAcceptAll = async () => {
        setAcceptingAll(true);
        try {
            const res = await apiFetch('/api/teacher/shares/bulk-accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            }) as any;
            toast.success(res.message || `${res.accepted} ta unit qabul qilindi`);
            await loadData();
            setActiveTab('accepted');
        } catch (error: any) {
            toast.error(error.message || 'Xatolik yuz berdi');
        } finally {
            setAcceptingAll(false);
        }
    };

    // Bitta share rad etish
    const handleReject = async (shareId: string) => {
        setRejectingId(shareId);
        try {
            await apiFetch(`/api/teacher/shares/${shareId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'REJECTED' }),
            });
            toast.success("Rad etildi");
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Xatolik yuz berdi');
        } finally {
            setRejectingId(null);
        }
    };

    // Outgoing shareni bekor qilish
    const handleRevoke = async (shareId: string) => {
        try {
            await apiFetch(`/api/teacher/shares/${shareId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'REVOKED' }),
            });
            toast.success("Bekor qilindi");
            await loadData();
        } catch (error: any) {
            toast.error(error.message || 'Xatolik yuz berdi');
        }
    };

    if (loading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const myUnits = units.filter(u => u.createdBy === user?.id);
    const pendingIncoming = incomingShares.filter(s => s.status === 'PENDING');
    const acceptedIncoming = incomingShares.filter(s => s.status === 'ACCEPTED');

    const groupedIncoming = pendingIncoming.reduce((acc, share) => {
        const senderId = share.fromTeacherId._id;
        const senderName = share.fromTeacherId.name;
        const categoryName = share.unitId.category || 'Asosiy (Kategoriyasiz)';

        if (!acc[senderId]) {
            acc[senderId] = { senderName, totalUnits: 0, categories: {} };
        }
        if (!acc[senderId].categories[categoryName]) {
            acc[senderId].categories[categoryName] = [];
        }
        
        acc[senderId].categories[categoryName].push(share);
        acc[senderId].totalUnits++;
        return acc;
    }, {} as Record<string, { senderName: string, totalUnits: number, categories: Record<string, Share[]> }>);

    return (
        <div className="min-h-screen flex flex-col items-center bg-transparent p-6 md:p-10">
            <div className="max-w-4xl w-full animate-fade-in flex flex-col gap-10">

                {/* ── Header ── */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8"
                    style={{
                        background: 'var(--theme-card-bg, rgba(15,20,35,0.45))',
                        backdropFilter: 'var(--theme-card-blur, blur(16px))',
                        WebkitBackdropFilter: 'var(--theme-card-blur, blur(16px))',
                        border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                        borderRadius: 'var(--theme-radius-card, 20px)',
                        boxShadow: 'var(--theme-shadow-card, none)',
                    }}>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Unit Ulashish</h1>
                        <p className="text-white/60 font-bold mt-1 uppercase tracking-widest text-[10px]">Hamkasblar bilan materiallar almashish</p>
                    </div>
                    <button onClick={() => setShowShareModal(true)} className="btn-base btn-primary px-8 py-4 h-auto text-sm">
                        <Share2 className="w-5 h-5 shrink-0" /> Unit Ulashish
                    </button>
                </header>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                        borderRadius: 'var(--theme-radius-card, 16px)'
                    }}>
                    <button
                        onClick={() => setActiveTab('incoming')}
                        className="flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all"
                        style={{
                            borderRadius: 'var(--theme-radius-btn, 12px)',
                            background: activeTab === 'incoming' ? 'var(--theme-primary, #6366f1)' : 'transparent',
                            color: activeTab === 'incoming' ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        }}
                    >
                        Kiruvchi
                        {pendingIncoming.length > 0 && (
                            <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingIncoming.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('outgoing')}
                        className="flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all"
                        style={{
                            borderRadius: 'var(--theme-radius-btn, 12px)',
                            background: activeTab === 'outgoing' ? 'var(--theme-primary, #6366f1)' : 'transparent',
                            color: activeTab === 'outgoing' ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        }}
                    >
                        Chiquvchi
                    </button>
                    <button
                        onClick={() => setActiveTab('accepted')}
                        className="flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all"
                        style={{
                            borderRadius: 'var(--theme-radius-btn, 12px)',
                            background: activeTab === 'accepted' ? '#10b981' : 'transparent',
                            color: activeTab === 'accepted' ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        }}
                    >
                        Qabul Qilingan
                    </button>
                </div>

                {loadingData ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Ma&apos;lumotlar yuklanmoqda...</p>
                    </div>
                ) : (
                    <div className="grid gap-6">

                        {/* ── Tab: INCOMING ── */}
                        {activeTab === 'incoming' && (
                            <section className="space-y-4 animate-fade-in">
                                {pendingIncoming.length === 0 ? (
                                    <div className="glass-card p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                                        Yangi so&apos;rovlar yo&apos;q
                                    </div>
                                ) : (
                                    <>
                                        {/* Hammasini qabul qilish tugmasi */}
                                        <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-500/20 bg-emerald-500/[0.03]">
                                            <div>
                                                <p className="text-sm font-black text-white">
                                                    {pendingIncoming.length} ta yangi so&apos;rov
                                                </p>
                                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
                                                    Qabul qilinganda, sender nomi bilan papka avtomatik yaratiladi
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleAcceptAll}
                                                disabled={acceptingAll}
                                                className="shrink-0 px-6 py-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {acceptingAll
                                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Qabul qilinmoqda...</>
                                                    : <><CheckCircle2 className="w-4 h-4" /> Hammasini qabul qilish</>
                                                }
                                            </button>
                                        </div>

                                        {/* Har bir share -> Grouped by Sender/Folder */}
                                        <div className="flex flex-col gap-6">
                                            {Object.entries(groupedIncoming).map(([senderId, senderData]) => (
                                                <div key={senderId} className="glass-card overflow-hidden">
                                                    {/* Sender Header */}
                                                    <div className="p-5 flex items-center gap-4 bg-indigo-500/10 border-b border-indigo-500/20">
                                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                            <User className="w-5 h-5 text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <h2 className="text-xl font-black text-white">{senderData.senderName}</h2>
                                                            <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-[0.2em]">{senderData.totalUnits} ta unit yubordi</p>
                                                        </div>
                                                    </div>

                                                    {/* Folders List */}
                                                    <div className="p-4 flex flex-col gap-3">
                                                        {Object.entries(senderData.categories).map(([catName, shares]) => {
                                                            const folderKey = `${senderId}_${catName}`;
                                                            const isExpanded = expandedFolders[folderKey];
                                                            return (
                                                                <div key={catName} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all duration-300">
                                                                    <button 
                                                                        onClick={() => toggleFolder(folderKey)}
                                                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.05] transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                                                <Folder className="w-4 h-4 text-amber-500" />
                                                                            </div>
                                                                            <span className="text-sm font-black text-white text-left">{catName}</span>
                                                                            <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[10px] font-black text-white/50">{shares.length}</span>
                                                                        </div>
                                                                        <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                                                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                                                                        </div>
                                                                    </button>

                                                                    <AnimatePresence>
                                                                        {isExpanded && (
                                                                            <motion.div 
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: "auto", opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                className="border-t border-white/5 bg-black/20"
                                                                            >
                                                                                <div className="p-2 space-y-1">
                                                                                    {shares.map(share => (
                                                                                        <div key={share._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 hover:bg-white/[0.05] transition-colors rounded-lg group">
                                                                                            <div className="flex items-center gap-3 pl-2">
                                                                                                <BookOpen className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                                                                                                <p className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">{share.unitId.title}</p>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); handleReject(share._id); }}
                                                                                                disabled={rejectingId === share._id}
                                                                                                className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 sm:ml-auto w-fit"
                                                                                            >
                                                                                                {rejectingId === share._id ? '...' : 'Rad etish'}
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </section>
                        )}

                        {/* ── Tab: OUTGOING ── */}
                        {activeTab === 'outgoing' && (
                            <section className="space-y-4 animate-fade-in">
                                {outgoingShares.length === 0 ? (
                                    <div className="glass-card p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                                        Hali hech narsa ulashmadingiz
                                    </div>
                                ) : (
                                    outgoingShares.map(share => (
                                        <div key={share._id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-indigo-500">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                    <ArrowUpRight className="w-6 h-6 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white leading-tight">{share.unitId.title}</h3>
                                                    <p className="text-sm text-white/40 font-medium">Kimgа: {share.toTeacherId.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/20">
                                                    {share.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-400" />}
                                                    {share.status === 'ACCEPTED' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                                    {share.status === 'REJECTED' && <XCircle className="w-3 h-3 text-red-400" />}
                                                    {share.status}
                                                </div>
                                                {share.status !== 'REVOKED' && (
                                                    <button onClick={() => handleRevoke(share._id)} className="p-2 text-white/10 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </section>
                        )}

                        {/* ── Tab: ACCEPTED ── */}
                        {activeTab === 'accepted' && (
                            <section className="space-y-4 animate-fade-in">
                                {acceptedIncoming.length === 0 ? (
                                    <div className="glass-card p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                                        Qabul qilingan materiallar yo&apos;q
                                    </div>
                                ) : (
                                    acceptedIncoming.map(share => (
                                        <div key={share._id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-emerald-500">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white leading-tight">{share.unitId.title}</h3>
                                                    <p className="text-sm text-white/40 font-medium">Kimdan: {share.fromTeacherId.name}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/practice/${share.unitId._id}`)}
                                                className="px-6 py-3 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                                            >
                                                Ochish
                                            </button>
                                        </div>
                                    ))
                                )}
                            </section>
                        )}
                    </div>
                )}
            </div>

            {showShareModal && (
                <ShareModal
                    units={myUnits}
                    categoriesTree={categoriesTree}
                    onClose={() => setShowShareModal(false)}
                    onSuccess={loadData}
                />
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
