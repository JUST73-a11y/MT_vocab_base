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
    LayoutGrid, List, Filter, MoreVertical, Sparkles, Pencil
} from 'lucide-react';
import ShareModal from '@/components/teacher/ShareModal';
// FolderPlus is not available depending on lucide-react version. Swapping to Plus.
const FolderPlus = Plus;
const FolderMinus = X;

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
    onEdit,
}: {
    node: CategoryNode;
    depth?: number;
    selectedId: string | null;
    onSelect: (node: CategoryNode) => void;
    onDelete: (id: string, name: string) => void;
    onEdit: (node: CategoryNode) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const isSelected = node._id === selectedId;
    const hasChildren = node.children.length > 0;
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isSelected]);

    // Auto expand if selected
    useEffect(() => {
        if (isSelected) setExpanded(true);
    }, [isSelected]);

    return (
        <div className="select-none" ref={itemRef}>
            <motion.div
                initial={false}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer group transition-all text-base font-black relative overflow-hidden ${isSelected ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'}`}
                style={{ marginLeft: `${depth * 16}px` }}
            >
                {isSelected && (
                    <motion.div
                        layoutId="tree-active"
                        className="absolute inset-0 bg-indigo-500/10 border-l-[3px] border-indigo-500"
                    />
                )}

                {hasChildren ? (
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0 opacity-40 hover:opacity-100 transition-opacity z-10 p-1">
                        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                ) : <span className="w-7 h-7 shrink-0 z-10" />}

                <button onClick={() => onSelect(node)} className="flex items-center gap-4 flex-1 text-left truncate z-10">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${isSelected ? 'bg-indigo-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        <FolderOpen className={`w-6 h-6 shrink-0 transition-colors ${isSelected ? 'text-indigo-400 fill-indigo-400/10' : 'text-indigo-400/40 group-hover:text-indigo-400/70'}`} />
                    </div>
                    <span className="truncate text-[15px] tracking-tight uppercase">{node.name}</span>
                </button>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(node); }}
                        className="p-2.5 rounded-xl text-white/10 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all shrink-0"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(node._id, node.name); }}
                        className="p-2.5 rounded-xl text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
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
                                selectedId={selectedId} onSelect={onSelect} onDelete={onDelete} onEdit={onEdit} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Share Modal ───────────────────────────────────────────────────────────

