'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { createUnit } from '@/lib/firestore';
import { ArrowLeft, Save, Plus, FolderOpen } from 'lucide-react';

interface CategoryNode {
    _id: string;
    name: string;
    path: string;
    children: CategoryNode[];
}

export default function NewUnitPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialCategoryId = searchParams.get('categoryId') || '';

    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState(initialCategoryId);
    const [customTimer, setCustomTimer] = useState('');
    const [saving, setSaving] = useState(false);

    const [categories, setCategories] = useState<{ id: string, name: string, path: string }[]>([]);

    // Add new category state
    const [showNewCat, setShowNewCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatParent, setNewCatParent] = useState(initialCategoryId);
    const [creatingCat, setCreatingCat] = useState(false);

    useEffect(() => {
        if (!user) return;
        loadCategories();
    }, [user]);

    const loadCategories = async () => {
        try {
            const res = await fetch('/api/teacher/categories/tree');
            if (res.ok) {
                const tree: CategoryNode[] = await res.json();
                const flatList: { id: string, name: string, path: string }[] = [];
                const flatten = (nodes: CategoryNode[], depthStr: string) => {
                    nodes.forEach(n => {
                        flatList.push({ id: n._id, name: n.name, path: n.path });
                        if (n.children && n.children.length > 0) {
                            flatten(n.children, depthStr + '- ');
                        }
                    });
                };
                flatten(tree, '');
                setCategories(flatList);
            }
        } catch (err) {
            console.error('Failed to load categories', err);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        setCreatingCat(true);
        try {
            const res = await fetch('/api/teacher/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCatName, parentId: newCatParent || null })
            });
            if (res.ok) {
                const newCat = await res.json();
                await loadCategories();
                setCategoryId(newCat._id);
                setShowNewCat(false);
                setNewCatName('');
                setNewCatParent('');
            } else {
                const data = await res.json();
                alert(data.message || 'Error creating category');
            }
        } catch (err) {
            alert('Server error creating category');
        } finally {
            setCreatingCat(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !title.trim()) {
            alert('Sarlavha tanlanishi shart');
            return;
        }
        if (!categoryId && !showNewCat && categories.length > 0) {
            alert('Kategoriya tanlanishi shart');
            return;
        }

        setSaving(true);
        try {
            const timerValue = customTimer ? parseInt(customTimer) : undefined;
            // Handle empty or 'uncategorized' string properly so backend doesn't crash
            const finalCategoryId = (!categoryId || categoryId === 'uncategorized') ? undefined : categoryId;
            const selectedCat = categories.find(c => c.id === finalCategoryId);

            const body = {
                title: title.trim(),
                createdBy: user.id,
                category: selectedCat ? selectedCat.name : 'Uncategorized',
                categoryId: finalCategoryId,
                customTimer: timerValue
            };

            const res = await fetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errData = await res.json();
                console.error('SERVER ERROR RESP:', errData);
                throw new Error(errData.message || 'Failed to create');
            }
            const data = await res.json();
            router.push(`/teacher/units/${data._id}`);
        } catch (error) {
            console.error('Failed to create unit:', error);
            alert('Fayl yaratishda xatolik yuz berdi. Iltimos tekshiring.');
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0f]">
            {/* Background Mesh Gradient */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[100px]" />
            </div>

            <main className="relative z-10 w-full max-w-xl animate-fade-in my-10">
                <div className="glass-card p-8 md:p-12 shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <Link
                            href="/teacher/units"
                            className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Yangi Bo'lim</h1>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">O'quv bo'limi yaratish</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Unit Title */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">
                                Bo'lim Nomi <span className="text-indigo-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="input-premium"
                                placeholder="Masalan: Unit 1 - Food & Drinks"
                                required
                                autoFocus
                            />
                        </div>

                        {/* Category Selection */}
                        <div className="space-y-3 relative p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">
                                    Kategoriya <span className="text-indigo-400">*</span>
                                </label>
                                <button type="button" onClick={() => setShowNewCat(!showNewCat)} className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 hover:text-indigo-300 transition-colors">
                                    <Plus className="w-3 h-3" /> Yangi
                                </button>
                            </div>

                            {showNewCat ? (
                                <div className="space-y-3 p-4 border border-indigo-500/20 rounded-xl bg-indigo-500/5 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Kategoriya nomi"
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-indigo-500/50"
                                    />
                                    <select
                                        value={newCatParent}
                                        onChange={e => setNewCatParent(e.target.value)}
                                        className="w-full h-12 bg-gray-900 border border-white/10 rounded-xl px-4 text-sm outline-none text-white focus:border-indigo-500/50"
                                    >
                                        <option value="">-- Ota kategoriyasi yo'q (Asosiy) --</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.path}</option>)}
                                    </select>
                                    <div className="flex gap-2 isolate pt-2">
                                        <button type="button" disabled={creatingCat} onClick={handleAddCategory} className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-bold transition-all">
                                            {creatingCat ? 'Yaratilmoqda...' : 'Yaratish'}
                                        </button>
                                        <button type="button" onClick={() => setShowNewCat(false)} className="flex-1 h-10 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold transition-all">
                                            Bekor qilish
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="input-premium py-0 appearance-none bg-gray-900 text-white"
                                    required
                                >
                                    <option value="" disabled>-- Kategoriya tanlang --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.path}</option>
                                    ))}
                                    {categories.length === 0 && <option value="uncategorized">Kategoriyasiz</option>}
                                </select>
                            )}
                        </div>

                        {/* Timer */}
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">
                                Shaxsiy Taymer (Soniya)
                            </label>
                            <input
                                type="number"
                                min="5"
                                max="300"
                                value={customTimer}
                                onChange={(e) => setCustomTimer(e.target.value)}
                                className="input-premium"
                                placeholder="Default: Global Sozlama"
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={saving || !title.trim()}
                                className="btn-premium flex-1 h-14"
                            >
                                <Save className="w-5 h-5" />
                                <span>{saving ? 'Saqlanmoqda...' : 'Bo\'limni Saqlash'}</span>
                            </button>
                            <Link href="/teacher/units" className="btn-glass px-8 flex items-center justify-center">
                                Orqaga
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
