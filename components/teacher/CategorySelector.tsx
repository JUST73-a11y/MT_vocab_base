'use client';

import { useState } from 'react';
import { ChevronDown, Folder, Check, LayoutGrid } from 'lucide-react';
import { CategoryNode } from '@/lib/useCategoryTree';

interface CategorySelectorProps {
    tree: CategoryNode[];
    selectedId: string | null;
    onSelect: (id: string | null, name: string) => void;
}

export default function CategorySelector({ tree, selectedId, onSelect }: CategorySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const findCategoryName = (nodes: CategoryNode[], id: string | null): string => {
        if (!id || id === 'uncategorized') return 'Uncategorized';
        for (const node of nodes) {
            if (node._id === id) return node.name;
            const childName = findCategoryName(node.children, id);
            if (childName !== 'Uncategorized') return childName;
        }
        return 'Uncategorized';
    };

    const currentName = findCategoryName(tree, selectedId);

    const renderNodes = (nodes: CategoryNode[], depth = 0) => {
        return nodes.map(node => (
            <div key={node._id}>
                <button
                    type="button"
                    onClick={() => {
                        onSelect(node._id, node.name);
                        setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-all text-left group ${selectedId === node._id ? 'bg-indigo-500/10' : ''}`}
                    style={{ paddingLeft: `${(depth + 1) * 20}px` }}
                >
                    <Folder className={`w-4 h-4 ${selectedId === node._id ? 'text-indigo-400' : 'text-gray-500 group-hover:text-indigo-400'}`} />
                    <span className={`text-sm font-bold flex-1 truncate ${selectedId === node._id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                        {node.name}
                    </span>
                    {selectedId === node._id && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
                {node.children.length > 0 && renderNodes(node.children, depth + 1)}
            </div>
        ));
    };

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl py-3 px-4 flex items-center justify-between group hover:border-gray-600 transition-all focus:ring-2 focus:ring-indigo-500/30 outline-none"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <LayoutGrid className="w-4 h-4 text-gray-500 group-hover:text-indigo-400" />
                    <span className="text-sm font-black text-white truncate uppercase tracking-tight">
                        {currentName}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 group-hover:text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-64 overflow-y-auto py-2 custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => {
                                    onSelect(null, 'Uncategorized');
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-all text-left group ${!selectedId || selectedId === 'uncategorized' ? 'bg-indigo-500/10' : ''}`}
                            >
                                <LayoutGrid className={`w-4 h-4 ${!selectedId || selectedId === 'uncategorized' ? 'text-indigo-400' : 'text-gray-500 group-hover:text-indigo-400'}`} />
                                <span className={`text-sm font-black uppercase tracking-tight flex-1 ${!selectedId || selectedId === 'uncategorized' ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                    Uncategorized
                                </span>
                                {(!selectedId || selectedId === 'uncategorized') && <Check className="w-4 h-4 text-indigo-400" />}
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            {renderNodes(tree)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