// ── Units Grid Component (with Select & Move) ────────────────────
function UnitsGrid({
    units,
    onDelete,
    selectedUnits = new Set(),
    onToggleSelect,
    onMove
}: {
    units: any[],
    onDelete: (id: string, title: string) => void,
    selectedUnits?: Set<string>,
    onToggleSelect?: (id: string, e?: React.MouseEvent) => void,
    onMove?: (unit: any) => void
}) {
    if (units.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {units.map((unit) => {
                const isSelected = selectedUnits.has(unit.id);
                return (
                    <motion.div
                        key={unit.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group flex flex-col items-stretch overflow-hidden relative transition-all duration-300 hover:-translate-y-1.5 cursor-pointer"
                        style={{
                            background: isSelected ? 'rgba(16,185,129,0.15)' : 'var(--theme-card-bg, rgba(15,20,35,0.45))',
                            backdropFilter: 'var(--theme-card-blur, blur(16px))',
                            WebkitBackdropFilter: 'var(--theme-card-blur, blur(16px))',
                            border: isSelected ? '1px solid rgba(16,185,129,0.5)' : '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                            borderRadius: 'var(--theme-radius-card, 16px)',
                            boxShadow: isSelected ? '0 0 30px rgba(16,185,129,0.15)' : 'var(--theme-shadow-card, none)',
                        }}
                        onClick={(e) => {
                            if (onToggleSelect) {
                                onToggleSelect(unit.id, e as any);
                            }
                        }}
                    >
                        {/* Selection Checkbox Overlay */}
                        {onToggleSelect && (
                            <div className="absolute top-4 left-4 z-20">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-white/20 bg-black/50 text-transparent group-hover:border-white/40'
                                    }`}>
                                    <Check className="w-4 h-4" strokeWidth={3} />
                                </div>
                            </div>
                        )}

                        <div className="p-5 sm:p-6 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-4 mb-4 sm:mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-inner shrink-0 transition-transform group-hover:scale-110"
                                    style={{
                                        borderRadius: 'var(--theme-radius-btn, 14px)',
                                        background: isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
                                        border: isSelected ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--theme-border, rgba(255,255,255,0.15))',
                                        color: isSelected ? '#34d399' : 'var(--theme-primary, #6366f1)',
                                    }}>
                                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex items-center gap-1 shrink-0 bg-black/50 p-1 rounded-xl backdrop-blur-md" onClick={e => e.stopPropagation()}>
                                    <Link
                                        href={`/teacher/units/${unit.id}`}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                        title="Tahrirlash"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href={`/teacher/students?unitId=${unit.id}`}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                        title="O'quvchilar"
                                    >
                                        <Users className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(unit.id, unit.title); }}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        title="O'chirish"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h4 className={`text-lg sm:text-lg font-black uppercase tracking-tight line-clamp-2 leading-tight break-words mb-2 ${isSelected ? 'text-emerald-400' : 'text-white group-hover:text-indigo-200'
                                } transition-colors`}>
                                {unit.title}
                            </h4>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] line-clamp-1 mb-1">
                                {typeof unit.category === 'string' ? unit.category : (unit.category?.name || 'Asosiy')}
                            </p>
                            {unit.creatorName && (
                                <p className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest line-clamp-1 mb-4 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {unit.creatorName}
                                </p>
                            )}
                            {!unit.creatorName && <div className="mb-4"></div>}

                            <div className="mt-auto pt-4 sm:pt-6 border-t border-white/5 flex gap-2" onClick={e => e.stopPropagation()}>
                                <Link
                                    href={`/teacher/units/${unit.id}`}
                                    className="btn-secondary flex-1 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-center"
                                >
                                    Boshqarish
                                </Link>
                                {onMove && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onMove(unit); }}
                                        className="btn-secondary py-2 sm:py-2.5 px-3 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                        title="Boshqa paktaga ko'chirish"
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ── Move Modal ────────────────────────────────────────────────────────────
function MoveModal({
    units,
    categoriesTree,
    onClose,
    onSuccess,
}: {
    units: Unit[];
    categoriesTree: CategoryNode[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [moving, setMoving] = useState(false);

    const handleMove = async () => {
        setMoving(true);
        try {
            const res = await apiFetch('/api/teacher/units/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unitIds: units.map(u => u.id),
                    targetCategoryId: selectedCategoryId
                }),
            });
            toast.success((res as any).message || 'Unitlar ko\'chirildi');
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Ko\'chirishda xatolik yuz berdi');
        } finally {
            setMoving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card w-full max-w-md flex flex-col max-h-[90vh] relative !bg-gray-950/80"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Ko&apos;chirish</h2>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">
                            {units.length} ta unit tanlandi
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Maqsadli kategoriyani tanlang</p>
                    <div className="space-y-1 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <button
                            onClick={() => setSelectedCategoryId(null)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left text-sm font-bold ${selectedCategoryId === null ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                        >
                            <FolderOpen className="w-4 h-4 shrink-0" />
                            Asosiy (Kategoriyasiz)
                        </button>

                        {categoriesTree.map(node => (
                            <TreeNode
                                key={node._id}
                                node={node}
                                selectedId={selectedCategoryId}
                                onSelect={(n: CategoryNode) => setSelectedCategoryId(n._id)}
                                onDelete={() => { }} // Disabled in move modal
                                onEdit={() => { }} // Disabled in move modal
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 flex gap-3 bg-white/[0.01]">
                    <button onClick={onClose} className="btn-secondary flex-1 h-12 uppercase tracking-widest text-xs font-black">Bekor</button>
                    <button
                        onClick={handleMove}
                        disabled={moving}
                        className="btn-premium flex-1 h-12 uppercase tracking-widest text-xs font-black disabled:opacity-50 !bg-gradient-to-r !from-emerald-500 !to-teal-500 !shadow-emerald-500/20"
                    >
                        {moving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Shu yerga ko\'chirish'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Edit Folder Modal ───────────────────────────────────────────────────
function EditFolderModal({
    category,
    categoriesTree,
    onClose,
    onSuccess,
}: {
    category: CategoryNode;
    categoriesTree: CategoryNode[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [name, setName] = useState(category.name);
    const [parentId, setParentId] = useState<string | null>(category.parentId || null);
    const [updating, setUpdating] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setUpdating(true);
        try {
            await apiFetch(`/api/teacher/categories/${category._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), parentId: parentId })
            });
            toast.success('Papkada o\'zgarishlar saqlandi');
            onSuccess();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Xatolik yuz berdi');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card w-full max-w-lg flex flex-col max-h-[90vh] relative !bg-gray-950/80 shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Papkani Tahrirlash</h2>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Nomi yoki joylashuvini o'zgartiring</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleUpdate} className="p-8 flex flex-col gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block">Papka nomi</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="input-premium w-full"
                            placeholder="Papka nomini kiriting..."
                        />
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col">
                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] block">Joylashuv (Ota papka)</label>
                        <div className="flex-1 overflow-y-auto max-h-[300px] bg-white/[0.02] border border-white/10 rounded-2xl p-4 custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => setParentId(null)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-sm font-black mb-2 uppercase tracking-tight ${parentId === null ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'}`}
                            >
                                <FolderOpen className="w-4 h-4 shrink-0" />
                                Asosiy (Root)
                            </button>

                            {/* Self and children should be filtered or blocked in PATCH, handling visually here */}
                            {categoriesTree.map(node => (
                                <TreeNode
                                    key={node._id}
                                    node={node}
                                    depth={0}
                                    selectedId={parentId}
                                    onSelect={(n: CategoryNode) => {
                                        if (n._id === category._id) {
                                            toast.error('O\'ziga ko\'chirib bo\'lmaydi');
                                            return;
                                        }
                                        setParentId(n._id);
                                    }}
                                    onDelete={() => {}} 
                                    onEdit={() => {}}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 mt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1 h-14 uppercase tracking-widest text-xs font-black">Bekor qilish</button>
                        <button
                            type="submit"
                            disabled={updating || !name.trim()}
                            className="btn-premium flex-1 h-14 uppercase tracking-widest text-xs font-black disabled:opacity-50"
                        >
                            {updating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Saqlash'}
                        </button>
                    </div>
                </form>
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

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'folder' | 'unit' | 'bulk-unit'; id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Multi-select & Move State
    const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [unitsToMove, setUnitsToMove] = useState<Unit[]>([]);

    // Sync State
    const [syncing, setSyncing] = useState(false);

    // Folder Edit State
    const [editingFolder, setEditingFolder] = useState<CategoryNode | null>(null);

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

    // ShareModal uchun faqat o'zi yaratgan unitlar (boshqalarnikini qayta ulashmaslik)
    const myUnits = units.filter(u => u.createdBy === user?.id);

    // Units filtered by current category + search (barcha unitlar: o'z + shared)
    const baseUnits = currentCatId
        ? units.filter(u => {
            // Match by ID if available
            if (u.categoryId) return u.categoryId === currentCatId;
            // Fallback: match by name if ID is missing (legacy units)
            const currentNode = findNode(categoriesTree, currentCatId);
            return currentNode && u.category === currentNode.name;
        })
        : units.filter(u => !u.categoryId || u.categoryId === 'uncategorized');
    const currentUnits = search
        ? units.filter(u => u.title.toLowerCase().includes(search.toLowerCase()))
        : baseUnits;

    // Selection Handlers
    const toggleUnitSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedUnits(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllCurrentUnits = () => {
        if (selectedUnits.size === currentUnits.length && currentUnits.length > 0) {
            setSelectedUnits(new Set()); // Deselect all currently visible
        } else {
            const next = new Set(selectedUnits);
            currentUnits.forEach(u => next.add(u.id));
            setSelectedUnits(next);
        }
    };

    const handleInitiateBulkMove = () => {
        const toMove = units.filter(u => selectedUnits.has(u.id));
        if (toMove.length > 0) {
            setUnitsToMove(toMove);
            setShowMoveModal(true);
        }
    };

    const handleInitiateBulkDelete = () => {
        if (selectedUnits.size > 0) {
            setDeleteModal({
                isOpen: true,
                type: 'bulk-unit',
                id: 'bulk',
                name: `${selectedUnits.size} ta unitni`
            });
        }
    };

    const handleInitiateSingleMove = (unit: Unit) => {
        setUnitsToMove([unit]);
        setShowMoveModal(true);
    };

    const handleEditFolder = (node: CategoryNode) => {
        setEditingFolder(node);
    };

    const handleDeleteFolder = (id: string, name: string) => {
        setDeleteModal({ isOpen: true, type: 'folder', id, name });
    };

    const confirmDeleteFolder = async () => {
        if (!deleteModal) return;
        setDeleting(true);
        try {
            await apiFetch(`/api/teacher/categories/${deleteModal.id}`, { method: 'DELETE' });
            if (currentCatId === deleteModal.id) setCurrentPath([]);
            treeRefetch();
            refetch();
            toast.success('Kategoriya o\'chirildi');
            setDeleteModal(null);
        } catch (e) {
            toast.error('O\'chirishda xatolik');
        } finally {
            setDeleting(false);
        }
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

    const handleDeleteUnit = (unitId: string, title: string) => {
        setDeleteModal({ isOpen: true, type: 'unit', id: unitId, name: title });
    };

    const confirmDeleteUnit = async () => {
        if (!deleteModal) return;
        setDeleting(true);
        try {
            const unitIds = deleteModal.type === 'bulk-unit' 
                ? Array.from(selectedUnits) 
                : [deleteModal.id];

            await apiFetch('/api/teacher/units/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unitIds })
            });

            setSelectedUnits(prev => {
                const next = new Set(prev);
                unitIds.forEach(id => next.delete(id));
                return next;
            });

            refetch();
            router.refresh(); 
            toast.success(deleteModal.type === 'bulk-unit' ? 'Unitlar o\'chirildi' : 'Unit o\'chirildi');
            setDeleteModal(null);
        } catch {
            toast.error('O\'chirishda xatolik yuz berdi');
        } finally {
            setDeleting(false);
        }
    };

    const handleSyncCategories = async () => {
        const uniqueCatNames = Array.from(new Set(
            units.map(u => u.category?.trim()).filter(Boolean)
        ));

        if (uniqueCatNames.length === 0) {
            toast.error("Sinxronizatsiya uchun unitlar topilmadi");
            return;
        }

        setSyncing(true);
        try {
            await apiFetch('/api/teacher/categories/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories: uniqueCatNames })
            });

            toast.success("Kategoriyalar muvaffaqiyatli tiklandi!");
            treeRefetch();
        } catch (err: any) {
            toast.error(err?.message || "Sinxronizatsiyada xatolik");
        } finally {
            setSyncing(false);
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
            <div className="mb-8 px-8 py-10 relative overflow-hidden group/header"
                style={{
                    background: 'var(--theme-card-bg, rgba(15,20,35,0.45))',
                    backdropFilter: 'var(--theme-card-blur, blur(16px))',
                    WebkitBackdropFilter: 'var(--theme-card-blur, blur(16px))',
                    border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                    borderRadius: 'var(--theme-radius-card, 20px)',
                    boxShadow: 'var(--theme-shadow-card, none)',
                }}>
                <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] -mr-48 -mt-48 transition-colors duration-700 pointer-events-none opacity-20"
                    style={{ background: 'var(--theme-primary, #6366f1)' }} />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center gap-6">
                        <Link href="/teacher/dashboard"
                            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg group/back"
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                                borderRadius: 'var(--theme-radius-btn, 16px)',
                            }}>
                            <ArrowLeft className="w-7 h-7 text-white/40 group-hover/back:text-white transition-colors" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase tracking-tighter">O'quv Unitlari</h1>
                                <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                                        color: 'var(--theme-primary, #a5b4fc)',
                                        borderRadius: 'var(--theme-radius-btn, 10px)',
                                    }}>
                                    {units.length} Jami
                                </div>
                            </div>

                            {/* Premium Breadcrumb */}
                            <nav className="flex items-center flex-wrap gap-2">
                                <motion.button
                                    whileHover={{ x: 2 }}
                                    onClick={() => setCurrentPath([])}
                                    className="text-[12px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                                    style={{ color: currentPath.length === 0 ? 'var(--theme-primary, #6366f1)' : 'rgba(255,255,255,0.3)' }}
                                >
                                    <FolderOpen className="w-3.5 h-3.5" /> Asosiy
                                </motion.button>
                                {currentPath.map((p, idx) => (
                                    <div key={p._id} className="flex items-center gap-2">
                                        <ChevronRight className="w-3.5 h-3.5 text-white/10" />
                                        <motion.button
                                            whileHover={{ x: 2 }}
                                            onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                            className="text-[12px] font-black uppercase tracking-[0.2em] transition-all"
                                            style={{ color: idx === currentPath.length - 1 ? 'var(--theme-primary, #6366f1)' : 'rgba(255,255,255,0.3)' }}
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
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within/search:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Unit yoki kategoriya qidirish..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input-premium pl-12 h-14"
                                style={{
                                    borderRadius: 'var(--theme-radius-btn, 14px)',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                                }}
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/5 text-white/20 hover:text-white transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="btn-base btn-secondary btn-md"
                            >
                                <Share2 className="w-4 h-4 shrink-0" /> Ulashish
                            </button>
                            <button
                                onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 100); }}
                                className="btn-base btn-secondary btn-md"
                            >
                                <Plus className="w-4 h-4 shrink-0" /> Yangi Papka
                            </button>
                            <Link href={`/teacher/units/new${currentCatId ? `?categoryId=${currentCatId}` : ''}`}
                                className="btn-base btn-primary btn-md">
                                <Plus className="w-4 h-4 shrink-0" /> Yangi Unit
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-8 pb-20">
                {/* ── Left Side: Nested Tree ── */}
                <aside className="lg:w-80 shrink-0">
                    <div className="p-6 flex flex-col gap-6 sticky top-28"
                        style={{
                            background: 'var(--theme-card-bg, rgba(15,20,35,0.45))',
                            backdropFilter: 'var(--theme-card-blur, blur(16px))',
                            WebkitBackdropFilter: 'var(--theme-card-blur, blur(16px))',
                            border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                            borderRadius: 'var(--theme-radius-card, 20px)',
                            boxShadow: 'var(--theme-shadow-card, none)',
                        }}>
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                                <LayoutGrid className="w-3.5 h-3.5" /> Explorer
                            </h3>
                            <button
                                onClick={() => { setShowNewFolder(true); setTimeout(() => newFolderInputRef.current?.focus(), 100); }}
                                className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/20 transition-all active:scale-95 shadow-lg shadow-purple-500/5 group/add"
                            >
                                <Plus className="w-5 h-5 group-hover/add:rotate-90 transition-transform duration-300" />
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
                                        onEdit={handleEditFolder}
                                    />
                                ))
                            )}

                            {categoriesTree.length === 0 && !catLoading && (
                                <div className="py-10 text-center flex flex-col items-center gap-4 bg-white/[0.02] rounded-2xl border border-dashed border-white/5 mx-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Kategoriyalar yo'q</p>
                                    {units.length > 0 && (
                                        <button 
                                            onClick={handleSyncCategories}
                                            disabled={syncing}
                                            className="px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500/20 hover:text-indigo-300 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-indigo-400" /> : 'Kategoriyalarni tiklash'}
                                        </button>
                                    )}
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
                                className="glass-card p-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center !bg-indigo-500/[0.04] !border-indigo-500/30 shadow-2xl shadow-indigo-500/10 min-w-0"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                        <FolderPlus className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-indigo-400/60 uppercase tracking-[0.2em] mb-1 truncate">Yangi Kategoriya nomi</p>
                                        <input
                                            ref={newFolderInputRef}
                                            type="text"
                                            placeholder="Masalan: Advanced Grammar..."
                                            value={newFolderName}
                                            onChange={e => setNewFolderName(e.target.value)}
                                            className="w-full bg-transparent border-none outline-none text-lg font-black text-white placeholder:text-white/10 p-0 truncate"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                    <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                                        className="h-10 px-4 sm:px-6 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/5 transition-all">
                                        Bekor
                                    </button>
                                    <button type="submit" disabled={creatingFolder || !newFolderName.trim()}
                                        className="btn-premium h-11 px-4 sm:px-6 text-[10px] sm:text-xs font-black disabled:opacity-50 !rounded-xl">
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
                                className="space-y-6 min-w-0"
                            >
                                <div className="flex items-center gap-3 border-b border-white/5 pb-4 flex-wrap">
                                    <Search className="w-5 h-5 text-indigo-400 shrink-0" />
                                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase break-words min-w-0 flex-1 leading-tight">
                                        Qidiruv natijalari: <span className="text-white/30 font-bold ml-1 break-all">"{search}"</span>
                                    </h3>
                                    <span className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/10 text-[10px] sm:text-xs font-black text-indigo-400 whitespace-nowrap shrink-0">
                                        {currentUnits.length} ta topildi
                                    </span>
                                </div>

                                {currentUnits.length === 0 ? (
                                    <div className="glass-card p-12 sm:p-24 text-center opacity-20 flex flex-col items-center gap-6 w-full">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center shrink-0">
                                            <Search className="w-8 h-8 sm:w-10 sm:h-10" />
                                        </div>
                                        <p className="text-lg font-black tracking-widest uppercase text-center break-words max-w-full">Hech narsa topilmadi</p>
                                    </div>
                                ) : (
                                    <UnitsGrid
                                        units={currentUnits}
                                        selectedUnits={selectedUnits}
                                        onToggleSelect={toggleUnitSelection}
                                        onDelete={handleDeleteUnit}
                                        onMove={handleInitiateSingleMove}
                                    />
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
                                                        className="group flex flex-col items-stretch overflow-hidden relative"
                                                        style={{
                                                            background: 'var(--theme-card-bg, rgba(15,20,35,0.45))',
                                                            backdropFilter: 'var(--theme-card-blur, blur(16px))',
                                                            WebkitBackdropFilter: 'var(--theme-card-blur, blur(16px))',
                                                            border: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                                                            borderRadius: 'var(--theme-radius-card, 16px)',
                                                            boxShadow: 'var(--theme-shadow-card, none)',
                                                        }}
                                                    >
                                                        <div className="absolute top-4 right-4 flex items-center gap-1 z-20">
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleEditFolder(folder); }}
                                                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/5 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleDeleteFolder(folder._id, folder.name); }}
                                                                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/5 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        <button
                                                            onClick={() => setCurrentPath([...currentPath, folder])}
                                                            className="p-8 text-left h-full flex flex-col gap-6"
                                                        >
                                                            <div className={`w-14 h-14 rounded-2xl ${p.bg} ${p.border} border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner shrink-0`}>
                                                                <p.icon className={`w-6 h-6 ${p.text}`} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-xl font-black text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-indigo-200 transition-colors break-words">{folder.name}</h4>
                                                                <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] mt-2 truncate">Kategoriya</p>
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
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="w-5 h-5 text-indigo-400" />
                                            <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.4em]">Bo'limlar (Units)</h3>
                                        </div>
                                        {currentUnits.length > 0 && (
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={toggleAllCurrentUnits}
                                                    className="btn-base btn-ghost btn-sm text-xs font-bold"
                                                >
                                                    {selectedUnits.size > 0 && selectedUnits.size >= currentUnits.length ? (
                                                        <>Bekor qilish</>
                                                    ) : (
                                                        <>Barchasini tanlash</>
                                                    )}
                                                </button>
                                                <Link href={`/teacher/units/new?categoryId=${currentCatId}`}
                                                    className="btn-base btn-secondary btn-sm text-xs font-bold">
                                                    <Plus className="w-4 h-4 shrink-0" /> Unit qo'shish
                                                </Link>
                                            </div>
                                        )}
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
                                        <UnitsGrid
                                            units={currentUnits}
                                            selectedUnits={selectedUnits}
                                            onToggleSelect={toggleUnitSelection}
                                            onDelete={handleDeleteUnit}
                                            onMove={handleInitiateSingleMove}
                                        />
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {!search && !currentCatId && !catLoading && (
                            <motion.div
                                key="root-view"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-12"
                            >
                                <motion.div
                                    className="glass-card p-12 sm:p-20 text-center flex flex-col items-center gap-8 !bg-indigo-500/[0.02]"
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

                                {/* Root Level Units */}
                                {currentUnits.length > 0 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <BookOpen className="w-5 h-5 text-indigo-400" />
                                                <h3 className="text-sm font-black text-white/30 uppercase tracking-[0.4em]">Asosiy Bo'limlar</h3>
                                            </div>
                                            <button
                                                onClick={toggleAllCurrentUnits}
                                                className="btn-base btn-ghost btn-sm text-xs font-bold"
                                            >
                                                {selectedUnits.size > 0 && selectedUnits.size >= currentUnits.length ? 'Bekor qilish' : 'Barchasini tanlash'}
                                            </button>
                                        </div>
                                        <UnitsGrid
                                            units={currentUnits}
                                            selectedUnits={selectedUnits}
                                            onToggleSelect={toggleUnitSelection}
                                            onDelete={handleDeleteUnit}
                                            onMove={handleInitiateSingleMove}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* Selection Action Bar (Floating) */}
            <AnimatePresence>
                {selectedUnits.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] glass-card px-6 py-4 flex items-center gap-6 shadow-2xl shadow-emerald-500/20 !border-emerald-500/30 !bg-gray-950/90"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                                {selectedUnits.size}
                            </div>
                            <span className="text-sm font-black text-white uppercase tracking-widest">tanlandi</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedUnits(new Set())}
                                className="px-4 py-2 rounded-xl text-xs font-black text-white/40 hover:text-white hover:bg-white/10 uppercase tracking-widest transition-all"
                            >
                                Bekor
                            </button>
                            <button
                                onClick={handleInitiateBulkDelete}
                                className="px-6 py-2.5 rounded-xl text-xs font-black text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-500/5 mr-2"
                            >
                                O'chirish
                            </button>
                            <button
                                onClick={handleInitiateBulkMove}
                                className="px-6 py-2.5 rounded-xl text-xs font-black text-black bg-emerald-400 hover:bg-emerald-300 uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                            >
                                Ko'chirish
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && (
                    <ShareModal
                        units={myUnits}
                        categoriesTree={categoriesTree}
                        onClose={() => setShowShareModal(false)}
                        onSuccess={refetch}
                    />
                )}
            </AnimatePresence>

            {/* Move Modal */}
            <AnimatePresence>
                {showMoveModal && (
                    <MoveModal
                        units={unitsToMove}
                        categoriesTree={categoriesTree}
                        onClose={() => setShowMoveModal(false)}
                        onSuccess={() => {
                            setSelectedUnits(new Set());
                            refetch();
                            treeRefetch();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Edit Folder Modal */}
            <AnimatePresence>
                {editingFolder && (
                    <EditFolderModal
                        category={editingFolder}
                        categoriesTree={categoriesTree}
                        onClose={() => setEditingFolder(null)}
                        onSuccess={() => {
                            treeRefetch();
                            refetch();
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={!!deleteModal?.isOpen}
                title={deleteModal?.type === 'folder' ? 'Papkani o\'chirish' : 'Unitni o\'chirish'}
                message={deleteModal?.type === 'folder' 
                    ? `"${deleteModal?.name}" papkasini o'chirishni tasdiqlaysizmi?\n\nDIQQAT: Ichidagi barcha papkalar va unitlar ham butunlay o'chib ketadi!`
                    : `"${deleteModal?.name}" unitini o'chirishni tasdiqlaysizmi?`}
                onConfirm={deleteModal?.type === 'folder' ? confirmDeleteFolder : confirmDeleteUnit}
                onCancel={() => setDeleteModal(null)}
                loading={deleting}
            />
        </div>
    );
}


