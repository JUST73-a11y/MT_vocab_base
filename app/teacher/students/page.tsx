'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    Users, Loader2, Search, Settings2, CheckCircle2, XCircle,
    Copy, Check, FolderOpen, ChevronRight, ChevronDown,
    Coins, BarChart2, Info, Target, TrendingUp, GraduationCap, AlertCircle, Trash2, UserPlus, AlertTriangle
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

interface MistakeWord {
    _id: string;
    studentId: string;
    wordId: {
        _id: string;
        englishWord: string;
        uzbekTranslation: string;
        phonetic?: string;
    };
    unitId?: string;
    wrongCount: number;
    lastWrongAt: string;
    isLearned: boolean;
    createdAt: string;
}

export default function TeacherStudentsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const unitId = searchParams.get('unitId');

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

    // Mistakes Modal
    const [mistakesStudent, setMistakesStudent] = useState<Student | null>(null);
    const [studentMistakes, setStudentMistakes] = useState<MistakeWord[]>([]);
    const [loadingMistakes, setLoadingMistakes] = useState(false);

    // Create Student Modal
    const [showCreateStudent, setShowCreateStudent] = useState(false);
    const [createStudentGroups, setCreateStudentGroups] = useState<{_id: string; name: string}[]>([]);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentGroupId, setNewStudentGroupId] = useState('');
    const [creatingStudent, setCreatingStudent] = useState(false);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }
        if (user) loadData(unitId);
    }, [user, loading, router, unitId]);

    useEffect(() => {
        setFilteredStudents(
            students.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, students]);

    const loadData = async (targetUnitId?: string | null) => {
        setLoadingData(true);
        try {
            const url = targetUnitId ? `/api/teacher/students?unitId=${targetUnitId}` : '/api/teacher/students';
            const [sRes, uData, catData, gRes] = await Promise.all([
                apiFetch(url),
                getUnits(user?.id),
                apiFetch('/api/teacher/categories/tree').catch(() => []),
                apiFetch('/api/teacher/groups').catch(() => []),
            ]);
            setStudents(sRes);
            setFilteredStudents(sRes);
            setUnits(uData);
            setCategoriesTree(catData || []);
            setCreateStudentGroups(gRes || []);
        } catch (error) {
        } finally {
            setLoadingData(false);
        }
    };

    const handleClearFilter = () => {
        router.push('/teacher/students');
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

    const openMistakesModal = async (student: Student) => {
        setMistakesStudent(student);
        setStudentMistakes([]);
        setLoadingMistakes(true);
        try {
            const data = await apiFetch(`/api/teacher/students/${student._id}/mistakes`);
            setStudentMistakes(data.mistakes || []);
        } catch (error: any) {
            
            toast.error(error.message || 'Xatoliklarni yuklashda muammo yuz berdi');
        } finally {
            setLoadingMistakes(false);
        }
    };

    const handleDeleteMistake = async (mistakeId: string) => {
        if (!mistakesStudent) return;

        // Optimistic delete
        const prevMistakes = [...studentMistakes];
        setStudentMistakes(prev => prev.filter(m => m._id !== mistakeId));

        try {
            await apiFetch(`/api/teacher/students/${mistakesStudent._id}/mistakes/${mistakeId}`, {
                method: 'DELETE',
            });
            toast.success("Xato o'chirildi");
        } catch (error: any) {
            
            toast.error(error.message || "Xatolik yuz berdi");
            // Revert optimism on error
            setStudentMistakes(prevMistakes);
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
        <div className="page-container flex flex-col gap-8 animate-fade-in">

            {/* ── Header ── */}
            <div className="page-header flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl bg-[#0a1226]/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div>
                    <h1 className="page-title text-white drop-shadow-md">Studentlar</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <p className="page-subtitle text-white/70 font-medium">{students.length} o&apos;quvchi ro&apos;yxatda</p>
                        {unitId && (
                            <>
                                <span className="text-white/30">•</span>
                                <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-fade-in">
                                    <span>Unit bo'yicha filtrlangan</span>
                                    <button onClick={handleClearFilter} className="hover:text-white transition-colors ml-1" title="Filtrni tozalash">
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="input-group relative" style={{width:'240px'}}>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" style={{width:'18px',height:'18px'}} />
                        <input
                            type="text"
                            placeholder="Ism yoki email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 font-semibold focus:border-indigo-500 focus:bg-white/15 outline-none transition-all shadow-inner"
                            style={{padding: '0.875rem 1rem 0.875rem 2.75rem', height: '48px'}}
                        />
                    </div>
                    {/* Create Student */}
                    <button
                        onClick={() => setShowCreateStudent(true)}
                        className="btn-base btn-secondary"
                    >
                        <UserPlus style={{width:'16px',height:'16px'}} /> Yangi Talaba
                    </button>
                    {/* Teacher code */}
                    <div className="flex items-center gap-2 px-4 rounded-xl"
                        style={{height:'var(--btn-md)',background:'rgba(255,255,255,0.04)',border:'1px solid var(--border-default)'}}>
                        <span className="text-xs font-bold" style={{color:'var(--text-muted)'}}>Kod:</span>
                        <code className="text-sm font-black" style={{color:'var(--color-primary)'}}>{user.teacherCode || '—'}</code>
                        <button onClick={handleCopyCode} className="transition-colors" style={{color:'var(--text-muted)'}}>
                            {copied ? <Check style={{width:'16px',height:'16px',color:'var(--color-accent)'}} /> : <Copy style={{width:'16px',height:'16px'}} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            {loadingData ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin" style={{color:'var(--color-primary)'}} />
                </div>
            ) : (
                <div className="card" style={{padding:0,overflow:'hidden'}}>
                    <div style={{overflowX:'auto'}}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{paddingLeft:'24px'}}>Student</th>
                                    <th>Oxirgi faollik</th>
                                    <th>Ro&apos;yxatdan o&apos;tgan</th>
                                    <th style={{paddingRight:'24px',textAlign:'right'}}>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="empty-state">
                                                <div className="empty-state-icon"><Users style={{width:'24px',height:'24px'}} /></div>
                                                <p className="empty-state-title">Natija topilmadi</p>
                                                <p className="empty-state-desc">{searchTerm ? `"${searchTerm}" bo'yicha hech narsa topilmadi` : 'Studentlar mavjud emas'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStudents.map(student => (
                                    <tr key={student._id}>
                                        <td style={{paddingLeft:'24px',minWidth:'200px'}}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                                                    style={{background:'linear-gradient(135deg,#6366f1,#a855f7)',color:'#fff'}}>
                                                    {student.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{minWidth:0}}>
                                                    <p className="font-bold text-sm truncate" style={{color:'var(--text-primary)'}} title={student.name}>{student.name}</p>
                                                    <p className="text-xs truncate" style={{color:'var(--text-muted)'}} title={student.email}>{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{color:'var(--text-secondary)',fontSize:'13px',whiteSpace:'nowrap'}}>
                                            {student.lastLoginAt ? new Date(student.lastLoginAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td style={{color:'var(--text-secondary)',fontSize:'13px',whiteSpace:'nowrap'}}>
                                            {new Date(student.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{paddingRight:'24px'}}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openRedeemModal(student)}
                                                    className="px-3 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-yellow-500/20 transition-all flex items-center gap-1">
                                                    <Coins className="w-3 h-3" /> Coin
                                                </button>
                                                <button
                                                    onClick={() => openMistakesModal(student)}
                                                    className="px-3 py-1 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-500/20 transition-all flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" /> Xatolar
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

            {mounted && mistakesStudent && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-2xl rounded-3xl p-8 flex flex-col gap-6 max-h-[90vh] overflow-hidden"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(225,29,72,0.2)' }}>
                        <header className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-rose-400"
                                    style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.3)' }}>
                                    <AlertCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">Xatolar</h2>
                                    <p className="text-sm text-rose-400 font-bold">{mistakesStudent.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setMistakesStudent(null)} className="p-2 text-white/20 hover:text-white transition-colors">
                                <XCircle className="w-8 h-8" />
                            </button>
                        </header>

                        <div className="flex-grow overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                            {loadingMistakes ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                                </div>
                            ) : studentMistakes.length === 0 ? (
                                <p className="text-center py-10 text-white/40 font-black uppercase tracking-widest">
                                    Bu studentda hozircha xatolar yo&apos;q
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {studentMistakes.map(mistake => (
                                        <div key={mistake._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all hover:bg-white/5"
                                            style={{
                                                background: mistake.isLearned ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
                                                borderColor: mistake.isLearned ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'
                                            }}>
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-lg font-black text-white truncate">{mistake.wordId?.englishWord || '?'}</p>
                                                    {mistake.wordId?.phonetic && (
                                                        <span className="text-xs font-mono text-white/40">[{mistake.wordId.phonetic}]</span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-white/60 truncate">{mistake.wordId?.uzbekTranslation || '?'}</p>
                                                <p className="text-[10px] text-white/30 mt-2 font-bold uppercase">
                                                    Oxirgi marta: {new Date(mistake.lastWrongAt).toLocaleDateString()}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 mt-4 sm:mt-0 shrink-0">
                                                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/20 min-w-[60px]">
                                                    <span className="text-xs text-rose-400 font-bold uppercase tracking-wider mb-0.5">Xato</span>
                                                    <span className="text-xl font-black text-rose-500">{mistake.wrongCount}x</span>
                                                </div>

                                                {mistake.isLearned ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20">
                                                        <CheckCircle2 className="w-4 h-4" /> Yodlangan
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-xs font-bold border border-rose-500/20">
                                                        <AlertCircle className="w-4 h-4" /> Yodlanmagan
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteMistake(mistake._id)}
                                                    className="p-2 ml-1 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="O'chirish"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <footer className="pt-6 border-t border-white/5">
                            <button onClick={() => setMistakesStudent(null)}
                                className="w-full py-4 rounded-2xl font-black text-white/50 hover:text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Yopish
                            </button>
                        </footer>
                    </div>
                </div>,
                document.body
            )}
            {/* ── Create Student Modal ── */}
            {mounted && showCreateStudent && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="max-w-md w-full p-8 flex flex-col gap-6 rounded-[2rem]"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <header>
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                <UserPlus className="w-6 h-6 text-indigo-400" /> Yangi Talaba Yaratish
                            </h2>
                            <p className="text-sm text-white/40 font-medium mt-1">Talaba Gmail va ismi yetarli</p>
                        </header>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!newStudentName.trim() || !newStudentEmail.trim()) return;
                                setCreatingStudent(true);
                                try {
                                    await apiFetch('/api/teacher/students/create', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            name: newStudentName,
                                            email: newStudentEmail,
                                            groupId: newStudentGroupId || undefined,
                                        }),
                                    });
                                    toast.success(`${newStudentName} muvaffaqiyatli yaratildi!`);
                                    setShowCreateStudent(false);
                                    setNewStudentName('');
                                    setNewStudentEmail('');
                                    setNewStudentGroupId('');
                                    loadData();
                                } catch (err: any) {
                                    toast.error(err.message || 'Xatolik yuz berdi');
                                } finally {
                                    setCreatingStudent(false);
                                }
                            }}
                            className="space-y-4"
                        >
                            <input
                                type="text"
                                value={newStudentName}
                                onChange={e => setNewStudentName(e.target.value)}
                                placeholder="To'liq ism (masalan, Ali Karimov)"
                                className="w-full rounded-2xl px-5 py-4 bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                                autoFocus
                                required
                            />
                            <input
                                type="email"
                                value={newStudentEmail}
                                onChange={e => setNewStudentEmail(e.target.value)}
                                placeholder="Gmail manzili (masalan, ali@gmail.com)"
                                className="w-full rounded-2xl px-5 py-4 bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                                required
                            />
                            <select
                                value={newStudentGroupId}
                                onChange={e => setNewStudentGroupId(e.target.value)}
                                className="w-full rounded-2xl px-5 py-4 bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                            >
                                <option value="" className="bg-gray-900">— Guruhni tanlang (ixtiyoriy) —</option>
                                {createStudentGroups.map((g: any) => (
                                    <option key={g._id || g.id} value={g._id || g.id} className="bg-gray-900">{g.name}</option>
                                ))}
                            </select>
                            <div className="p-4 rounded-xl text-xs text-white/40 font-bold space-y-1"
                                style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                                <p>ℹ️ Talaba birinchi marta Gmail manzili bilan kirganda parol o'rnatishga yo'naltiriladi.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreateStudent(false)}
                                    className="py-4 rounded-2xl font-black text-white/40 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    Bekor
                                </button>
                                <button type="submit" disabled={creatingStudent}
                                    className="btn-premium py-4">
                                    {creatingStudent ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yaratish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
