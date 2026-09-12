'use client';

import React, { useState, useMemo } from 'react';
import { FolderOpen, Search, ChevronRight, ArrowLeft, Check, X } from 'lucide-react';

export interface CategoryNode {
    _id: string;
    name: string;
    parentId?: string | null;
    children?: CategoryNode[];
}

export interface UnitItem {
    id: string;
    title: string;
    category?: string;
    categoryId?: string | null;
    wordCount?: number;
}

interface VocabularyUnitSelectorProps {
    units: UnitItem[];
    categoriesTree: CategoryNode[];
    selectedUnitIds: string[];
    onToggleUnit: (unitId: string) => void;
    onSelectMultiple?: (unitIds: string[], select: boolean) => void;
    multiSelect?: boolean;
    searchPlaceholder?: string;
    maxHeightClass?: string;
    className?: string;
}

function findNodeInTree(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const n of nodes) {
        if (n._id === id) return n;
        if (n.children && n.children.length > 0) {
            const found = findNodeInTree(n.children, id);
            if (found) return found;
        }
    }
    return null;
}

function getAllDescendantCategoryIds(node: CategoryNode): string[] {
    const ids: string[] = [node._id];
    if (node.children && node.children.length > 0) {
        for (const c of node.children) {
            ids.push(...getAllDescendantCategoryIds(c));
        }
    }
    return ids;
}

