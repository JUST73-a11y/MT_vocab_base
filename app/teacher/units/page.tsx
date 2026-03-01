'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnits } from '@/lib/useUnits';
import { useCategoryTree, CategoryNode } from '@/lib/useCategoryTree';
import { deleteUnit } from '@/lib/firestore';
import { Unit } from '@/lib/types';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Plus, Trash2, Edit, Loader2, ArrowLeft, FolderOpen, ChevronRight,
    Search, Share2, X, ChevronDown, Check, Users, Send, AlertCircle,
    LayoutGrid, List, Filter, MoreVertical, Sparkles
} from 'lucide-react';
// FolderPlus is not available depending on lucide-react version. Swapping to Plus.
const FolderPlus = Plus;


// ── Skeleton component ──────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="glass-card p-6 shimmer h-[160px]" />
    );
}

// ── Category Tree Node ────────────────────────────────────────────────────
function TreeNode({
    node,
    depth = 0,
    selectedId,
    onSelect,
    onDelete,
}: {
    node: CategoryNode;
    depth?: number;
    selectedId: string | null;
    onSelect: (node: CategoryNode) => void;
    onDelete: (id: string, name: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const isSelected = node._id === selectedId;
    const hasChildren = node.children.length > 0;

    return (
        <div className="select-none">
            <motion.div
                initial={false}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer group transition-all text-sm font-bold relative overflow-hidden ${isSelected ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'}`}
                style={{ marginLeft: `${depth * 12}px` }}
            >
                {isSelected && (
                    <motion.div
                        layoutId="tree-active"
                        className="absolute inset-0 bg-indigo-500/10 border-l-2 border-indigo-500"
                    />
                )}

                {hasChildren ? (
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity z-10">
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                ) : <span className="w-3.5 h-3.5 shrink-0 z-10" />}

                <button onClick={() => onSelect(node)} className="flex items-center gap-2.5 flex-1 text-left truncate z-10 py-1">
                    <FolderOpen className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-indigo-400 fill-indigo-400/10' : 'group-hover:text-indigo-300'}`} />
                    <span className="truncate text-[13px] tracking-tight">{node.name}</span>
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(node._id, node.name); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/10 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0 z-10"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </motion.div>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        {node.children.map(child => (
                            <TreeNode key={child._id} node={child} depth={depth + 1}
                                selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Share Modal ───────────────────────────────────────────────────────────
function ShareModal({
    units,
    onClose,
    onSuccess,
}: {
    units: Unit[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [teacherCode, setTeacherCode] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sharing, setSharing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const filtered = units.filter(u => u.title.toLowerCase().includes(search.toLowerCase()));
    const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (allSelected) {
            setSelected(prev => {
                const next = new Set(prev);
                filtered.forEach(u => next.delete(u.id));
                return next;
            });
        } else {
            setSelected(prev => {
                const next = new Set(prev);
                filtered.forEach(u => next.add(u.id));
                return next;
            });
        }
    };

    const handleShare = async () => {
        if (!teacherCode.trim() || selected.size === 0) return;
        setSharing(true);
        setErrors([]);
        try {
            const res = await apiFetch('/api/teacher/unit-shares/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toTeacherCode: teacherCode.trim(), unitIds: Array.from(selected) }),
            }) as any;

            const failed: string[] = (res.failed || []).map((f: any) => `${f.unitId}: ${f.reason}`);
            const successCount = (res.successfulUnitIds || []).length;

            if (successCount > 0) {
                toast.success(`${successCount} ta unit muvaffaqiyatli ulashildi!`);
                onSuccess();
                if (failed.length === 0) onClose();
                else setErrors(failed);
            } else {
                setErrors(failed.length > 0 ? failed : ['Hech bir unit ulashilmadi.']);
            }
        } catch (e: any) {
            toast.error(e?.message || 'Xatolik yuz berdi');
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card w-full max-w-xl flex flex-col max-h-[90vh] relative !bg-gray-950/80"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

                {/* Header */}
                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                            <Share2 className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight text-white uppercase tracking-tighter">Unitlarni Ulashish</h2>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">
                                {selected.size > 0 ? `${selected.size} ta bo'lim tanlandi` : 'Hamkasbingiz bilan bo\'lishing'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Teacher Code Section */}
                    <div className="px-10 py-6 bg-white/[0.02] border-b border-white/5">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 block">Qabul qiluvchi o'qituvchi kodi</label>
                        <div className="relative group/input">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within/input:text-indigo-400 transition-colors">
                                <Users className="w-full h-full" />
                            </div>
                            <input
                                type="text"
                                placeholder="Masalan: TEACHER_ALI_2024"
                                value={teacherCode}
                                onChange={e => setTeacherCode(e.target.value)}
                                className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 text-base font-black text-white placeholder:text-white/10 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                    </div>

                    {/* Units list */}
                    <div className="p-10 flex-1 overflow-hidden flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" /> Unit ro'yxati
                            </h3>
                            <button onClick={toggleAll} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 hover:bg-indigo-500/20 uppercase tracking-widest transition-all">
                                {allSelected ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Unit nomini qidiring..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-11 bg-white/[0.02] border border-white/10 rounded-xl pl-11 pr-4 text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-indigo-500/30 transition-all"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {filtered.map(unit => (
                                <button
                                    key={unit.id}
                                    onClick={() => toggle(unit.id)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left group/item border ${selected.has(unit.id)
                                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                                        : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}
                                >
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${selected.has(unit.id)
                                        ? 'bg-indigo-500 border-indigo-500 scale-110'
                                        : 'border-white/10 group-hover/item:border-white/30'}`}>
                                        {selected.has(unit.id) && <Check className="w-4 h-4 text-white stroke-[4px]" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-black text-white truncate group-hover/item:text-indigo-200 transition-colors uppercase tracking-tight">{unit.title}</p>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-0.5">{unit.category || 'Asosiy'}</p>
                                    </div>
                                    <BookOpen className={`w-5 h-5 transition-colors ${selected.has(unit.id) ? 'text-indigo-400' : 'text-white/5 group-hover/item:text-white/20'}`} />
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                                    <Search className="w-12 h-12" />
                                    <p className="font-black uppercase tracking-widest text-sm">Hech narsa topilmadi</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Errors notification */}
                {errors.length > 0 && (
                    <div className="mx-10 mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 animate-fade-in">
                        <div className="flex items-center gap-3 text-red-500 text-sm font-black mb-2 uppercase tracking-tight">
                            <AlertCircle className="w-5 h-5" /> Ulashishda muammo:
                        </div>
                        <ul className="space-y-1 pl-8 list-disc">
                            {errors.map((e, i) => <li key={i} className="text-red-400/60 text-xs font-bold">{e}</li>)}
                        </ul>
                    </div>
                )}

                {/* Footer buttons */}
                <div className="px-10 py-8 border-t border-white/5 flex gap-4 bg-white/[0.01]">
                    <button onClick={onClose} className="btn-secondary flex-1 h-14 uppercase tracking-widest text-xs font-black">Bekor qilish</button>
                    <button
                        onClick={handleShare}
                        disabled={sharing || selected.size === 0 || !teacherCode.trim()}
                        className="btn-premium flex-1 h-14 uppercase tracking-widest text-xs font-black disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {sharing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                            <div className="flex items-center justify-center gap-3">
                                <Send className="w-4 h-4" />
                                Ulashish ({selected.size})
                            </div>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function UnitsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // Auth guard
    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const { units, loading: unitsLoading, error: unitsError, refetch } = useUnits(user?.id);
    const { tree: categoriesTree, loading: catLoading, refetch: treeRefetch } = useCategoryTree(user?.id);

    const [currentPath, setCurrentPath] = useState<CategoryNode[]>([]);
    const [search, setSearch] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    const currentCatId = currentPath.length > 0 ? currentPath[currentPath.length - 1]._id : null;

    // Find node in tree
    const findNode = useCallback((nodes: CategoryNode[], id: string): CategoryNode | null => {
        for (const n of nodes) {
            if (n._id === id) return n;
            const f = findNode(n.children, id);
            if (f) return f;
        }
        return null;
    }, []);

    const findPathToNode = useCallback((nodes: CategoryNode[], targetId: string, path: CategoryNode[]): CategoryNode[] | null => {
        for (const n of nodes) {
            const newPath = [...path, n];
            if (n._id === targetId) return newPath;
            const found = findPathToNode(n.children, targetId, newPath);
            if (found) return found;
        }
        return null;
    }, []);

    const currentFolders = currentCatId
        ? (findNode(categoriesTree, currentCatId)?.children ?? [])
        : categoriesTree;

    // Units filtered by current category + search
    const baseUnits = currentCatId
        ? units.filter(u => u.categoryId === currentCatId)
        : [];
    const currentUnits = search
        ? units.filter(u => u.title.toLowerCase().includes(search.toLowerCase())) // Search across all units if searching
        : baseUnits;

    const handleDeleteFolder = async (id: string, name: string) => {
        if (!confirm(`"${name}" papkasini o'chirasizmi?\nDIQQAT: Ichidagi barcha papkalar va unitlar ham o'chib ketadi!`)) return;
        await apiFetch(`/api/teacher/categories/${id}`, { method: 'DELETE' });
        if (currentCatId === id) setCurrentPath([]);
        treeRefetch();
        refetch();
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setCreatingFolder(true);
        try {
            const currentCat = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
            await apiFetch('/api/teacher/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName, parentId: currentCat?._id || null }),
            });
            treeRefetch();
            setShowNewFolder(false);
            setNewFolderName('');
            toast.success('Kategoriya yaratildi!');
        } catch {
            toast.error('Kategoriyani yaratishda xatolik');
        } finally {
            setCreatingFolder(false);
        }
    };

    const handleDeleteUnit = async (unitId: string, title: string) => {
        if (!confirm(`"${title}" bo'limini o'chirasizmi?`)) return;
        try {
            await deleteUnit(unitId);
            refetch();
            toast.success('Unit o\'chirildi');
        } catch {
            toast.error('Unit o\'chirishda xatolik');
        }
    };

    const isLoading = authLoading || unitsLoading || catLoading;

    if (authLoading || !user) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-950">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white flex flex-col mt-4">
            {/* ── Dashboard Explorer Header ── */}
            <div className="glass-card mb-8 px-8 py-10 relative overflow-hidden group/header">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48 transition-colors duration-700 pointer-events-none" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center gap-6">
                        <Link href="/teacher/dashboard"
                            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 shadow-lg group/back">
                            <ArrowLeft className="w-7 h-7 text-white/40 group-hover/back:text-white transition-colors" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase tracking-tighter">O'quv Unitlari</h1>
                                <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                    {units.length} Jami
                                </div>
                            </div>

                            {/* Premium Breadcrumb */}
                            <nav className="flex items-center flex-wrap gap-2">
                                <motion.button
                                    whileHover={{ x: 2 }}
                                    onClick={() => setCurrentPath([])}
                                    className={`text-[12px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${currentPath.length === 0 ? 'text-indigo-400' : 'text-white/20 hover:text-white/60'}`}
                                >
                                    <FolderOpen className="w-3.5 h-3.5" /> Asosiy
                                </motion.button>
                                {currentPath.map((p, idx) => (
                                    <div key={p._id} className="flex items-center gap-2">
                                        <ChevronRight className="w-3.5 h-3.5 text-white/10" />
                                        <motion.button
                                            whileHover={{ x: 2 }}
                                            onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                            className={`text-[12px] font-black uppercase tracking-[0.2em] transition-all ${idx === currentPath.length - 1 ? 'text-indigo-400' : 'text-white/20 hover:text-white/60'}`}
                                        >
                                            {p.name}
                                        </motion.button>
                                    </div>
                                ))}
                            </nav>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Elegant Search */}
                        <div className="relative group/search flex-1 sm:w-72 lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within/search:text-indigo-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Unit yoki kategoriya qidirish..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input-premium pl-12 h-14"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/5 text-white/20 hover:text-white transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="btn-secondary h-14 px-6 text-xs"
                            >
                                <Share2 className="w-4 h-4" /> Ulashish
                            </button>
                            <Link href={`/teacher/units/new${currentCatId ? `?categoryId=${currentCatId}` : ''}`}
                                className="btn-premium h-14 px-8 text-xs font-black shadow-indigo-500/20">
                                <Plus className="w-5 h-5" /> Yangi Unit
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-8 pb-20">
                {/* ── Left Side: Nested Tree ── */}
                <aside className="lg:w-80 shrink-0">
                    <div className="glass-card p-6 flex flex-col gap-6 sticky top-28 bg-white/[0.01]">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                <LayoutGrid className="w-3.5 h-3.5" /> Explorer
                            </h3>
                            <button
                                onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 100); }}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-indigo-400 hover:border-indigo-400/30 transition-all hover:bg-indigo-400/10"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                            {catLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="h-10 w-full rounded-xl bg-white/[0.03] animate-pulse mb-1" />
                                ))
                            ) : (
                                categoriesTree.map(node => (
                                    <TreeNode
                                        key={node._id}
                                        node={node}
                                        selectedId={currentCatId}
                                        onSelect={node => {
                                            const path = findPathToNode(categoriesTree, node._id, []);
                                            if (path) {
                                                setCurrentPath(path);
                                                setSearch('');
                                            }
                                        }}
                                        onDelete={handleDeleteFolder}
                                    />
                                ))
                            )}

                            {categoriesTree.length === 0 && !catLoading && (
                                <div className="py-10 text-center opacity-20">
                                    <p className="text-xs font-black uppercase tracking-widest">Kategoriyalar yo'q</p>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* ── Main View: Grid of Folders / Units ── */}
                <main className="flex-1 min-w-0 flex flex-col gap-8">
                    <AnimatePresence mode="wait">
                        {showNewFolder && (
                            <motion.form
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                onSubmit={handleCreateFolder}
                                className="glass-card p-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center !bg-indigo-500/[0.04] !border-indigo-500/30 shadow-2xl shadow-indigo-500/10"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                        <FolderPlus className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em] mb-1">Yangi Kategoriya nomi</p>
                                        <input
                                            ref={newFolderInputRef}
                                            type="text"
                                            placeholder="Masalan: Advanced Grammar..."
                                            value={newFolderName}
                                            onChange={e => setNewFolderName(e.target.value)}
                                            className="w-full bg-transparent border-none outline-none text-lg font-black text-white placeholder:text-white/10 p-0"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center">
                                    <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                                        className="h-10 px-6 rounded-xl text-xs font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-all">
                                        Bekor
                                    </button>
                                    <button type="submit" disabled={creatingFolder || !newFolderName.trim()}
                                        className="btn-premium h-11 px-6 text-xs font-black disabled:opacity-50 !rounded-xl">
                                        {creatingFolder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yaratish'}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                        {search && (
                            <motion.div
                                key="search-results"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                                    <Search className="w-5 h-5 text-indigo-400" />
                                    <h3 className="text-xl font-black text-white tracking-tight uppercase">
                                        Qidiruv natijalari: <span className="text-white/30 font-bold ml-1">"{search}"</span>
                                    </h3>
                                    <span className="ml-auto px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/10 text-xs font-black text-indigo-400">
                                        {currentUnits.length} ta topildi
                                    </span>
                                </div>

                                {currentUnits.length === 0 ? (
                                    <div className="glass-card p-24 text-center opacity-20 flex flex-col items-center gap-6">
                                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center">
                                            <Search className="w-10 h-10" />
                                        </div>
                                        <p className="text-lg font-black tracking-widest uppercase">Hech narsa topilmadi</p>
                                    </div>
                                ) : (
                                    <UnitsGrid units={currentUnits} onDelete={handleDeleteUnit} />
                                )}
                            </motion.div>
                        )}

                        {!search && currentCatId && (
                            <motion.div
                                key={`cat-${currentCatId}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-12"
                            >
                                {/* Subcategories */}
                                {currentFolders.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <FolderOpen className="w-5 h-5 text-indigo-400" />
                                            <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.4em]">Ichki kategoriyalar</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                            {currentFolders.map((folder, idx) => {
                                                const palettes = [
                                                    { color: 'indigo', icon: FolderOpen, text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                                                    { color: 'purple', icon: FolderOpen, text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                                                    { color: 'emerald', icon: FolderOpen, text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                                    { color: 'amber', icon: FolderOpen, text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                                                ];
                                                const p = palettes[idx % palettes.length];
                                                return (
                                                    <motion.div
                                                        key={folder._id}
                                                        whileHover={{ y: -4 }}
                                                        className="glass-card group flex flex-col items-stretch overflow-hidden !bg-white/[0.02]"
                                                    >
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleDeleteFolder(folder._id, folder.name); }}
                                                            className="absolute top-4 right-4 w-9 h-9 rounded-xl flex items-center justify-center text-white/5 hover:text-red-500 hover:bg-red-500/10 transition-all z-20"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            onClick={() => setCurrentPath([...currentPath, folder])}
                                                            className="p-8 text-left h-full flex flex-col gap-6"
                                                        >
                                                            <div className={`w-14 h-14 rounded-2xl ${p.bg} ${p.border} border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                                                                <p.icon className={`w-6 h-6 ${p.text}`} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-xl font-black text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-indigo-200 transition-colors uppercase">{folder.name}</h4>
                                                                <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] mt-2">Kategoriya</p>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-white/60 transition-colors">Explorer</span>
                                                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                                                            </div>
                                                        </button>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Units */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="w-5 h-5 text-indigo-400" />
                                            <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.4em]">Bo'limlar (Units)</h3>
                                        </div>
                                        <Link href={`/teacher/units/new?categoryId=${currentCatId}`}
                                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/40 hover:text-indigo-400 hover:border-indigo-400/30 uppercase tracking-widest transition-all">
                                            <Plus className="w-3.5 h-3.5 inline mr-1" /> Unit qo'shish
                                        </Link>
                                    </div>

                                    {currentUnits.length === 0 ? (
                                        <div className="glass-card p-20 text-center flex flex-col items-center gap-8 !bg-white/[0.01] border-dashed">
                                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center opacity-20">
                                                <BookOpen className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-white/60 uppercase tracking-tight mb-2">Unitlar topilmadi</h4>
                                                <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Bu kategoriya hozircha bo'sh</p>
                                            </div>
                                            <Link href={`/teacher/units/new?categoryId=${currentCatId}`} className="btn-premium px-8 py-4 text-xs font-black uppercase tracking-widest">
                                                Bitinchi Unitni yarating
                                            </Link>
                                        </div>
                                    ) : (
                                        <UnitsGrid units={currentUnits} onDelete={handleDeleteUnit} />
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {!search && !currentCatId && !catLoading && (
                            <motion.div
                                key="root-empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="glass-card p-24 text-center flex flex-col items-center gap-8 !bg-indigo-500/[0.02]"
                            >
                                <div className="flex -space-x-4">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center relative translate-y-4 -rotate-12 shadow-2xl">
                                        <FolderOpen className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative z-10 shadow-2xl">
                                        <BookOpen className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center relative translate-y-4 rotate-12 shadow-2xl">
                                        <Users className="w-8 h-8 text-purple-400" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black text-white tracking-tight uppercase tracking-tighter">Unitlarni Boshqarish Paneli</h3>
                                    <p className="text-white/30 text-[13px] font-black uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                                        Chap paneldan kategoriyani tanlang yoki unitlarni qidirishni boshlang.
                                    </p>
                                </div>
                                {categoriesTree.length === 0 && (
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button
                                            onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 100); }}
                                            className="btn-premium px-10 py-5 text-sm uppercase tracking-widest shadow-2xl"
                                        >
                                            <FolderPlus className="w-5 h-5" /> Bosh kategoriyani yaratish
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && (
                    <ShareModal
                        units={units}
                        onClose={() => setShowShareModal(false)}
                        onSuccess={refetch}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Units Grid Component ──────────────────────────────────────────────────
function UnitsGrid({ units, onDelete }: { units: Unit[]; onDelete: (id: string, title: string) => void }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {units.map((unit, idx) => (
                <motion.div
                    key={unit.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (idx % 10) * 0.05 }}
                >
                    <div className="glass-card p-8 group flex flex-col gap-6 !bg-white/[0.015] hover:!bg-indigo-500/[0.03] transition-all duration-500 h-full relative overflow-hidden">
                        {/* Glow orb */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

                        <div className="flex items-start justify-between relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-500 shadow-inner">
                                <BookOpen className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Created</p>
                                <p className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-white/40 uppercase tracking-tighter">
                                    {new Date(unit.createdAt).toLocaleDateString('uz-UZ')}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 relative z-10">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight group-hover:text-indigo-200 transition-colors line-clamp-2">
                                {unit.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] truncate">
                                    {unit.category || 'Categorized'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-stretch gap-3 pt-6 border-t border-white/5 relative z-10">
                            <Link href={`/teacher/units/${unit.id}`}
                                className="flex-1 flex items-center justify-center gap-2.5 h-12 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-indigo-500/10 hover:border-indigo-500/20 hover:text-indigo-400 transition-all active:scale-95"
                            >
                                <Edit className="w-4 h-4" /> Tahrirlash
                            </Link>
                            <button
                                onClick={() => onDelete(unit.id, unit.title)}
                                className="w-12 h-12 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-500/30 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all active:scale-90"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
