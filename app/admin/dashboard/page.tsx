'use client';

import { useEffect, useState, Suspense } from 'react';
import { Users, GraduationCap, BookOpen, Clock, Loader2, UserPlus, ListPlus, Plus, LayoutDashboard, KeyRound, X, Shield, TrendingUp, Activity, Eye, EyeOff, Calendar, Timer, Hash, ChevronRight, AlertCircle, Trash2, Ban, Unlock, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

interface AdminStats {
    stats: {
        totalUsers: number;
        teachers: number;
        students: number;
        totalUnits: number;
    };
    recentUsers: any[];
}

function AdminDashboardInner() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<AdminStats | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'units' | 'groups'>((searchParams.get('tab') as any) || 'overview');
    const [allUnits, setAllUnits] = useState<any[]>([]);
    const [allGroups, setAllGroups] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    // Create teacher form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newTeacherCode, setNewTeacherCode] = useState('');
    const [adminSecret, setAdminSecret] = useState('');
    const [creating, setCreating] = useState(false);
    const [createMsg, setCreateMsg] = useState<{ type: 'ok' | 'err', text: string } | null>(null);

    // Reset password state
    const [resetUser, setResetUser] = useState<any>(null);
    const [resetPassword, setResetPassword] = useState('');
    const [resetAdminSecret, setResetAdminSecret] = useState('');
    const [resetting, setResetting] = useState(false);
    const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err', text: string } | null>(null);

    // Student Stats Modal
    const [selectedStudentForStats, setSelectedStudentForStats] = useState<any>(null);
    const [studentSessionStats, setStudentSessionStats] = useState<{
        todayWordsCount: number;
        totalWordsSeen: number;
        totalUnitsStudied: number;
        estimatedTimeSpentSeconds: number;
        todayTimeSpentSeconds: number;
        sessionsCount: number;
        studentName: string;
    } | null>(null);
    const [loadingStudentStats, setLoadingStudentStats] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [editingCodeUserId, setEditingCodeUserId] = useState<string | null>(null);
    const [tempTeacherCode, setTempTeacherCode] = useState('');
    const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);

    useEffect(() => {
        const tab = searchParams.get('tab') as 'overview' | 'users' | 'units' | 'groups';
        if (tab && ['overview', 'users', 'units', 'groups'].includes(tab)) {
            setActiveTab(tab);
        } else {
            setActiveTab('overview');
        }
    }, [searchParams]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchStats();
            fetchUsers();
            fetchAdminUnits();
            fetchAdminGroups();
        }
    }, [user]);

    const fetchAdminGroups = async () => {
        try {
            const res = await fetch('/api/teacher/groups', { cache: 'no-store' });
            if (res.ok) setAllGroups(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAdminUnits = async () => {
        try {
            const res = await fetch('/api/units', { cache: 'no-store' });
            if (res.ok) setAllUnits(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats', { cache: 'no-store' });
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' });
            if (res.ok) setAllUsers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleBlock = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
        setActionLoading(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) setAllUsers(allUsers.map(u => u._id === userId ? { ...u, status: newStatus } : u));
        } catch (e) { console.error(e); }
        finally { setActionLoading(null); }
    };

    const handleDeleteUser = async (userId: string, name: string) => {
        if (!confirm(`"${name}" ni o'chirasizmi? Bu amalni qaytarib bo'lmaydi.`)) return;
        setActionLoading(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            if (res.ok) { setAllUsers(allUsers.filter(u => u._id !== userId)); fetchStats(); }
        } catch (e) { console.error(e); }
        finally { setActionLoading(null); }
    };

    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true); setCreateMsg(null);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    password: newPassword,
                    teacherCode: newTeacherCode,
                    adminSecret
                }),
            });
            const d = await res.json();
            if (!res.ok) { setCreateMsg({ type: 'err', text: d.message || 'Xato!' }); }
            else {
                setCreateMsg({ type: 'ok', text: `✅ "${newName}" o'qituvchi akkaunt yaratildi!` });
                setNewName(''); setNewEmail(''); setNewPassword(''); setNewTeacherCode(''); setAdminSecret('');
                setShowCreateForm(false); fetchUsers(); fetchStats();
            }
        } catch { setCreateMsg({ type: 'err', text: 'Network error' }); }
        finally { setCreating(false); }
    };

    const handleAssignTeacher = async (studentId: string, teacherId: string) => {
        try {
            const res = await fetch(`/api/admin/students/${studentId}/assign-teacher`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId }),
            });
            if (res.ok) {
                setAllUsers(prev => prev.map(u => u._id === studentId ? { ...u, teacherId } : u));
                setAssigningStudentId(null);
            } else {
                const data = await res.json();
                alert(data.message || 'Xato yuz berdi');
            }
        } catch (error) {
            console.error('Failed to assign teacher:', error);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetting(true); setResetMsg(null);
        try {
            const res = await fetch(`/api/admin/users/${resetUser._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword: resetPassword, adminSecret: resetAdminSecret }),
            });
            const d = await res.json();
            if (!res.ok) { setResetMsg({ type: 'err', text: d.message || 'Xato!' }); }
            else {
                setResetMsg({ type: 'ok', text: `✅ "${resetUser.name}" paroli yangilandi!` });
                setTimeout(() => { setResetUser(null); setResetMsg(null); setResetPassword(''); setResetAdminSecret(''); }, 2000);
            }
        } catch { setResetMsg({ type: 'err', text: 'Network error' }); }
        finally { setResetting(false); }
    };

    const handleUpdateTeacherCode = async (userId: string) => {
        if (!tempTeacherCode.trim()) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}/teacher-code`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherCode: tempTeacherCode.toUpperCase().trim() }),
            });
            if (res.ok) {
                setEditingCodeUserId(null);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.message || 'Xato yuz berdi');
            }
        } catch (error) {
            console.error('Failed to update teacher code:', error);
        }
    };

    const handleViewStats = async (student: any) => {
        setSelectedStudentForStats(student);
        setLoadingStudentStats(true);
        setStudentSessionStats(null);
        setStatsError(null);
        try {
            const res = await fetch(`/api/admin/users/${student._id}/stats`);
            const d = await res.json();
            if (!res.ok) { setStatsError(d.message || 'Statistikani yuklab bo\'lmadi'); }
            else { setStudentSessionStats(d); }
        } catch (e) {
            console.error('Stats fetch error:', e);
            setStatsError('Server bilan bog\'lanishda xato');
        } finally {
            setLoadingStudentStats(false);
        }
    };

    const togglePasswordVisibility = (userId: string) => {
        setVisiblePasswords(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'Hech qachon';
        const d = new Date(dateStr);
        return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatTimeSpent = (secs: number) => {
        if (!secs) return '0 daq';
        const m = Math.floor(secs / 60);
        if (m < 60) return `${m} daq`;
        const h = Math.floor(m / 60);
        return `${h}s ${m % 60}daq`;
    };

    const filteredUsers = allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const roleStyles = (role: string) => ({
        teacher: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        student: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    }[role] || 'bg-white/5 text-white/40 border-white/10');

    const avatarGradient = (role: string) => ({
        teacher: 'from-emerald-400 to-teal-600',
        admin: 'from-amber-400 to-orange-600',
        student: 'from-indigo-400 to-violet-600',
    }[role] || 'from-gray-400 to-gray-600');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 py-20 gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Tizimni tayyorlash...</p>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="flex flex-col gap-10 animate-fade-in py-6">

            {/* ── Page Header ── */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Boshqaruv Markazi</h1>
                    <p className="text-white/40 font-bold mt-1 uppercase tracking-widest text-[10px]">Tizim bo'yicha global monitoring</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Barcha tizimlar faol</span>
                </div>
            </header>

            {/* ── Tab Navigation ── */}
            <nav className="flex bg-white/[0.02] p-1.5 rounded-2xl w-fit border border-white/5 backdrop-blur-xl mx-auto">
                <button
                    onClick={() => { setActiveTab('users'); router.push('/admin/dashboard?tab=users'); }}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-3 ${activeTab === 'users'
                        ? 'bg-indigo-500 text-white shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Foydalanuvchilar
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/30'
                        }`}>{allUsers.length}</span>
                </button>
                <button
                    onClick={() => { setActiveTab('units'); router.push('/admin/dashboard?tab=units'); }}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-3 ${activeTab === 'units'
                        ? 'bg-indigo-500 text-white shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Unitlar
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${activeTab === 'units' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/30'
                        }`}>{allUnits.length}</span>
                </button>
                <button
                    onClick={() => { setActiveTab('groups'); router.push('/admin/dashboard?tab=groups'); }}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-3 ${activeTab === 'groups'
                        ? 'bg-indigo-500 text-white shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]'
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Guruhlar
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${activeTab === 'groups' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/30'
                        }`}>{allGroups.length}</span>
                </button>
            </nav>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
                <div className="flex flex-col gap-10">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: "Barcha Foydalanuvchilar", value: data.stats.totalUsers, icon: Users, color: "text-indigo-400", bg: "from-indigo-500/20 to-indigo-600/5", borderColor: "border-indigo-500/20" },
                            { label: "O'qituvchilar", value: data.stats.teachers, icon: Shield, color: "text-emerald-400", bg: "from-emerald-500/20 to-emerald-600/5", borderColor: "border-emerald-500/20" },
                            { label: "O'quvchilar", value: data.stats.students, icon: GraduationCap, color: "text-blue-400", bg: "from-blue-500/20 to-blue-600/5", borderColor: "border-blue-500/20" },
                            { label: "Jami Unitlar", value: data.stats.totalUnits, icon: BookOpen, color: "text-amber-400", bg: "from-amber-500/20 to-amber-600/5", borderColor: "border-amber-500/20", onClick: () => router.push('/teacher/units') },
                        ].map((card) => (
                            <div
                                key={card.label}
                                onClick={card.onClick}
                                className={`glass-card p-10 flex flex-col items-center text-center relative overflow-hidden group transition-all duration-500 ${card.onClick ? 'cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5' : ''}`}
                            >
                                <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-8 ${card.color}`}>
                                    <card.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-5xl font-black text-white tracking-tighter mb-2">{card.value}</h3>
                                <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">{card.label}</p>
                                {card.onClick && <ChevronRight className="absolute right-6 bottom-6 w-5 h-5 text-white/10 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />}
                            </div>
                        ))}
                    </div>

                    {/* Recent & Health Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recently Registered */}
                        <section className="glass-card flex flex-col h-full overflow-hidden">
                            <div className="px-8 py-6 border-b border-white/5 flex flex-col items-center justify-center text-center gap-2 bg-white/[0.01]">
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                    <Activity className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="flex flex-col items-center">
                                    <h2 className="text-lg font-black text-white tracking-tight">So'nggi Ro'yxatdan O'tganlar</h2>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">Oxirgi 6 faol foydalanuvchi</p>
                                </div>
                            </div>
                            <div className="flex-1 divide-y divide-white/5">
                                {data.recentUsers.slice(0, 6).map((u: any) => (
                                    <div key={u._id} className="flex flex-col items-center text-center gap-3 px-8 py-6 hover:bg-white/[0.02] transition-colors group">
                                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarGradient(u.role)} flex items-center justify-center text-white text-xl font-black shadow-lg group-hover:scale-105 transition-transform`}>
                                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-base font-black text-white truncate group-hover:text-indigo-200 transition-colors">{u.name}</p>
                                            <p className="text-[10px] text-white/30 font-bold truncate mt-1 uppercase tracking-widest">{u.email}</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 mt-1">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${roleStyles(u.role)}`}>{u.role}</span>
                                            <span className="text-[9px] font-black text-white/20 bg-white/5 px-2 py-1 rounded-md">{formatDate(u.createdAt)}</span>
                                        </div>
                                    </div>
                                ))}
                                {data.recentUsers.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
                                        <Users className="w-12 h-12 text-white/5 mb-4" />
                                        <p className="text-white/20 font-black uppercase tracking-[0.2em] text-xs">Foydalanuvchi topilmadi</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* System Health */}
                        <section className="glass-card flex flex-col h-full overflow-hidden">
                            <div className="px-8 py-6 border-b border-white/5 flex flex-col items-center justify-center text-center gap-2 bg-white/[0.01]">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex flex-col items-center">
                                    <h2 className="text-lg font-black text-white tracking-tight">Tizim Ishlash Holati</h2>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-0.5">Real-vaqt monitoringi</p>
                                </div>
                            </div>
                            <div className="p-8 flex flex-col gap-6">
                                {[
                                    { label: "Ma'lumotlar Bazasi (MongoDB)", status: "Onlayn", color: "bg-emerald-500" },
                                    { label: "API Server (Next.js)", status: "Onlayn", color: "bg-emerald-500" },
                                    { label: "Autentifikatsiya Xizmati", status: "Onlayn", color: "bg-emerald-500" },
                                ].map(item => (
                                    <div key={item.label} className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors gap-3">
                                        <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{item.label}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{item.status}</span>
                                            <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse`} />
                                        </div>
                                    </div>
                                ))}

                                <div className="grid grid-cols-2 gap-6 mt-4">
                                    <div className="glass-card p-6 text-center border-indigo-500/20 bg-indigo-500/[0.03]">
                                        <p className="text-3xl font-black text-white tracking-tighter">{Math.round((data.stats.students / Math.max(data.stats.totalUsers, 1)) * 100)}%</p>
                                        <p className="text-[9px] font-black text-indigo-400/60 mt-1 uppercase tracking-widest leading-relaxed">O'quvchilarning<br />tizimda ulushi</p>
                                    </div>
                                    <div className="glass-card p-6 text-center border-emerald-500/20 bg-emerald-500/[0.03]">
                                        <p className="text-3xl font-black text-white tracking-tighter">{data.stats.totalUnits}</p>
                                        <p className="text-[9px] font-black text-emerald-400/60 mt-1 uppercase tracking-widest leading-relaxed">Jami mavjud<br />lug'at bo'limlari</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )
            }

            {/* ── UNITS TAB ── */}
            {activeTab === 'units' && (
                <div className="flex flex-col gap-8">
                    {/* Controls Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="relative flex-1 max-w-2xl">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <BookOpen className="w-5 h-5 text-white/20" />
                            </div>
                            <input
                                type="text"
                                placeholder="Unit nomi bilan qidirish..."
                                className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 text-sm font-bold text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Management Table */}
                    <div className="glass-card overflow-hidden w-full">
                        <div className="overflow-x-auto custom-scrollbar min-w-0 w-full">
                            <table className="w-full text-left border-collapse whitespace-nowrap sm:whitespace-normal">
                                <thead>
                                    <tr className="bg-white/[0.03] text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5">
                                        <th className="px-8 py-5 text-center">Unit Nomi</th>
                                        <th className="px-6 py-5 text-center">Kategoriya</th>
                                        <th className="px-6 py-5 text-center">Yaratuvchi</th>
                                        <th className="px-6 py-5 text-center">Holati</th>
                                        <th className="px-8 py-5 text-right">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allUnits.filter(u => u.title.toLowerCase().includes(searchTerm.toLowerCase())).map((u: any) => (
                                        <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col items-center">
                                                    <p className="font-black text-white text-sm truncate group-hover:text-indigo-200 transition-colors">{u.title}</p>
                                                    <p className="text-[10px] text-white/20 font-bold mt-1 uppercase tracking-widest">{formatDate(u.createdAt)}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest">
                                                    {u.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-xs font-bold text-white/60">{u.createdBy?.name || 'User'}</p>
                                                    <p className="text-[10px] text-white/20">{u.createdBy?.email || 'N/A'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                                        Faol
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => router.push(`/teacher/units/${u._id || u.id}`)}
                                                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                                                        title="Ko'rish / Tahrirlash"
                                                    >
                                                        <Eye className="w-4 h-4 text-white/40" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Rostdan ham bu unitni butunlay o\'chirib tashlamoqchimisiz?')) {
                                                                const res = await fetch(`/api/units/${u._id || u.id}`, { method: 'DELETE' });
                                                                if (res.ok) fetchAdminUnits();
                                                            }
                                                        }}
                                                        className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all"
                                                        title="O'chirish"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {allUnits.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-10">
                                                    <BookOpen className="w-16 h-16" />
                                                    <p className="text-xl font-black uppercase tracking-widest">Unitlar topilmadi</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── GROUPS TAB ── */}
            {activeTab === 'groups' && (
                <div className="flex flex-col gap-8">
                    {/* Controls Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="relative flex-1 max-w-2xl">
                            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                <Users className="w-5 h-5 text-white/20" />
                            </div>
                            <input
                                type="text"
                                placeholder="Guruh nomi bilan qidirish..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 text-sm font-bold text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden w-full">
                        <div className="overflow-x-auto custom-scrollbar min-w-0 w-full">
                            <table className="w-full text-left border-collapse whitespace-nowrap sm:whitespace-normal">
                                <thead>
                                    <tr className="bg-white/[0.03] text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5">
                                        <th className="px-8 py-5">Guruh Nomi</th>
                                        <th className="px-6 py-5 text-center">O'qituvchi</th>
                                        <th className="px-6 py-5 text-center">O'quvchilar</th>
                                        <th className="px-6 py-5 text-center">Unitlar</th>
                                        <th className="px-8 py-5 text-right">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {allGroups
                                        .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(group => (
                                            <tr key={group.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-black">
                                                            {group.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-white text-sm truncate group-hover:text-indigo-200 transition-colors">{group.name}</p>
                                                            <p className="text-[10px] text-white/20 font-bold mt-1 uppercase tracking-widest">{formatDate(group.createdAt)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
                                                            {group.teacherId?.name || 'Noma\'lum'}
                                                        </span>
                                                        <span className="text-[9px] text-white/20 mt-1 truncate max-w-[150px]">{group.teacherId?.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 gap-2">
                                                        <Users className="w-3.5 h-3.5 text-blue-400" />
                                                        <span className="text-xs font-black text-white">{group.memberCount}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 gap-2">
                                                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                                        <span className="text-xs font-black text-white">{group.unitCount}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => router.push(`/teacher/groups?groupId=${group.id}`)}
                                                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                                                            title="Ko'rish"
                                                        >
                                                            <Eye className="w-4 h-4 text-white/40" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Rostdan ham bu guruhni o\'chirmoqchimisiz?')) {
                                                                    const res = await fetch(`/api/teacher/groups/${group.id}`, { method: 'DELETE' });
                                                                    if (res.ok) fetchAdminGroups();
                                                                }
                                                            }}
                                                            className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all"
                                                            title="O'chirish"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    {allGroups.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-10">
                                                    <Users className="w-16 h-16" />
                                                    <p className="text-xl font-black uppercase tracking-widest">Guruhlar topilmadi</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── USERS TAB ── */}
            {
                activeTab === 'users' && (
                    <div className="flex flex-col gap-8">

                        {/* Controls Bar */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="relative flex-1 max-w-2xl">
                                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                                    <Users className="w-5 h-5 text-white/20" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Ism yoki email bilan qidirish..."
                                    className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 text-sm font-bold text-white placeholder:text-white/20 focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => setShowCreateForm(!showCreateForm)}
                                className="btn-premium h-14 px-8 text-sm group"
                            >
                                <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
                                <span>O'qituvchi Qo'shish</span>
                            </button>
                        </div>

                        {/* Filter Indicators */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { label: `Jami: ${filteredUsers.length}`, styles: 'text-white/60 bg-white/5 border-white/10' },
                                { label: `O'quvchi: ${filteredUsers.filter(u => u.role === 'student').length}`, styles: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                                { label: `O'qituvchi: ${filteredUsers.filter(u => u.role === 'teacher').length}`, styles: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                                { label: `Bloklangan: ${filteredUsers.filter(u => u.status === 'blocked').length}`, styles: 'text-red-400 bg-red-500/10 border-red-500/20' },
                            ].map(chip => (
                                <span key={chip.label} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${chip.styles}`}>{chip.label}</span>
                            ))}
                        </div>

                        {/* Create Form */}
                        {createMsg && (
                            <div className={`px-6 py-4 rounded-2xl text-sm font-black border animate-fade-in ${createMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {createMsg.text}
                            </div>
                        )}
                        {showCreateForm && (
                            <form onSubmit={handleCreateTeacher} className="glass-card p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                                <h3 className="md:col-span-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Yangi O'qituvchi Tafsilotlari</h3>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">To'liq Ism</label>
                                    <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ali Valiyev" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Elektron Pochta</label>
                                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="teacher@email.com" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Parol</label>
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Biriktirish Kodi (Ixtiyoriy)</label>
                                    <input value={newTeacherCode} onChange={e => setNewTeacherCode(e.target.value.toUpperCase())} placeholder="T-XXXXXX" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 placeholder:opacity-20" />
                                    <p className="text-[10px] text-white/30 ml-1">Kiritilmasa, tizim avtomatik yaratadi.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black justify-self-start text-emerald-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Admin Secret</label>
                                    <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required placeholder="Admin maxfiy kaliti" className="w-full h-12 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500/50 placeholder:text-emerald-500/20" />
                                </div>
                                <div className="md:col-span-full flex gap-4 pt-4 border-t border-white/5">
                                    <button type="submit" disabled={creating} className="btn-premium flex-1 h-14">
                                        {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                        <span>{creating ? 'Yaratilmoqda...' : 'O\'qituvchini Saqlash'}</span>
                                    </button>
                                    <button type="button" onClick={() => setShowCreateForm(false)} className="btn-glass px-10">Bekor Qilish</button>
                                </div>
                            </form>
                        )}

                        {/* Management Table */}
                        <div className="glass-card overflow-hidden w-full">
                            <div className="overflow-x-auto custom-scrollbar min-w-0 w-full">
                                <table className="w-full text-left border-collapse whitespace-nowrap sm:whitespace-normal">
                                    <thead>
                                        <tr className="bg-white/[0.03] text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5">
                                            <th className="px-8 py-5">Foydalanuvchi</th>
                                            <th className="px-6 py-5">Role</th>
                                            <th className="px-6 py-5">So'nggi Faollik</th>
                                            <th className="px-6 py-5">Parol / Kalit</th>
                                            <th className="px-6 py-5">Status</th>
                                            <th className="px-8 py-5 text-right">Amallar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map((u: any) => (
                                            <tr key={u._id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(u.role)} flex items-center justify-center text-white text-sm font-black shadow-lg`}>
                                                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-white text-sm truncate group-hover:text-indigo-200 transition-colors">{u.name || 'Unnamed'}</p>
                                                            <p className="text-[10px] font-bold text-white/30 truncate mt-0.5">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${roleStyles(u.role)}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 font-mono">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDate(u.lastLoginAt)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-2">
                                                        {/* Teacher Connection Code */}
                                                        {u.role === 'teacher' && (
                                                            <div className="flex items-center gap-2">
                                                                {editingCodeUserId === u._id ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            value={tempTeacherCode}
                                                                            onChange={(e) => setTempTeacherCode(e.target.value.toUpperCase())}
                                                                            className="text-[9px] font-black w-24 bg-white/5 border border-indigo-500 rounded px-2 py-1 outline-none text-indigo-400"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleUpdateTeacherCode(u._id);
                                                                                if (e.key === 'Escape') setEditingCodeUserId(null);
                                                                            }}
                                                                        />
                                                                        <button onClick={() => handleUpdateTeacherCode(u._id)} className="p-1 hover:text-emerald-400 transition-colors">
                                                                            <Check className="w-3 h-3" />
                                                                        </button>
                                                                        <button onClick={() => setEditingCodeUserId(null)} className="p-1 hover:text-red-400 transition-colors">
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        onClick={() => {
                                                                            setEditingCodeUserId(u._id);
                                                                            setTempTeacherCode(u.teacherCode || '');
                                                                        }}
                                                                        className="group cursor-pointer flex items-center gap-2 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
                                                                        title="Kodni tahrirlash"
                                                                    >
                                                                        <span className="text-[8px] font-black text-indigo-400/40 uppercase tracking-tighter">ID:</span>
                                                                        <code className="text-[10px] font-black tracking-wider text-indigo-300">
                                                                            {u.teacherCode || 'SET CODE'}
                                                                        </code>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {/* Password display (for both student and teacher) */}
                                                        {(u.plainTextPassword || u.password) ? (
                                                            <div className="flex items-center gap-2">
                                                                {u.role === 'teacher' && <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">PW:</span>}
                                                                <code className={`text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 ${u.plainTextPassword ? 'text-white/60' : 'text-white/20'}`}>
                                                                    {visiblePasswords.has(u._id)
                                                                        ? (u.plainTextPassword || u.password)
                                                                        : '••••••••••'}
                                                                </code>
                                                                <button onClick={() => togglePasswordVisibility(u._id)} className="text-white/20 hover:text-white transition-colors">
                                                                    {visiblePasswords.has(u._id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                        ) : <span className="text-[9px] text-white/10">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${u.status === 'blocked' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'blocked' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {u.status === 'blocked' ? 'Bloklangan' : 'Faol'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {u.role === 'student' && (
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setAssigningStudentId(assigningStudentId === u._id ? null : u._id)}
                                                                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${u.teacherId ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-white/40'} hover:bg-indigo-500/20`}
                                                                    title="O'qituvchiga biriktirish"
                                                                >
                                                                    <UserPlus className="w-4 h-4" />
                                                                </button>
                                                                {assigningStudentId === u._id && (
                                                                    <div className="absolute right-0 top-12 z-50 w-64 glass-card p-4 shadow-2xl animate-fade-in border-indigo-500/30">
                                                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">O'qituvchini tanlang</p>
                                                                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                                                                            <button
                                                                                onClick={() => handleAssignTeacher(u._id, '')}
                                                                                className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-left group"
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><X className="w-4 h-4" /></div>
                                                                                <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">O'chirib tashlash</span>
                                                                            </button>
                                                                            {allUsers.filter((t: any) => t.role === 'teacher').map((t: any) => (
                                                                                <button
                                                                                    key={t._id}
                                                                                    onClick={() => handleAssignTeacher(u._id, t._id)}
                                                                                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 border transition-all text-left ${u.teacherId === t._id ? 'bg-indigo-500/10 border-indigo-500/30' : 'border-transparent'}`}
                                                                                >
                                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest leading-none">
                                                                                        {t.name.charAt(0)}
                                                                                    </div>
                                                                                    <div className="flex flex-col min-w-0">
                                                                                        <span className="text-[11px] font-black text-white truncate">{t.name}</span>
                                                                                        <span className="text-[9px] font-bold text-white/20 truncate">{t.teacherCode || 'Kodsiz'}</span>
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {u.role === 'student' && (
                                                            <button onClick={() => handleViewStats(u)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all" title="Statistika">
                                                                <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                            </button>
                                                        )}
                                                        <button onClick={() => { setResetUser(u); setResetMsg(null); setResetPassword(''); setResetAdminSecret(''); }} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all" title="Parolni o'zgartirish">
                                                            <KeyRound className="w-4 h-4 text-white/40" />
                                                        </button>
                                                        {u.role !== 'admin' && (
                                                            <>
                                                                <button onClick={() => handleToggleBlock(u._id, u.status || 'active')} disabled={actionLoading === u._id} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${u.status === 'blocked' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'}`} title={u.status === 'blocked' ? 'Blokdan ochish' : 'Bloklash'}>
                                                                    {u.status === 'blocked' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(u._id, u.name)} disabled={actionLoading === u._id} className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all" title="O'chirish">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-24 text-center">
                                                    <div className="flex flex-col items-center gap-4 opacity-10">
                                                        <Users className="w-16 h-16" />
                                                        <p className="text-xl font-black uppercase tracking-widest">Hech kim topilmadi</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ── MODALS ── */}
            {/* Reset Password Modal */}
            {
                resetUser && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-xl animate-fade-in">
                        <form onSubmit={handleResetPassword} className="glass-card w-full max-w-sm p-10 flex flex-col gap-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <KeyRound className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white leading-none">Parolni Yangilash</h2>
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1.5 truncate max-w-[180px]">{resetUser.name}</p>
                                </div>
                            </div>

                            {resetMsg && (
                                <div className={`px-4 py-3 rounded-xl text-xs font-black border ${resetMsg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                    {resetMsg.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Yangi Parol (min 6)</label>
                                    <input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required minLength={6} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50" placeholder="••••••••" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Admin Secret</label>
                                    <input type="password" value={resetAdminSecret} onChange={e => setResetAdminSecret(e.target.value)} required className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50" placeholder="Admin kaliti" />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="submit" disabled={resetting} className="btn-premium flex-1 h-12 text-xs">
                                    {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Saqlash'}
                                </button>
                                <button type="button" onClick={() => setResetUser(null)} className="btn-glass px-6 h-12 text-xs">Bekor</button>
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Student Stats Modal */}
            {
                selectedStudentForStats && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-gray-950/80 backdrop-blur-xl animate-fade-in">
                        <div className="glass-card w-full max-w-lg p-10 flex flex-col gap-8 relative">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient('student')} flex items-center justify-center text-white text-xl font-black shadow-lg`}>
                                        {selectedStudentForStats.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white leading-tight">{selectedStudentForStats.name}</h2>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{selectedStudentForStats.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedStudentForStats(null); setStudentSessionStats(null); setStatsError(null); }} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {loadingStudentStats ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Yuklanmoqda...</p>
                                </div>
                            ) : statsError ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                    <AlertCircle className="w-12 h-12 text-red-400" />
                                    <p className="text-sm font-bold text-red-500">{statsError}</p>
                                    <button onClick={() => handleViewStats(selectedStudentForStats)} className="btn-glass py-3 px-6 text-[10px] font-black uppercase">Qayta Urinish</button>
                                </div>
                            ) : studentSessionStats ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { label: "Bugun Onlayn", value: formatTimeSpent(studentSessionStats.todayTimeSpentSeconds), icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                                        { label: "Bugun Yodlagan", value: studentSessionStats.todayWordsCount, unit: "so'z", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
                                        { label: "Jami Yodlagan", value: studentSessionStats.totalWordsSeen, unit: "so'z", icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                        { label: "Bo'limlar", value: studentSessionStats.totalUnitsStudied, unit: "ta unit", icon: Hash, color: "text-amber-400", bg: "bg-amber-500/10" },
                                        { label: "Jami Sarlangan Vaqt", value: formatTimeSpent(studentSessionStats.estimatedTimeSpentSeconds), icon: Timer, color: "text-pink-400", bg: "bg-pink-500/10" },
                                        { label: "Sessiyalar", value: studentSessionStats.sessionsCount, unit: "kun", icon: Calendar, color: "text-violet-400", bg: "bg-violet-500/10" },
                                    ].map(item => (
                                        <div key={item.label} className="glass-card p-5 border-white/5 hover:border-white/10 transition-colors bg-white/[0.01]">
                                            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} mb-4 border border-current opacity-20`}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">{item.label}</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-white">{item.value}</span>
                                                {item.unit && <span className="text-[10px] font-black text-white/40 uppercase">{item.unit}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-10">
                                    <BookOpen className="w-16 h-16" />
                                    <p className="text-sm font-black uppercase tracking-widest">Hali faollik qayd etilmagan</p>
                                </div>
                            )}

                            <button onClick={() => { setSelectedStudentForStats(null); setStudentSessionStats(null); setStatsError(null); }} className="btn-glass w-full h-14 text-xs font-black uppercase tracking-widest">Yopish</button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        }>
            <AdminDashboardInner />
        </Suspense>
    );
}
