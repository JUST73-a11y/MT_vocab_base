'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Share2, Loader2, Plus, ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, Clock, Trash2, BookOpen, Search } from 'lucide-react';
import { getUnits } from '@/lib/firestore';
import { Unit } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';

interface Share {
    _id: string;
    unitId: { _id: string, title: string, category: string };
    fromTeacherId: { _id: string, name: string, email: string };
    toTeacherId: { _id: string, name: string, email: string };
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';
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

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareTargetCode, setShareTargetCode] = useState('');
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [sharing, setSharing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
            console.error('Failed to load shares:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleBulkShare = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUnitIds.length === 0 || !shareTargetCode.trim()) return;
        setSharing(true);
        try {
            const data = await apiFetch('/api/teacher/unit-shares/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitIds: selectedUnitIds, toTeacherCode: shareTargetCode }),
            });

            setShowShareModal(false);
            setShareTargetCode('');
            setSelectedUnitIds([]);
            loadData();
            alert(data.message); // Todo: replace with toast
        } catch (error: any) {
            console.error('Failed to share:', error);
            alert(error.message || 'Xatolik yuz berdi');
        } finally {
            setSharing(false);
        }
    };

    const handleStatusUpdate = async (shareId: string, status: string) => {
        try {
            await apiFetch(`/api/teacher/shares/${shareId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            loadData(); // Refetch explicitly 
        } catch (error: any) {
            console.error('Failed to update share status:', error);
            alert(error.message || 'Xatolik yuz berdi');
        }
    };

    const toggleUnitSelection = (id: string) => {
        setSelectedUnitIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    if (loading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const filteredUnits = units.filter(u => u.title.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filtrlar
    const pendingIncoming = incomingShares.filter(s => s.status === 'PENDING');
    const acceptedIncoming = incomingShares.filter(s => s.status === 'ACCEPTED');

    return (
        <div className="min-h-screen flex flex-col items-center bg-transparent p-6 md:p-10">
            <div className="max-w-4xl w-full animate-fade-in flex flex-col gap-10">

                {/* ── Header ── */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Unit Ulashish</h1>
                        <p className="text-white/40 font-bold mt-1 uppercase tracking-widest text-[10px]">Hamkasblar bilan materiallar almashish</p>
                    </div>
                    <button onClick={() => setShowShareModal(true)} className="btn-premium px-8 py-4 h-auto text-sm">
                        <Share2 className="w-5 h-5" /> Unit Ulashish
                    </button>
                </header>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('incoming')}
                        className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'incoming' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Kiruvchi
                        {pendingIncoming.length > 0 && (
                            <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingIncoming.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('outgoing')}
                        className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'outgoing' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Chiquvchi
                    </button>
                    <button
                        onClick={() => setActiveTab('accepted')}
                        className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'accepted' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Qabul Qilingan
                    </button>
                </div>

                {loadingData ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Ma'lumotlar yuklanmoqda...</p>
                    </div>
                ) : (
                    <div className="grid gap-6">

                        {/* ── Tab: INCOMING ── */}
                        {activeTab === 'incoming' && (
                            <section className="space-y-4 animate-fade-in">
                                {pendingIncoming.length === 0 ? (
                                    <div className="glass-card p-12 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">
                                        Yangi so'rovlar yo'q
                                    </div>
                                ) : (
                                    pendingIncoming.map(share => (
                                        <div key={share._id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-amber-500">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                    <BookOpen className="w-6 h-6 text-amber-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-white leading-tight">{share.unitId.title}</h3>
                                                    <p className="text-sm text-white/40 font-medium">Kimdan: {share.fromTeacherId.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => handleStatusUpdate(share._id, 'REJECTED')} className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Rad etish</button>
                                                <button onClick={() => handleStatusUpdate(share._id, 'ACCEPTED')} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Qabul qilish</button>
                                            </div>
                                        </div>
                                    ))
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
                                                    <button onClick={() => handleStatusUpdate(share._id, 'REVOKED')} className="p-2 text-white/10 hover:text-red-400 transition-colors">
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
                                        Qabul qilingan materiallar yo'q
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

            {/* ── Bulk Share Modal ── */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card max-w-2xl w-full p-8 flex flex-col gap-8 max-h-[90vh] overflow-hidden">
                        <header className="flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Materiallarni Ulashish</h2>
                                <p className="text-sm text-white/40 font-medium hover:text-white transition-colors">Hamkasbingiz bilan bo'lishmoqchi bo'lgan unitlarni tanlang</p>
                            </div>
                            <button onClick={() => setShowShareModal(false)} className="p-2 text-white/20 hover:text-white transition-colors">
                                <XCircle className="w-8 h-8" />
                            </button>
                        </header>

                        <form onSubmit={handleBulkShare} className="flex flex-col gap-6 flex-grow overflow-hidden">
                            {/* Teacher Code Input */}
                            <div className="shrink-0 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Qabul Qiluvchi Kodi</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareTargetCode}
                                        onChange={e => setShareTargetCode(e.target.value.toUpperCase())}
                                        placeholder="T-XXXXXX"
                                        className="w-full h-12 bg-black/20 border border-white/5 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Unit Selection */}
                            <div className="flex flex-col flex-grow overflow-hidden space-y-3">
                                <div className="flex gap-2 shrink-0">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder="Unit qidirish..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:border-indigo-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center px-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold font-mono">
                                        {selectedUnitIds.length} tanlangan
                                    </div>
                                </div>

                                <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow space-y-2">
                                    {filteredUnits.length === 0 ? (
                                        <p className="text-center py-6 text-white/20 text-xs font-bold uppercase tracking-widest">Unitlar topilmadi</p>
                                    ) : (
                                        filteredUnits.map(unit => {
                                            const isSelected = selectedUnitIds.includes(unit.id);
                                            return (
                                                <button
                                                    key={unit.id}
                                                    type="button"
                                                    onClick={() => toggleUnitSelection(unit.id)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${isSelected
                                                        ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="flex-1 truncate pr-4">
                                                        <p className="text-sm font-black truncate">{unit.title}</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{unit.category}</p>
                                                    </div>
                                                    {isSelected ? <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> : <div className="w-5 h-5 rounded-md border-2 border-white/10 shrink-0" />}
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <footer className="pt-4 border-t border-white/5 shrink-0">
                                <button
                                    type="submit"
                                    disabled={sharing || selectedUnitIds.length === 0 || !shareTargetCode}
                                    className="btn-premium w-full h-14"
                                >
                                    {sharing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yuborish'}
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
