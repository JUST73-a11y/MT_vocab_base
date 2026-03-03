'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    Users, Loader2, Search, Settings2, CheckCircle2, XCircle,
    Copy, Check, FolderOpen, ChevronRight, ChevronDown,
    Coins, BarChart2, Info, Target, TrendingUp, GraduationCap
} from 'lucide-react';
import { getUnits } from '@/lib/firestore';
import { Unit } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

interface Student {
    _id: string;
    name: string;
    email: string;
    status: 'active' | 'blocked';
    lastLoginAt: string | null;
    createdAt: string;
}

interface CategoryNode {
    _id: string;
    name: string;
    path: string;
    children: CategoryNode[];
}

interface StudentStats {
    wordsSeen: number;
    correct: number;
    accuracy: number;
    unitsPracticed: number;
    coinBalance: number;
    totalWordsSeen: number;
    assignedUnitsCount: number;
    totalTimeSpentSeconds: number;
    todayOnlineSeconds: number;
    sessionsCount: number;
}

const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}s ${m}daq`;
    return `${m}daq`;
};

export default function TeacherStudentsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [copied, setCopied] = useState(false);

    // Access Modal
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentAccess, setStudentAccess] = useState<string[]>([]);
    const [savingAccess, setSavingAccess] = useState(false);

    // Category Tree
    const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
    const [viewMode, setViewMode] = useState<'category' | 'unit'>('category');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Stats Modal
    const [statsStudent, setStatsStudent] = useState<Student | null>(null);
    const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Coin Redeem Modal
    const [redeemStudent, setRedeemStudent] = useState<Student | null>(null);
    const [redeemAmount, setRedeemAmount] = useState('');
    const [redeemReason, setRedeemReason] = useState('');
    const [redeemBalance, setRedeemBalance] = useState<number | null>(null);
    const [redeeming, setRedeeming] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }
        if (user) loadData();
    }, [user, loading, router]);

    useEffect(() => {
        setFilteredStudents(
            students.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, students]);

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [sRes, uData, catData] = await Promise.all([
                apiFetch('/api/teacher/students'),
                getUnits(user?.id),
                apiFetch('/api/teacher/categories/tree').catch(() => [])
            ]);
            setStudents(sRes);
            setFilteredStudents(sRes);
            setUnits(uData);
            setCategoriesTree(catData || []);
        } catch (error) {
            console.error('Failed to load students:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleCopyCode = () => {
        if (!user?.teacherCode) return;
        navigator.clipboard.writeText(user.teacherCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openAccessModal = async (student: Student) => {
        setSelectedStudent(student);
        try {
            const data = await apiFetch(`/api/teacher/students/${student._id}/access`);
            setStudentAccess(data.unitIds || []);
        } catch {
            setStudentAccess([]);
        }
    };

    const openStatsModal = async (student: Student) => {
        setStatsStudent(student);
        setStudentStats(null);
        setLoadingStats(true);
        try {
            const [stats, wallet] = await Promise.all([
                apiFetch(`/api/quiz/student/stats?range=all&studentId=${student._id}`).catch(() => null),
                apiFetch(`/api/teacher/students/${student._id}/wallet/redeem`).catch(() => null),
            ]);
            setStudentStats({
                wordsSeen: stats?.todayWordsSeen ?? 0,
                correct: stats?.correct ?? 0,
                accuracy: stats?.accuracy ?? 0,
                unitsPracticed: stats?.unitsPracticed ?? 0,
                coinBalance: wallet?.balance ?? 0,
                totalWordsSeen: stats?.totalWordsSeen ?? 0,
                assignedUnitsCount: stats?.assignedUnitsCount ?? 0,
                totalTimeSpentSeconds: stats?.totalTimeSpentSeconds ?? 0,
                todayOnlineSeconds: stats?.todayOnlineSeconds ?? 0,
                sessionsCount: stats?.sessionsCount ?? 0,
            });
        } catch { } finally {
            setLoadingStats(false);
        }
    };

    const openRedeemModal = async (student: Student) => {
        setRedeemStudent(student);
        setRedeemAmount('');
        setRedeemReason('');
        setRedeemBalance(null);
        try {
            const wallet = await apiFetch(`/api/teacher/students/${student._id}/wallet/redeem`);
            setRedeemBalance(wallet?.balance ?? 0);
        } catch {
            setRedeemBalance(0);
        }
    };

    const handleRedeem = async () => {
        if (!redeemStudent) return;
        const amt = parseInt(redeemAmount);
        if (!amt || amt <= 0 || !redeemReason.trim()) {
            toast.error("Miqdor va sabab kiritilishi shart");
            return;
        }
        setRedeeming(true);
        try {
            const res = await apiFetch(`/api/teacher/students/${redeemStudent._id}/wallet/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt, reason: redeemReason.trim() }),
            });
            toast.success(`✅ ${amt} MT Coin ayirboshlandi! Yangi balans: ${res.newBalance} 🪙`);
            setRedeemBalance(res.newBalance);
            setRedeemAmount('');
            setRedeemReason('');
            setRedeemStudent(null);
        } catch (err: any) {
            toast.error(err.message || "Xatolik yuz berdi");
        } finally {
            setRedeeming(false);
        }
    };

    const toggleUnitAccess = (unitId: string) => {
        setStudentAccess(prev =>
            prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
        );
    };

    const handleSaveAccess = async () => {
        if (!selectedStudent) return;
        setSavingAccess(true);
        try {
            await apiFetch(`/api/teacher/students/${selectedStudent._id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitIds: studentAccess }),
            });
            openAccessModal(selectedStudent);
            toast.success('Saqlandi');
        } catch (error: any) {
            toast.error(error.message || 'Xatolik yuz berdi');
        } finally {
            setSavingAccess(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Studentlar</h1>
                    <p className="text-gray-400 text-sm mt-0.5">{students.length} o&apos;quvchi ro&apos;yxatda</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Ism yoki email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full sm:w-56 text-gray-900 dark:text-white"
                        />
                    </div>
                    {/* Teacher code */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <span className="text-xs text-gray-500">Kod:</span>
                        <code className="text-sm font-black text-indigo-500">{user.teacherCode || '—'}</code>
                        <button onClick={handleCopyCode} className="text-gray-400 hover:text-indigo-500 transition-colors">
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            {loadingData ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Oxirgi faollik</th>
                                    <th className="px-6 py-4">Ro&apos;yxatdan o&apos;tgan</th>
                                    <th className="px-6 py-4 text-right">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-gray-400">
                                            {searchTerm ? `"${searchTerm}" bo'yicha hech narsa topilmadi` : 'Studentlar mavjud emas'}
                                        </td>
                                    </tr>
                                ) : filteredStudents.map(student => (
                                    <tr key={student._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 min-w-[200px]">
                                            <div className="flex items-center gap-3 w-full min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-gray-900 dark:text-white truncate" title={student.name}>{student.name}</p>
                                                    <p className="text-xs text-gray-500 truncate" title={student.email}>{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {student.lastLoginAt ? new Date(student.lastLoginAt).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(student.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openRedeemModal(student)}
                                                    className="px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-yellow-500/20 transition-all flex items-center gap-1">
                                                    <Coins className="w-3 h-3" /> Coin
                                                </button>
                                                <button
                                                    onClick={() => openStatsModal(student)}
                                                    className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all flex items-center gap-1">
                                                    <BarChart2 className="w-3 h-3" /> Stats
                                                </button>
                                                <button
                                                    onClick={() => openAccessModal(student)}
                                                    className="px-3 py-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all flex items-center gap-1">
                                                    <Settings2 className="w-3 h-3" /> Ruxsat
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {mounted && redeemStudent && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col gap-8 shadow-2xl"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(234,179,8,0.2)' }}>
                        <header className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-amber-400"
                                style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
                                <Coins className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">MT Coin Ayirboshlash</h2>
                                <p className="text-sm text-white/40">{redeemStudent.name}</p>
                            </div>
                            <button onClick={() => setRedeemStudent(null)} className="ml-auto p-2 text-white/20 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </header>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/60 mb-1">Mavjud Balans</p>
                                <p className="text-2xl font-black text-white">
                                    {redeemBalance !== null ? `${redeemBalance} 🪙` : '...'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Ayirboshlash miqdori</label>
                                <input type="number" min={1} value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)}
                                    placeholder="Masalan: 10"
                                    className="w-full rounded-2xl px-5 py-4 text-white font-black text-xl outline-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(234,179,8,0.2)' }} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Sabab / Sovg&apos;a nomi</label>
                                <input type="text" value={redeemReason} onChange={e => setRedeemReason(e.target.value)}
                                    placeholder="Masalan: Daftar, Kitob..."
                                    className="w-full rounded-2xl px-5 py-4 text-white font-bold outline-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setRedeemStudent(null)}
                                className="py-4 rounded-2xl font-black text-white/50 hover:text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Bekor
                            </button>
                            <button onClick={handleRedeem} disabled={redeeming}
                                className="py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                                style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 20px rgba(217,119,6,0.3)' }}>
                                {redeeming ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Coins className="w-4 h-4" /> Ayirboshla</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {mounted && statsStudent && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md rounded-3xl p-8 flex flex-col gap-6"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(16,185,129,0.2)' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-400"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                <BarChart2 className="w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Statistika</h2>
                                <p className="text-sm text-white/40">{statsStudent.name}</p>
                            </div>
                            <button onClick={() => setStatsStudent(null)} className="ml-auto p-2 text-white/20 hover:text-white">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {loadingStats ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            </div>
                        ) : studentStats ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: "Bugun Onlayn", value: formatTime(studentStats.todayOnlineSeconds), color: 'rgba(99,102,241,0.15)', tc: '#818cf8', sub: '' },
                                    { label: "Bugun Yodlagan", value: studentStats.wordsSeen, color: 'rgba(16,185,129,0.15)', tc: '#34d399', sub: 'so\'z' },
                                    { label: "Jami Yodlagan", value: studentStats.totalWordsSeen, color: 'rgba(59,130,246,0.15)', tc: '#60a5fa', sub: 'so\'z' },
                                    { label: "Bo'limlar", value: studentStats.assignedUnitsCount, color: 'rgba(139,92,246,0.15)', tc: '#a78bfa', sub: 'ta unit' },
                                    { label: "Jami Sarflangan Vaqt", value: formatTime(studentStats.totalTimeSpentSeconds), color: 'rgba(234,179,8,0.15)', tc: '#fbbf24', sub: '' },
                                    { label: "Sessiyalar", value: studentStats.sessionsCount, color: 'rgba(244,63,94,0.15)', tc: '#fb7185', sub: 'kun' },
                                ].map(s => (
                                    <div key={s.label} className="rounded-2xl p-4 flex flex-col gap-1 transition-all hover:scale-[1.02]"
                                        style={{ background: s.color, border: `1px solid ${s.tc}30` }}>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{s.label}</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-2xl font-black text-white">{s.value}</p>
                                            {s.sub && <p className="text-[10px] font-bold text-white/30 uppercase">{s.sub}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-white/30 py-10">Ma&apos;lumot topilmadi</p>
                        )}

                        <button onClick={() => setStatsStudent(null)}
                            className="w-full py-4 rounded-2xl font-black text-white/50 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Yopish
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {mounted && selectedStudent && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-2xl rounded-3xl p-8 flex flex-col gap-6 max-h-[90vh] overflow-hidden"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <header className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Kirish Huquqlari</h2>
                                <p className="text-sm text-indigo-400 font-bold">{selectedStudent.name}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-2 text-white/20 hover:text-white transition-colors">
                                <XCircle className="w-8 h-8" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto pr-2 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                            <div className="flex items-center gap-2 p-4 rounded-2xl"
                                style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                                <p className="text-xs text-indigo-300 font-medium leading-relaxed">
                                    Quyidagi unitlardan studentga to&apos;g&apos;ridan-to&apos;g&apos;ri ruxsat bering.
                                </p>
                            </div>

                            {units.length === 0 ? (
                                <p className="text-center py-10 text-white/20 font-black uppercase tracking-widest">Unitlar mavjud emas</p>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setStudentAccess(units.map(u => u.id))}
                                            className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                                            Barchasini tanlash
                                        </button>
                                        <button onClick={() => setStudentAccess([])}
                                            className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                                            Barchasini o&apos;chirish
                                        </button>
                                    </div>
                                    <div className="flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        <button onClick={() => setViewMode('category')}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'category' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>
                                            Papka
                                        </button>
                                        <button onClick={() => setViewMode('unit')}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'unit' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>
                                            Ro&apos;yxat
                                        </button>
                                    </div>

                                    {viewMode === 'category' ? (() => {
                                        const renderTree = (nodes: CategoryNode[], depth = 0): React.ReactNode =>
                                            nodes.map(node => {
                                                const isExpanded = expandedCategories.includes(node._id);
                                                const catUnits = units.filter(u => u.categoryId === node._id);
                                                const getAllIds = (n: CategoryNode): string[] => {
                                                    let ids = units.filter(u => u.categoryId === n._id).map(u => u.id);
                                                    n.children?.forEach(c => { ids = [...ids, ...getAllIds(c)]; });
                                                    return ids;
                                                };
                                                const nestedIds = getAllIds(node);
                                                const allSel = nestedIds.length > 0 && nestedIds.every(id => studentAccess.includes(id));
                                                const someSel = nestedIds.length > 0 && nestedIds.some(id => studentAccess.includes(id));
                                                return (
                                                    <div key={node._id} style={{ marginLeft: depth > 0 ? 16 : 0 }} className="mt-2">
                                                        <div className="flex items-center justify-between p-3 rounded-xl transition-colors"
                                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => setExpandedCategories(p => p.includes(node._id) ? p.filter(id => id !== node._id) : [...p, node._id])}
                                                                    className="p-1 rounded-md hover:bg-white/20 text-white/40 hover:text-white">
                                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                </button>
                                                                <FolderOpen className="w-5 h-5 text-indigo-400" />
                                                                <span className="font-bold text-sm text-white">{node.name}</span>
                                                                <span className="text-[10px] text-white/30">({nestedIds.length})</span>
                                                            </div>
                                                            <button
                                                                onClick={() => allSel ? setStudentAccess(p => p.filter(id => !nestedIds.includes(id))) : setStudentAccess(p => Array.from(new Set([...p, ...nestedIds])))}
                                                                disabled={nestedIds.length === 0}
                                                                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg ${allSel ? 'bg-indigo-500 text-white' : someSel ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
                                                                {allSel ? '✓ Ruxsat' : someSel ? '~ Qisman' : 'Ruxsat'}
                                                            </button>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="ml-4 pl-4 border-l border-white/10 mt-2 space-y-2">
                                                                {renderTree(node.children, depth + 1)}
                                                                {catUnits.map(unit => {
                                                                    const has = studentAccess.includes(unit.id);
                                                                    return (
                                                                        <button key={unit.id} onClick={() => toggleUnitAccess(unit.id)}
                                                                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${has ? 'text-white' : 'text-white/40 hover:text-white'}`}
                                                                            style={{ background: has ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', borderColor: has ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)' }}>
                                                                            <span className="text-xs font-bold">{unit.title}</span>
                                                                            {has ? <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-white/10 shrink-0" />}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        return <div className="space-y-1">{categoriesTree.length > 0 ? renderTree(categoriesTree) : <p className="text-center py-4 text-white/20 text-xs">Kategoriyalar yo&apos;q</p>}</div>;
                                    })() : (
                                        Object.entries(units.reduce((acc, unit) => {
                                            const cat = unit.category || 'Boshqa';
                                            if (!acc[cat]) acc[cat] = [];
                                            acc[cat].push(unit);
                                            return acc;
                                        }, {} as Record<string, Unit[]>)).map(([category, catUnits]) => (
                                            <div key={category} className="space-y-3">
                                                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />{category}
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {catUnits.map(unit => {
                                                        const has = studentAccess.includes(unit.id);
                                                        return (
                                                            <button key={unit.id} onClick={() => toggleUnitAccess(unit.id)}
                                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${has ? 'text-white' : 'text-white/40 hover:text-white'}`}
                                                                style={{ background: has ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)', borderColor: has ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)' }}>
                                                                <p className="text-sm font-black truncate max-w-[150px] text-left">{unit.title}</p>
                                                                {has ? <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-white/10 shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>

                        <footer className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                            <button onClick={() => setSelectedStudent(null)}
                                className="py-4 rounded-2xl font-black text-white/50 hover:text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Bekor qilish
                            </button>
                            <button onClick={handleSaveAccess} disabled={savingAccess}
                                className="py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
                                {savingAccess ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Saqlash'}
                            </button>
                        </footer>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