export default function VocabularyUnitSelector({
    units,
    categoriesTree,
    selectedUnitIds,
    onToggleUnit,
    onSelectMultiple,
    multiSelect = true,
    searchPlaceholder = "Unit yoki papka qidirish...",
    maxHeightClass = "max-h-[380px]",
    className = "",
}: VocabularyUnitSelectorProps) {
    const [currentPath, setCurrentPath] = useState<CategoryNode[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Active Category
    const currentCatId = currentPath.length > 0 ? currentPath[currentPath.length - 1]._id : null;
    const currentCatNode = currentCatId ? findNodeInTree(categoriesTree, currentCatId) : null;

    // Sub-folders at current level
    const currentFolders: CategoryNode[] = currentCatId
        ? (currentCatNode?.children || [])
        : categoriesTree;

    // Units directly in this category / level
    const currentLevelUnits: UnitItem[] = useMemo(() => {
        if (!currentCatId) return [];
        return units.filter(u => u.categoryId === currentCatId || (!u.categoryId && u.category === currentCatNode?.name));
    }, [units, currentCatId, currentCatNode]);

    // All units under a given folder node (including descendants)
    const getUnitsInFolder = (node: CategoryNode): UnitItem[] => {
        const descIds = getAllDescendantCategoryIds(node);
        return units.filter(u =>
            (u.categoryId && descIds.includes(u.categoryId)) ||
            (u.category && u.category.includes(node.name))
        );
    };

    // Live Search Results
    const isSearching = !!searchQuery.trim();
    const searchedUnits = useMemo(() => {
        if (!isSearching) return [];
        const q = searchQuery.toLowerCase();
        return units.filter(u =>
            u.title.toLowerCase().includes(q) ||
            (u.category && u.category.toLowerCase().includes(q))
        );
    }, [units, isSearching, searchQuery]);

    const handleSelectFolderUnits = (folder: CategoryNode, allSelected: boolean) => {
        if (!onSelectMultiple) return;
        const folderUnits = getUnitsInFolder(folder);
        const folderUnitIds = folderUnits.map(u => u.id);
        onSelectMultiple(folderUnitIds, !allSelected);
    };

    const handleSelectAllCurrentLevel = (select: boolean) => {
        if (!onSelectMultiple) return;
        const ids = currentLevelUnits.map(u => u.id);
        onSelectMultiple(ids, select);
    };

    return (
        <div className={`flex flex-col rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden ${className}`}>
            {/* Top Bar: Breadcrumbs & Search */}
            <div className="p-3 sm:p-4 border-b border-white/10 bg-white/[0.02] flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                    {/* Navigation Path / Title */}
                    <div className="flex items-center gap-2 min-w-0">
                        {currentPath.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setCurrentPath(prev => prev.slice(0, -1))}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95 shrink-0"
                                title="Orqaga qaytish"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div className="min-w-0">
                            <span className="font-black text-sm text-white truncate block">
                                {currentPath.length > 0 ? currentPath[currentPath.length - 1].name : "Barcha Papkalar"}
                            </span>
                            <span className="text-[10px] font-bold text-white/40 truncate block">
                                {currentPath.length > 0 ? "Papkadagi unitlarni tanlang" : "Papkani tanlang yoki qidiring"}
                            </span>
                        </div>
                    </div>

                    {/* Selected Count Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
                            {selectedUnitIds.length} ta tanlandi
                        </span>
                    </div>
                </div>

                {/* Breadcrumbs Strip */}
                {currentPath.length > 0 && (
                    <nav className="flex items-center gap-1.5 flex-wrap text-xs bg-black/25 px-3 py-1.5 rounded-xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setCurrentPath([])}
                            className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                        >
                            <FolderOpen className="w-3.5 h-3.5" /> Asosiy
                        </button>
                        {currentPath.map((p, idx) => (
                            <div key={p._id} className="flex items-center gap-1.5">
                                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                                <button
                                    type="button"
                                    onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                    className={`font-bold transition-colors truncate max-w-[130px] ${
                                        idx === currentPath.length - 1 ? 'text-white' : 'text-white/50 hover:text-white'
                                    }`}
                                >
                                    {p.name}
                                </button>
                            </div>
                        ))}
                    </nav>
                )}

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 font-bold outline-none focus:border-indigo-500 text-xs transition-all"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className={`overflow-y-auto p-3 sm:p-4 custom-scrollbar space-y-3 ${maxHeightClass}`}>
                {isSearching ? (
                    /* Search Results Grid */
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1 px-1">
                            <span>Qidiruv natijalari ({searchedUnits.length} ta unit)</span>
                        </div>
                        {searchedUnits.length === 0 ? (
                            <div className="text-center py-8 text-white/30 text-xs font-bold">
                                Qidiruv bo'yicha hech qanday bo'lim topilmadi.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                {searchedUnits.map(unit => {
                                    const isSelected = selectedUnitIds.includes(unit.id);
                                    return (
                                        <button
                                            key={unit.id}
                                            type="button"
                                            onClick={() => onToggleUnit(unit.id)}
                                            className={`flex items-start justify-between p-3.5 rounded-2xl transition-all border text-left group ${
                                                isSelected
                                                    ? 'bg-indigo-500/20 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                                                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0 pr-2">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 border mt-0.5 ${
                                                    isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 bg-white/5 text-transparent'
                                                }`}>
                                                    <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-sm truncate leading-snug ${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                                                        {unit.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {unit.wordCount !== undefined && (
                                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                                                                {unit.wordCount} ta so'z
                                                            </span>
                                                        )}
                                                        {unit.category && (
                                                            <span className="text-[10px] text-white/40 truncate max-w-[120px]">
                                                                {unit.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Normal Folder & Unit Hierarchy */
                    <div className="space-y-3">
                        {/* Folders List */}
                        {currentFolders.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {currentFolders.map(folder => {
                                    const unitsInF = getUnitsInFolder(folder);
                                    const selectedInF = unitsInF.filter(u => selectedUnitIds.includes(u.id)).length;
                                    const allSelected = unitsInF.length > 0 && selectedInF === unitsInF.length;

                                    return (
                                        <div
                                            key={folder._id}
                                            className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all group"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPath([...currentPath, folder])}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                                                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-black text-sm text-white block truncate">{folder.name}</span>
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                                        {unitsInF.length} ta bo'lim
                                                    </span>
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                {multiSelect && onSelectMultiple && unitsInF.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectFolderUnits(folder, allSelected)}
                                                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                                            selectedInF > 0
                                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                                        }`}
                                                    >
                                                        {selectedInF > 0 ? `${selectedInF}/${unitsInF.length}` : 'Tanlash'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPath([...currentPath, folder])}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Units directly in this category */}
                        {currentLevelUnits.length > 0 && (
                            <div className="pt-2 space-y-2.5">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                                        Bo'limlar ({currentLevelUnits.length} ta)
                                    </span>
                                    {multiSelect && onSelectMultiple && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleSelectAllCurrentLevel(true)}
                                                className="text-[11px] font-bold text-indigo-400 hover:underline"
                                            >
                                                Hammasi
                                            </button>
                                            <span className="text-white/20">•</span>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectAllCurrentLevel(false)}
                                                className="text-[11px] font-bold text-rose-400 hover:underline"
                                            >
                                                Bekor
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                    {currentLevelUnits.map(unit => {
                                        const isSelected = selectedUnitIds.includes(unit.id);
                                        return (
                                            <button
                                                key={unit.id}
                                                type="button"
                                                onClick={() => onToggleUnit(unit.id)}
                                                className={`flex items-start justify-between p-3.5 rounded-2xl transition-all border text-left group ${
                                                    isSelected
                                                        ? 'bg-indigo-500/20 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                                                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3 min-w-0 pr-2">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 border mt-0.5 ${
                                                        isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 bg-white/5 text-transparent'
                                                    }`}>
                                                        <Check className={`w-3.5 h-3.5 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className={`font-bold text-sm truncate leading-snug ${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                                                            {unit.title}
                                                        </p>
                                                        {unit.wordCount !== undefined && (
                                                            <div className="mt-1">
                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                                                                    {unit.wordCount} ta so'z
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded shrink-0">
                                                        ✓
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {currentFolders.length === 0 && currentLevelUnits.length === 0 && (
                            <div className="text-center py-8 text-white/30 text-xs font-bold">
                                Bu papkada hozircha unit mavjud emas.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
