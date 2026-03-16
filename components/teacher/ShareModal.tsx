'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, X, Users, ChevronDown, Search, FolderOpen, Loader2, Send, AlertCircle, Check, BookOpen } from 'lucide-react';
import { apiFetch } from '@/lib/apiFetch';
import { Unit } from '@/lib/types';
import { CategoryNode } from '@/lib/useCategoryTree';
import toast from 'react-hot-toast';

interface ShareModalProps {
    units: Unit[];
    categoriesTree: CategoryNode[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function ShareModal({
    units,
    categoriesTree,
    onClose,
    onSuccess,
}: ShareModalProps) {
    const [teacherCode, setTeacherCode] = useState('');
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sharing, setSharing] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

    // Fetch teachers for selection
    useEffect(() => {
        const fetchTeachers = async () => {
            setLoadingTeachers(true);
            try {
                const data = await apiFetch('/api/teacher/list') as any[];
                setTeachers(data || []);
            } catch (e) {
                
            } finally {
                setLoadingTeachers(false);
            }
        };
        fetchTeachers();
    }, []);

    const filtered = units.filter(u => u.title.toLowerCase().includes(search.toLowerCase()));
    
    // Group filtered units by categoryId for easy access in tree
    const unitsByCatId = filtered.reduce<Record<string, Unit[]>>((acc, unit) => {
        const catId = unit.categoryId || 'root';
        if (!acc[catId]) acc[catId] = [];
        acc[catId].push(unit);
        return acc;
    }, {});

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const getAllSubtreeUnitIds = (node: CategoryNode): string[] => {
        let ids = (unitsByCatId[node._id] || []).map(u => u.id);
        node.children.forEach(child => {
            ids = [...ids, ...getAllSubtreeUnitIds(child)];
        });
        return ids;
    };

    const toggleCategorySelection = (node: CategoryNode | 'root') => {
        const ids = node === 'root' 
            ? (unitsByCatId['root'] || []).map(u => u.id)
            : getAllSubtreeUnitIds(node);
        
        if (ids.length === 0) return;

        const allInCatSelected = ids.every(id => selected.has(id));
        setSelected(prev => {
            const next = new Set(prev);
            if (allInCatSelected) {
                ids.forEach(id => next.delete(id));
            } else {
                ids.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const toggleExpand = (catId: string) => {
        setExpandedCats(prev => {
            const next = new Set(prev);
            next.has(catId) ? next.delete(catId) : next.add(catId);
            return next;
        });
    };

    const handleShare = async () => {
        if (!teacherCode.trim() || selected.size === 0) return;
        setSharing(true);
        setErrors([]);
        try {
            const res = await apiFetch('/api/teacher/unit-shares/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toTeacherCode: teacherCode.trim().toUpperCase(), unitIds: Array.from(selected) }),
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

    // Recursive tree node for sharing
    const ShareTreeNode = ({ node, depth = 0 }: { node: CategoryNode, depth?: number }) => {
        const catUnits = unitsByCatId[node._id] || [];
        const subtreeIds = getAllSubtreeUnitIds(node);
        const isExpanded = expandedCats.has(node._id);
        const allInCatSelected = subtreeIds.length > 0 && subtreeIds.every(id => selected.has(id));
        const someInCatSelected = subtreeIds.some(id => selected.has(id));

        if (subtreeIds.length === 0 && node.children.length === 0 && catUnits.length === 0) return null;

        return (
            <div className="space-y-2">
                <div 
                    className={`flex items-center gap-4 px-6 py-5 rounded-2xl bg-white/[0.02] border transition-all group/node cursor-pointer ${allInCatSelected ? 'border-indigo-500/40 bg-indigo-500/[0.04]' : 'border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}
                    style={{ marginLeft: `${depth * 24}px` }}
                    onClick={() => toggleExpand(node._id)}
                >
                    <button className="shrink-0 text-white/30 group-hover/node:text-white/60 transition-colors p-1">
                        <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? '' : '-rotate-90'}`} />
                    </button>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${allInCatSelected ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5 group-hover/node:border-white/10'} border`}>
                        <FolderOpen className={`w-7 h-7 shrink-0 transition-colors ${allInCatSelected ? 'text-indigo-400' : 'text-indigo-400/60 group-hover/node:text-indigo-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className={`text-base font-black uppercase tracking-tight block truncate transition-colors ${allInCatSelected ? 'text-white' : 'text-white/70 group-hover/node:text-white'}`}>{node.name}</span>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{subtreeIds.length} unitlar</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleCategorySelection(node); }}
                        className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${allInCatSelected
                            ? 'bg-indigo-500 text-white border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                            : someInCatSelected
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
                    >
                        {allInCatSelected ? 'Tanlangan' : 'Tanlash'}
                    </button>
                </div>

                {isExpanded && (
                    <div className="space-y-1.5">
                        {/* Units in this category */}
                        {catUnits.map(unit => (
                            <button
                                key={unit.id}
                                onClick={() => toggle(unit.id)}
                                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-left group/item ${selected.has(unit.id) ? 'bg-indigo-500/[0.08] border-indigo-500/20' : 'hover:bg-white/[0.04] border-transparent'} border`}
                                style={{ marginLeft: `${(depth + 1) * 24}px` }}
                            >
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${selected.has(unit.id)
                                    ? 'bg-indigo-500 border-indigo-500 scale-110'
                                    : 'border-white/10 group-hover/item:border-white/30'}`}>
                                    {selected.has(unit.id) && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                                </div>
                                <p className={`text-[14px] font-black uppercase tracking-tight truncate flex-1 transition-colors ${selected.has(unit.id) ? 'text-white' : 'text-white/60 group-hover/item:text-white/80'}`}>{unit.title}</p>
                            </button>
                        ))}
                        {/* Child categories */}
                        {node.children.map(child => (
                            <ShareTreeNode key={child._id} node={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card w-full max-w-2xl flex flex-col max-h-[90vh] relative !bg-gray-950/80 shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

                {/* Header */}
                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                            <Share2 className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-tighter">Unitlarni Ulashish</h2>
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
                    {/* Teacher Selection Section */}
                    <div className="px-10 py-6 bg-white/[0.02] border-b border-white/5 space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 block">Qabul qiluvchi o'qituvchini tanlang</label>
                            <div className="relative group/select">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within/select:text-indigo-400 transition-colors">
                                    <Users className="w-full h-full" />
                                </div>
                                <select 
                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-10 text-base font-black text-white outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                                    onChange={(e) => setTeacherCode(e.target.value)}
                                    value={teachers.some(t => t.teacherCode === teacherCode) ? teacherCode : ''}
                                >
                                    <option value="" className="bg-gray-900">O'qituvchini tanlang...</option>
                                    {teachers.map(t => (
                                        <option key={t.teacherCode} value={t.teacherCode} className="bg-gray-900">
                                            {t.name} ({t.teacherCode})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronDown className="w-5 h-5 text-white/20" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-px bg-white/5 flex-1" />
                            <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">yoki kod kiritish</span>
                            <div className="h-px bg-white/5 flex-1" />
                        </div>

                        <div className="relative group/input">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within/input:text-indigo-400 transition-colors">
                                <Users className="w-full h-full" />
                            </div>
                            <input
                                type="text"
                                placeholder="O'qituvchi kodi (T-XXXXXX)"
                                value={teacherCode}
                                onChange={e => setTeacherCode(e.target.value.toUpperCase())}
                                className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 text-base font-black text-white placeholder:text-white/10 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                    </div>

                    {/* Units list grouped by category */}
                    <div className="p-10 flex-1 overflow-hidden flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" /> Papkalar bo'yicha
                            </h3>
                            <button onClick={() => setSelected(new Set(filtered.map(u => u.id)))} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400 hover:bg-indigo-500/20 uppercase tracking-widest transition-all">
                                Barchasini tanlash
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                placeholder="Unit nomini qidiring..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-xl pl-11 pr-4 text-sm font-bold text-white placeholder:text-white/10 outline-none focus:border-indigo-500/30 transition-all"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {!search ? (
                                <>
                                    {/* Root Units */}
                                    {(unitsByCatId['root'] || []).length > 0 && (
                                        <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.01]">
                                            <div 
                                                className={`flex items-center gap-4 px-6 py-5 bg-white/[0.02] border-b border-white/5 cursor-pointer group/node ${ (unitsByCatId['root'] || []).every(u => selected.has(u.id)) ? 'bg-indigo-500/[0.04]' : 'hover:bg-white/[0.02]' }`}
                                                onClick={() => toggleExpand('root')}
                                            >
                                                <button className="shrink-0 text-white/30 group-hover/node:text-white/60 transition-colors p-1">
                                                    <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${expandedCats.has('root') ? '' : '-rotate-90'}`} />
                                                </button>
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${(unitsByCatId['root'] || []).every(u => selected.has(u.id)) ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5'} border shadow-lg`}>
                                                    <FolderOpen className={`w-8 h-8 shrink-0 transition-colors ${(unitsByCatId['root'] || []).every(u => selected.has(u.id)) ? 'text-indigo-400' : 'text-indigo-400/60'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-lg font-black text-white/90 uppercase tracking-tight block truncate">Asosiy (Kategoriyasiz)</span>
                                                    <p className="text-[11px] font-black text-white/20 uppercase tracking-widest mt-1">{(unitsByCatId['root'] || []).length} unitlar</p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleCategorySelection('root'); }}
                                                    className={`px-6 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all border ${(unitsByCatId['root'] || []).every(u => selected.has(u.id))
                                                        ? 'bg-indigo-500 text-white border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                                                        : (unitsByCatId['root'] || []).some(u => selected.has(u.id))
                                                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                                            : 'bg-white/5 border-white/10 text-white/30 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
                                                >
                                                    {(unitsByCatId['root'] || []).every(u => selected.has(u.id)) ? 'Tanlangan' : 'Tanlash'}
                                                </button>
                                            </div>
                                            {(expandedCats.has('root') || expandedCats.size === 0) && (
                                                <div className="p-2 space-y-1.5">
                                                    {(unitsByCatId['root'] || []).map(unit => (
                                                        <button
                                                            key={unit.id}
                                                            onClick={() => toggle(unit.id)}
                                                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-left group/item ${selected.has(unit.id) ? 'bg-indigo-500/[0.08] border-indigo-500/20' : 'hover:bg-white/[0.04] border-transparent'} border`}
                                                            style={{ marginLeft: '24px' }}
                                                        >
                                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${selected.has(unit.id) ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-white/10 group-hover/item:border-white/30'}`}>
                                                                {selected.has(unit.id) && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                                                            </div>
                                                            <p className="text-[14px] font-black text-white truncate uppercase tracking-tight flex-1">{unit.title}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Category Tree */}
                                    <div className="space-y-3">
                                        {categoriesTree.map(node => (
                                            <ShareTreeNode key={node._id} node={node} />
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-1.5">
                                    {filtered.map(unit => (
                                        <button
                                            key={unit.id}
                                            onClick={() => toggle(unit.id)}
                                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-left group/item ${selected.has(unit.id) ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${selected.has(unit.id) ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-white/10 group-hover/item:border-white/30'}`}>
                                                {selected.has(unit.id) && <Check className="w-3 h-3 text-white stroke-[4px]" />}
                                            </div>
                                            <div className="flex-1 truncate">
                                                <p className="text-[14px] font-black text-white uppercase tracking-tight truncate">{unit.title}</p>
                                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest truncate">{unit.category}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

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
                    <div className="mx-10 mb-6 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 animate-fade-in shrink-0">
                        <div className="flex items-center gap-3 text-red-500 text-sm font-black mb-2 uppercase tracking-tight">
                            <AlertCircle className="w-5 h-5" /> Ulashishda muammo:
                        </div>
                        <ul className="space-y-1 pl-8 list-disc">
                            {errors.map((e, i) => <li key={i} className="text-red-400/60 text-xs font-bold">{e}</li>)}
                        </ul>
                    </div>
                )}

                {/* Footer buttons */}
                <div className="px-10 py-8 border-t border-white/5 flex gap-4 bg-white/[0.01] shrink-0">
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

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            `}</style>
        </div>
    );
}
