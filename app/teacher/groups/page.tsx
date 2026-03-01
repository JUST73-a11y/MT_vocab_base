'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { UsersRound, Loader2, Plus, ChevronRight, Trash2, UserPlus, BookOpen, BarChart3, XCircle, CheckCircle2, Info, FolderOpen, ChevronDown, Trophy, Activity, Zap, PlayCircle, StopCircle, Medal, RefreshCw } from 'lucide-react';
import { getUnits } from '@/lib/firestore';
import { Unit } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';

interface Group {
    id: string;
    name: string;
    teacherId: string;
    memberCount: number;
    unitCount: number;
    createdAt: string;
}

interface Student {
    _id: string;
    name: string;
    email: string;
}

interface CategoryNode {
    _id: string;
    name: string;
    path: string;
    children: CategoryNode[];
}

export default function TeacherGroupsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Delete Modal
    const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    // Detail View / Edit State
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'access' | 'stats' | 'quiz'>('members');

    // Member Management
    const [groupMembers, setGroupMembers] = useState<string[]>([]); // student IDs
    const [savingMembers, setSavingMembers] = useState(false);

    // Access Management
    const [groupAccess, setGroupAccess] = useState<string[]>([]); // unit IDs
    const [savingAccess, setSavingAccess] = useState(false);

    // Category Tree State
    const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
    const [viewMode, setViewMode] = useState<'category' | 'unit'>('category');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Stats (existing)
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Quiz session
    const [activeSession, setActiveSession] = useState<any>(null);
    const [loadingSession, setLoadingSession] = useState(false);
    const [startingSession, setStartingSession] = useState(false);
    const [endingSession, setEndingSession] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [quizTimerSec, setQuizTimerSec] = useState(10);
    const [quizSelectedUnits, setQuizSelectedUnits] = useState<string[]>([]);
    const [resettingCoins, setResettingCoins] = useState(false);
    const leaderboardPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            const [gRes, sRes, uData, catData] = await Promise.all([
                apiFetch('/api/teacher/groups'),
                apiFetch('/api/teacher/students'),
                getUnits(user?.id),
                apiFetch('/api/teacher/categories/tree').catch(() => [])
            ]);
            setGroups(gRes);
            setStudents(sRes);
            setUnits(uData);
            setCategoriesTree(catData || []);
        } catch (error) {
            console.error('Failed to load groups:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setCreatingGroup(true);
        try {
            const group = await apiFetch('/api/teacher/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName }),
            });
            setGroups(prev => [group, ...prev]);
            setShowCreateModal(false);
            setNewGroupName('');
            loadData(); // To get actual enriched counts if needed
            toast.success("Guruh yaratildi");
        } catch (error: any) {
            console.error('Failed to create group:', error);
            toast.error(error.message || 'Xatolik yuz berdi');
        } finally {
            setCreatingGroup(false);
        }
    };

    const openGroupDetails = async (group: Group) => {
        setSelectedGroup(group);
        setActiveTab('members');

        // Load members
        try {
            const data = await apiFetch(`/api/teacher/groups/${group.id}/members`);
            setGroupMembers(data.map((m: any) => m.id));
        } catch (error) {
            console.error('Failed to load group members:', error);
        }

        // Load access
        try {
            const data = await apiFetch(`/api/teacher/groups/${group.id}/access`);
            setGroupAccess(data.unitIds || []);
            setQuizSelectedUnits(data.unitIds || []);
        } catch (error) {
            console.error('Failed to load group access:', error);
        }
    };

    const loadGroupStats = async (groupId: string) => {
        setLoadingStats(true);
        try {
            const data = await apiFetch(`/api/teacher/groups/${groupId}/stats`);
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        if (selectedGroup && activeTab === 'stats') {
            loadGroupStats(selectedGroup.id);
        }
    }, [selectedGroup, activeTab]);

    const toggleMember = (studentId: string) => {
        setGroupMembers(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleSaveMembers = async () => {
        if (!selectedGroup) return;
        setSavingMembers(true);
        try {
            await apiFetch(`/api/teacher/groups/${selectedGroup.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: groupMembers }),
            });
            // Update local group count
            setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, memberCount: groupMembers.length } : g));
            openGroupDetails(selectedGroup);
            toast.success('A\'zolar saqlandi');
        } catch (error: any) {
            console.error('Failed to save members:', error);
            toast.error(error.message || 'Xatolik yuz berdi');
        } finally {
            setSavingMembers(false);
        }
    };

    const toggleAccess = (unitId: string) => {
        setGroupAccess(prev =>
            prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
        );
    };

    const handleSaveAccess = async () => {
        if (!selectedGroup) return;
        setSavingAccess(true);
        try {
            await apiFetch(`/api/teacher/groups/${selectedGroup.id}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitIds: groupAccess }),
            });
            // Update local group count
            setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, unitCount: groupAccess.length } : g));
            openGroupDetails(selectedGroup);
            toast.success('Huquqlar saqlandi');
        } catch (error: any) {
            console.error('Failed to save access:', error);
            toast.error(error.message || 'Xatolik yuz berdi');
        } finally {
            setSavingAccess(false);
        }
    };

    // ── Group Delete ──────────────────────────────────────────────────────────
    const handleDeleteGroup = async () => {
        if (!deleteTarget || deleteConfirmText !== 'DELETE') return;
        setDeleting(true);
        try {
            await apiFetch(`/api/teacher/groups/${deleteTarget.id}`, { method: 'DELETE' });
            setGroups(prev => prev.filter(g => g.id !== deleteTarget.id));
            setDeleteTarget(null);
            setDeleteConfirmText('');
            if (selectedGroup?.id === deleteTarget.id) setSelectedGroup(null);
            toast.success(`"${deleteTarget.name}" guruhi o'chirildi`);
        } catch {
            toast.error('Xato yuz berdi');
        } finally {
            setDeleting(false);
        }
    };

    const handleResetCoins = async () => {
        if (!selectedGroup) return;
        if (!confirm("Rostdan ham bu guruhdagi barcha o'quvchilar tangalarini (reytingni) 0 ga tushirmoqchimisiz?")) return;
        setResettingCoins(true);
        try {
            await apiFetch(`/api/teacher/groups/${selectedGroup.id}/reset`, { method: 'POST' });
            toast.success("Barcha talabalar reytingi 0 ga tushirildi");
            loadGroupStats(selectedGroup.id);
        } catch (error: any) {
            toast.error(error.message || "Xatolik yuz berdi");
        } finally {
            setResettingCoins(false);
        }
    };

    // ── Quiz Session ──────────────────────────────────────────────────────────
    const fetchActiveSession = useCallback(async (groupId: string) => {
        try {
            const d = await apiFetch(`/api/teacher/groups/${groupId}/quiz-session`);
            setActiveSession(d?.session ?? null);
        } catch { }
    }, []);

    const fetchLeaderboard = useCallback(async (groupId: string, sessionId?: string) => {
        setLoadingLeaderboard(true);
        try {
            const url = sessionId
                ? `/api/teacher/groups/${groupId}/quiz-session/leaderboard?sessionId=${sessionId}`
                : `/api/teacher/groups/${groupId}/quiz-session/leaderboard`;
            const d = await apiFetch(url);
            setLeaderboard(d?.leaderboard || []);
        } catch { }
        finally { setLoadingLeaderboard(false); }
    }, []);

    useEffect(() => {
        if (selectedGroup && activeTab === 'quiz') {
            fetchActiveSession(selectedGroup.id);
            fetchLeaderboard(selectedGroup.id);
        }
        return () => { if (leaderboardPollRef.current) clearInterval(leaderboardPollRef.current); };
    }, [selectedGroup, activeTab]);

    const startQuizSession = async () => {
        if (!selectedGroup) return;
        if (quizSelectedUnits.length === 0) {
            toast.error("Kamida 1 ta bo'lim tanlang!");
            return;
        }
        setStartingSession(true);
        try {
            const d = await apiFetch(`/api/teacher/groups/${selectedGroup.id}/quiz-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitIds: quizSelectedUnits, questionCount: 20, durationMin: 10, timeLimitSec: quizTimerSec }),
            });
            setActiveSession(d.session);
            toast.success(`Quiz sessiyasi boshlandi! ⏱ ${quizTimerSec}s/savol`);
            if (leaderboardPollRef.current) clearInterval(leaderboardPollRef.current);
            leaderboardPollRef.current = setInterval(() => {
                fetchLeaderboard(selectedGroup.id, d.session?._id);
            }, 8000);
        } finally {
            setStartingSession(false);
        }
    };

    const endQuizSession = async () => {
        if (!selectedGroup) return;
        setEndingSession(true);
        try {
            await apiFetch(`/api/teacher/groups/${selectedGroup.id}/quiz-session`, { method: 'DELETE' });
            setActiveSession(null);
            if (leaderboardPollRef.current) clearInterval(leaderboardPollRef.current);
            toast.success('Sessiya yakunlandi');
            fetchLeaderboard(selectedGroup.id);
        } finally {
            setEndingSession(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-10 animate-fade-in justify-center self-center w-full" style={{ justifySelf: 'center' }}>

            {/* ── Groups Header / Actions ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Guruhlar</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Barcha guruhlarni boshqaring</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-md whitespace-nowrap">
                    <Plus className="w-4 h-4" /> Yangi Guruh
                </button>
            </div>

            {/* ── Groups Table ── */}
            {loadingData ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            ) : groups.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center">
                    <UsersRound className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Guruhlar mavjud emas</h3>
                    <p className="text-gray-500 text-sm mt-2">Yangi guruh yarating va talabalarni qo&apos;shing.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4">Guruh</th>
                                    <th className="px-6 py-4">A&apos;zolar</th>
                                    <th className="px-6 py-4">Unitlar</th>
                                    <th className="px-6 py-4">Yaratilgan</th>
                                    <th className="px-6 py-4 text-right">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {groups.map(group => (
                                    <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                    <UsersRound className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{group.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {group.memberCount} talaba
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                {group.unitCount} unit
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(group.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => openGroupDetails(group)}
                                                className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all">
                                                Ochish →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {mounted && showCreateModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="max-w-md w-full p-8 flex flex-col gap-6 rounded-[2rem]"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <header>
                            <h2 className="text-2xl font-black text-white tracking-tight">Yangi Guruh</h2>
                            <p className="text-sm text-white/40 font-medium">Guruh nomini kiriting</p>
                        </header>
                        <form onSubmit={handleCreateGroup} className="space-y-6">
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                placeholder="Guruh nomi (masalan, 11-A sinf)"
                                className="w-full rounded-2xl px-5 py-4 bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                                autoFocus
                                required
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)}
                                    className="py-4 rounded-2xl font-black text-white/40 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Bekor</button>
                                <button type="submit" disabled={creatingGroup}
                                    className="btn-premium py-4">
                                    {creatingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yaratish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}


            {mounted && selectedGroup && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="max-w-5xl w-full p-8 flex flex-col gap-8 h-[92vh] overflow-hidden rounded-[2.5rem] shadow-2xl relative"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <header className="flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                    <UsersRound className="w-8 h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">{selectedGroup.name}</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">Guruh Boshqaruvi</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setDeleteTarget(selectedGroup); setDeleteConfirmText(''); }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 text-xs font-black transition-all"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <Trash2 className="w-4 h-4" /> O'chirish
                                </button>
                                <button onClick={() => setSelectedGroup(null)} className="p-2 text-white/20 hover:text-white transition-colors">
                                    <XCircle className="w-8 h-8" />
                                </button>
                            </div>
                        </header>

                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl shrink-0 flex-wrap">
                            {[
                                { id: 'members', label: 'Talabalar', icon: UserPlus },
                                { id: 'access', label: 'Unitlar', icon: BookOpen },
                                { id: 'quiz', label: 'Quiz', icon: Zap },
                                { id: 'stats', label: 'Statistika', icon: BarChart3 },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'text-white/40 hover:text-white/60'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                            {activeTab === 'members' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-white">Guruh A'zolari</h3>
                                        <button
                                            onClick={handleSaveMembers}
                                            disabled={savingMembers}
                                            className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                        >
                                            {savingMembers ? <Loader2 className="w-4 h-4 animate-spin" /> : "O'zgarishlarni Saqlash"}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {students.map(student => {
                                            const isMember = groupMembers.includes(student._id);
                                            return (
                                                <button
                                                    key={student._id}
                                                    onClick={() => toggleMember(student._id)}
                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isMember
                                                        ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="text-left">
                                                        <p className="text-sm font-black truncate max-w-[150px]">{student.name}</p>
                                                        <p className="text-[10px] font-medium opacity-40">{student.email}</p>
                                                    </div>
                                                    {isMember ? <CheckCircle2 className="w-5 h-5 text-indigo-400" /> : <div className="w-5 h-5 rounded-full border-2 border-white/10" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'access' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-white">Guruh Unitlari</h3>
                                        <button
                                            onClick={handleSaveAccess}
                                            disabled={savingAccess}
                                            className="px-6 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all"
                                        >
                                            {savingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : "O'zgarishlarni Saqlash"}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <button
                                            onClick={() => setGroupAccess(units.map(u => u.id))}
                                            className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Barchasini tanlash
                                        </button>
                                        <button
                                            onClick={() => setGroupAccess([])}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 rounded-xl text-xs font-bold transition-colors"
                                        >
                                            Barchasini o'chirish
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex bg-white/5 p-1 rounded-xl">
                                            <button onClick={() => setViewMode('category')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'category' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>Papka (Category)</button>
                                            <button onClick={() => setViewMode('unit')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${viewMode === 'unit' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}>Ro'yxat (Unit)</button>
                                        </div>

                                        {viewMode === 'category' ? (() => {
                                            const renderCategoryTree = (nodes: CategoryNode[], depth = 0) => {
                                                return nodes.map(node => {
                                                    const isExpanded = expandedCategories.includes(node._id);
                                                    const toggleExpand = () => setExpandedCategories(p => p.includes(node._id) ? p.filter(id => id !== node._id) : [...p, node._id]);

                                                    const catUnits = units.filter(u => u.categoryId === node._id);

                                                    const getAllNestedUnitIds = (n: CategoryNode): string[] => {
                                                        let ids = units.filter(u => u.categoryId === n._id).map(u => u.id);
                                                        n.children?.forEach(child => { ids = [...ids, ...getAllNestedUnitIds(child)]; });
                                                        return ids;
                                                    };

                                                    const nestedUnitIds = getAllNestedUnitIds(node);
                                                    const allSelected = nestedUnitIds.length > 0 && nestedUnitIds.every(id => groupAccess.includes(id));
                                                    const someSelected = nestedUnitIds.length > 0 && nestedUnitIds.some(id => groupAccess.includes(id));

                                                    const toggleCategoryAccess = () => {
                                                        if (allSelected) setGroupAccess(p => p.filter(id => !nestedUnitIds.includes(id)));
                                                        else setGroupAccess(p => Array.from(new Set([...p, ...nestedUnitIds])));
                                                    };

                                                    return (
                                                        <div key={node._id} style={{ marginLeft: depth > 0 ? 16 : 0 }} className="mt-2 text-left w-full block">
                                                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                                                <div className="flex items-center gap-3 w-2/3">
                                                                    <button type="button" onClick={toggleExpand} className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/40 hover:text-white shrink-0">
                                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                    </button>
                                                                    <FolderOpen className="w-5 h-5 text-indigo-400 shrink-0" />
                                                                    <span className="font-bold text-sm text-white truncate text-left">{node.name}</span>
                                                                    <span className="text-[10px] text-white/30 truncate shrink-0">({nestedUnitIds.length} unit)</span>
                                                                </div>
                                                                {nestedUnitIds.length > 0 && (
                                                                    <button type="button" onClick={toggleCategoryAccess} className={`text-[10px] font-black uppercase px-2 md:px-3 py-1.5 md:py-1.5 rounded-lg transition-colors shrink-0 ${allSelected ? 'bg-indigo-500 text-white' : someSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}>
                                                                        {allSelected ? 'Ruxsat etilgan' : someSelected ? 'Qisman ruxsat' : 'Ruxsat berish'}
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="ml-4 pl-4 border-l border-white/10 mt-2 space-y-2 text-left">
                                                                    {renderCategoryTree(node.children, depth + 1)}

                                                                    {catUnits.map(unit => {
                                                                        const hasAccess = groupAccess.includes(unit.id);
                                                                        return (
                                                                            <button type="button" key={unit.id} onClick={() => toggleAccess(unit.id)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${hasAccess ? 'bg-indigo-500/10 border-indigo-500/50 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}>
                                                                                <span className="text-xs font-bold truncate text-left">{unit.title}</span>
                                                                                {hasAccess ? <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-white/10 shrink-0" />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                    {node.children?.length === 0 && catUnits.length === 0 && (
                                                                        <p className="text-[10px] text-white/20 italic py-2">Bu papka bo'sh</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                });
                                            };
                                            return (
                                                <div className="space-y-1">
                                                    {categoriesTree.length > 0 ? renderCategoryTree(categoriesTree) : <p className="text-center py-4 text-white/20 text-xs">Kategoriyalar yo'q</p>}
                                                </div>
                                            );
                                        })() : (
                                            Object.entries(
                                                units.reduce((acc, unit) => {
                                                    const cat = unit.category || 'Boshqa';
                                                    if (!acc[cat]) acc[cat] = [];
                                                    acc[cat].push(unit);
                                                    return acc;
                                                }, {} as Record<string, Unit[]>)
                                            ).map(([category, catUnits]) => (
                                                <div key={category} className="space-y-3">
                                                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                        {category}
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {catUnits.map(unit => {
                                                            const hasAccess = groupAccess.includes(unit.id);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={unit.id}
                                                                    onClick={() => toggleAccess(unit.id)}
                                                                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${hasAccess
                                                                        ? 'bg-indigo-500/10 border-indigo-500/50 text-white'
                                                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                                                        }`}
                                                                >
                                                                    <div className="text-left">
                                                                        <p className="text-sm font-black truncate max-w-[150px]">{unit.title}</p>
                                                                    </div>
                                                                    {hasAccess ? <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-white/10 shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'stats' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="flex justify-end mb-[-1rem]">
                                        <button
                                            onClick={handleResetCoins}
                                            disabled={resettingCoins}
                                            className="px-4 py-2 rounded-xl text-orange-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                            style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                                            {resettingCoins ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                            Reytingni Nollash
                                        </button>
                                    </div>
                                    {loadingStats ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Statistika yuklanmoqda...</p>
                                        </div>
                                    ) : stats ? (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="glass-card p-6 bg-white/2 border-white/5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">A'zolar</p>
                                                    <h4 className="text-4xl font-black text-white">{stats.membersCount}</h4>
                                                    <p className="text-[10px] font-bold text-indigo-400 mt-2">{stats.activeStudentsCount} ta faol</p>
                                                </div>
                                                <div className="glass-card p-6 bg-white/2 border-white/5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Unitlar</p>
                                                    <h4 className="text-4xl font-black text-white">{stats.unitsAssignedCount}</h4>
                                                    <p className="text-[10px] font-bold text-indigo-400 mt-2">Jami biriktirilgan</p>
                                                </div>
                                                <div className="glass-card p-6 bg-white/2 border-white/5 opacity-50">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">O'rtacha natija</p>
                                                    <h4 className="text-4xl font-black text-white">--</h4>
                                                    <p className="text-[10px] font-bold text-indigo-400 mt-2">Tez kunda</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Most Active Students */}
                                                <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                            <Activity className="w-5 h-5 text-emerald-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-white">Eng Faol Talabalar</h4>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Oxirgi faollik bo'yicha</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {stats.leaderboards?.mostActive?.length > 0 ? (
                                                            stats.leaderboards.mostActive.map((student: any, idx: number) => (
                                                                <div key={student._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-amber-700/20 text-amber-600'}`}>
                                                                            {idx + 1}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-black text-white">{student.name}</p>
                                                                            <p className="text-[10px] text-white/40">{new Date(student.lastLoginAt).toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-white/30 text-center py-4">Ma'lumot yo'q</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Most Words Found */}
                                                <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                            <Trophy className="w-5 h-5 text-amber-400" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-white">Eng Ko'p So'z Topganlar</h4>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Jami ko'rilgan so'zlar bo'yicha</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {stats.leaderboards?.mostWords?.length > 0 ? (
                                                            stats.leaderboards.mostWords.map((student: any, idx: number) => (
                                                                <div key={student._id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : 'bg-amber-700/20 text-amber-600'}`}>
                                                                            {idx + 1}
                                                                        </div>
                                                                        <p className="text-xs font-black text-white">{student.name}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-xs font-black text-amber-400">{student.totalWordsSeen || 0}</p>
                                                                        <p className="text-[8px] uppercase tracking-widest text-amber-400/50">so'z</p>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <p className="text-xs text-white/30 text-center py-4">Ma'lumot yo'q</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="glass-card p-6 flex items-start gap-4 border-indigo-500/20 bg-indigo-500/5 mt-4">
                                                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-black text-white mb-1">Guruh Progressi</h4>
                                                    <p className="text-xs text-indigo-300/70 leading-relaxed">
                                                        Talabalarning o'zlashtirish darajasi, qaysi so'zlarda xato qilgani va batafsil xato analitikasi keyingi asosiy yangilanishda (Phase 7) tayyor bo'ladi. Hozircha umumiy faollikni kuzatishingiz mumkin.
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-center py-10 text-white/20 font-black uppercase tracking-widest">Ma'lumot topilmadi</p>
                                    )}
                                </div>
                            )}
                            {/* ── Quiz Tab ── */}
                            {activeTab === 'quiz' && (
                                <div className="space-y-6">
                                    {/* Session control */}
                                    <div className="rounded-2xl p-5" style={{ background: activeSession ? 'rgba(16,185,129,0.07)' : 'rgba(99,102,241,0.07)', border: `1px solid ${activeSession ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.2)'}` }}>
                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {activeSession ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE SESSIYA
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-black uppercase tracking-widest text-white/30">Sessiya yo&apos;q</span>
                                                    )}
                                                </div>
                                                <p className="text-white/40 text-xs">
                                                    {activeSession
                                                        ? `Boshlangan: ${new Date(activeSession.startsAt).toLocaleTimeString('uz-UZ')} · ${activeSession.questionCount} ta savol · ${activeSession.timeLimitSec ?? 10}s/savol`
                                                        : 'Yangi quiz sessiyasini boshlang'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {activeSession ? (
                                                    <button onClick={endQuizSession} disabled={endingSession}
                                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                                                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                                        {endingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Yakunlash
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/25 mr-1">&#9203; Savol vaqti:</span>
                                                            {[5, 10, 15, 20, 30].map(s => (
                                                                <button key={s} onClick={() => setQuizTimerSec(s)}
                                                                    className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all"
                                                                    style={quizTimerSec === s
                                                                        ? { background: 'rgba(99,102,241,0.6)', color: '#fff', border: '1px solid rgba(99,102,241,0.5)' }
                                                                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                    {s}s
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button onClick={startQuizSession} disabled={startingSession}
                                                            className="btn-premium px-5 py-2.5 text-sm h-auto disabled:opacity-50">
                                                            {startingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />} Boshlash
                                                        </button>
                                                    </div>
                                                )}
                                                <button onClick={() => fetchLeaderboard(selectedGroup!.id, activeSession?._id)}
                                                    className="p-2.5 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <RefreshCw className="w-4 h-4 text-white/40" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Settings when no session */}
                                        {!activeSession && (
                                            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Qaysi bo'limlardan savol tushsin?</h4>
                                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                                    {units.filter(u => groupAccess.includes(u.id!)).length > 0 ? (
                                                        units.filter(u => groupAccess.includes(u.id!)).map(u => (
                                                            <button key={u.id} onClick={() => setQuizSelectedUnits(prev => prev.includes(u.id!) ? prev.filter(id => id !== u.id) : [...prev, u.id!])}
                                                                style={{
                                                                    background: quizSelectedUnits.includes(u.id!) ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.02)',
                                                                    borderColor: quizSelectedUnits.includes(u.id!) ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.05)',
                                                                }}
                                                                className={`text-xs sm:text-sm font-black px-4 sm:px-5 py-2 sm:py-3 rounded-xl border transition-all ${quizSelectedUnits.includes(u.id!) ? 'text-indigo-300' : 'text-white/40 hover:text-white/60'}`}>
                                                                {u.title}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] items-center text-amber-400 opacity-60">Guruhda hech qanday bo'limga ruxsat yo'q. Dastlab 'Ruxsatlar' bo'limidan unit qo'shing.</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Leaderboard */}
                                        <div className="mt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                                                    <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard (Joriy)
                                                </h3>
                                                <Link href={`/teacher/groups/${selectedGroup?.id}/sessions`}
                                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1 hover:text-indigo-300 transition-colors">
                                                    Sessiya tarixi <ChevronRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                            {loadingLeaderboard ? (
                                                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
                                            ) : leaderboard.length === 0 ? (
                                                <div className="text-center py-10 text-white/20">
                                                    <Medal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">Hali javoblar yo&apos;q</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {leaderboard.map((entry, idx) => {
                                                        const medalColors = ['rgba(245,158,11,0.2)', 'rgba(148,163,184,0.15)', 'rgba(180,83,9,0.15)'];
                                                        const medalText = ['#fbbf24', '#94a3b8', '#b45309'];
                                                        const isMedal = idx < 3;
                                                        return (
                                                            <div key={entry.studentId} className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                                                                style={{ background: isMedal ? medalColors[idx] : 'rgba(255,255,255,0.03)', border: `1px solid ${isMedal ? medalText[idx] + '30' : 'rgba(255,255,255,0.05)'}` }}>
                                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                                                                    style={{ background: isMedal ? medalColors[idx] : 'rgba(255,255,255,0.05)', color: isMedal ? medalText[idx] : 'rgba(255,255,255,0.3)' }}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-black text-white text-sm truncate">{entry.name}</p>
                                                                    <p className="text-[10px] text-white/30">{entry.answered} ta javob</p>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <p className="text-lg font-black" style={{ color: isMedal ? medalText[idx] : 'rgba(255,255,255,0.6)' }}>{entry.correct}</p>
                                                                    <p className="text-[9px] text-white/25">{entry.accuracy}% aniqlik</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Delete Group Modal ── */}
                            {mounted && deleteTarget && createPortal(
                                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
                                    <div className="max-w-md w-full rounded-3xl p-8 flex flex-col gap-6"
                                        style={{ background: 'rgba(20,5,5,0.95)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                <Trash2 className="w-6 h-6 text-red-400" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-white">Guruhni o'chirish</h2>
                                                <p className="text-red-400/70 text-sm mt-1">Bu amalni ortga qaytarib bo'lmaydi</p>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                            <p className="text-sm text-white/60 mb-1">O'chiriladigan guruh:</p>
                                            <p className="text-lg font-black text-white">"{deleteTarget.name}"</p>
                                            <p className="text-xs text-red-400/60 mt-2">· {deleteTarget.memberCount} ta a'zo va {deleteTarget.unitCount} ta unit biriktirilgan ham tozalanadi</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-white/40 uppercase tracking-widest">
                                                Tasdiqlash uchun <span className="text-red-400">DELETE</span> yozing
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="DELETE"
                                                value={deleteConfirmText}
                                                onChange={e => setDeleteConfirmText(e.target.value)}
                                                className="w-full h-11 rounded-xl px-4 font-black text-white outline-none tracking-widest"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${deleteConfirmText === 'DELETE' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}` }}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(''); }}
                                                className="py-3 rounded-xl font-black text-sm text-white/50 hover:text-white transition-all"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                Bekor
                                            </button>
                                            <button
                                                onClick={handleDeleteGroup}
                                                disabled={deleteConfirmText !== 'DELETE' || deleting}
                                                className="py-3 rounded-xl font-black text-sm text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                                style={{ background: deleteConfirmText === 'DELETE' ? 'rgba(239,68,68,0.8)' : 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                                                {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "O'chirish"}
                                            </button>
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
