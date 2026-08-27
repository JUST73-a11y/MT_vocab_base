'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getUnit, getWordsByUnit, createWord, deleteWord, updateWord, createWords, updateUnit } from '@/lib/firestore';
import { Unit, Word } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Edit, Save, X, Loader2, FileText, CheckCircle, BookOpen, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { useCategoryTree } from '@/lib/useCategoryTree';
import CategorySelector from '@/components/teacher/CategorySelector';
import SmartImportModal from '@/components/teacher/SmartImport/SmartImportModal';
import { parseVocabText } from '@/lib/vocab/vocabParser';

export default function UnitDetailPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const unitId = params.id as string;

    const [unit, setUnit] = useState<Unit | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Smart Import Modal State
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

    // Unit Editing State
    const [isEditingUnit, setIsEditingUnit] = useState(false);
    const [editUnitTitle, setEditUnitTitle] = useState('');
    const [editUnitCategory, setEditUnitCategory] = useState('');
    const [editUnitCategoryId, setEditUnitCategoryId] = useState<string | null>(null);
    const [editUnitTimer, setEditUnitTimer] = useState('');

    const { tree: categoriesTree } = useCategoryTree(user?.id);

    const findCategoryPath = (nodes: any[], targetId: string | null): string => {
        if (!targetId || targetId === 'uncategorized') return 'Uncategorized';
        for (const node of nodes) {
            if (node._id === targetId) return node.path || node.name;
            const childPath = findCategoryPath(node.children, targetId);
            if (childPath !== 'Uncategorized') return childPath;
        }
        return 'Uncategorized';
    };

    const [englishWord, setEnglishWord] = useState('');
    const [uzbekTranslation, setUzbekTranslation] = useState('');
    const [phonetic, setPhonetic] = useState('');
    const [exampleSentence, setExampleSentence] = useState('');
    const [saving, setSaving] = useState(false);

    // Bulk Add State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [importMode, setImportMode] = useState<'kids1' | 'kids2' | 'adult'>('kids1');
    const [importWarnings, setImportWarnings] = useState<string[]>([]);


    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }

        if (user) {
            loadData();
        }
    }, [user, loading, router, unitId]);

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [unitData, wordsData] = await Promise.all([
                getUnit(unitId),
                getWordsByUnit(unitId),
            ]);
            setUnit(unitData);
            setWords(wordsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleUpdateUnit = async () => {
        if (!unit || !editUnitTitle.trim()) return;
        setSaving(true);
        try {
            const timerValue = editUnitTimer ? parseInt(editUnitTimer) : null;
            await updateUnit(unit.id, editUnitTitle, editUnitCategory.trim() || 'Uncategorized', timerValue, editUnitCategoryId);
            setUnit({
                ...unit,
                title: editUnitTitle,
                category: editUnitCategory.trim() || 'Uncategorized',
                categoryId: editUnitCategoryId || undefined,
                customTimer: timerValue === null ? undefined : timerValue
            });
            setIsEditingUnit(false);
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update unit');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkText.trim()) return;

        setSaving(true);
        setImportWarnings([]);
        try {
            const { words: parsed, warnings } = parseVocabText(bulkText);

            if (parsed.length === 0) {
                alert('Hech qanday so\'z topilmadi. Iltimos, formatni tekshiring.');
                if (warnings.length > 0) setImportWarnings(warnings);
                setSaving(false);
                return;
            }

            const newWords: Omit<Word, 'id'>[] = parsed.map(p => ({
                unitId,
                englishWord: p.englishWord,
                uzbekTranslation: p.uzbekTranslation,
                ...(p.phonetic ? { phonetic: p.phonetic } : {}),
                ...(p.exampleSentence ? { exampleSentence: p.exampleSentence } : {}),
            }));

            const newIds = await createWords(newWords);
            const createdWords = newWords.map((w, idx) => ({
                ...w,
                id: newIds[idx] || Math.random().toString(),
            }));

            setWords([...words, ...createdWords as Word[]]);
            setBulkText('');
            setShowAddForm(false);
            if (warnings.length > 0) {
                setImportWarnings(warnings);
            }
            alert(`${parsed.length} ta so'z muvaffaqiyatli qo'shildi!${warnings.length > 0 ? ` (${warnings.length} ta o'tkazib yuborildi — pastga qarang)` : ''}`);
        } catch (error) {
            console.error('Bulk save failed:', error);
            alert('Saqlashda xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };


    const handleAddWord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!englishWord.trim() || !uzbekTranslation.trim()) return;

        setSaving(true);
        try {
            if (editingId) {
                await updateWord(editingId, {
                    englishWord,
                    uzbekTranslation,
                    phonetic: phonetic || undefined,
                    exampleSentence: exampleSentence || undefined,
                });
                setWords(words.map(w => w.id === editingId ? {
                    ...w,
                    englishWord,
                    uzbekTranslation,
                    phonetic: phonetic || undefined,
                    exampleSentence: exampleSentence || undefined,
                } : w));
                setEditingId(null);
            } else {
                const wordId = await createWord({
                    unitId,
                    englishWord,
                    uzbekTranslation,
                    phonetic: phonetic || undefined,
                    exampleSentence: exampleSentence || undefined,
                });
                setWords([...words, {
                    id: wordId,
                    unitId,
                    englishWord,
                    uzbekTranslation,
                    phonetic: phonetic || undefined,
                    exampleSentence: exampleSentence || undefined,
                }]);
            }
            setEnglishWord('');
            setUzbekTranslation('');
            setPhonetic('');
            setExampleSentence('');
            setShowAddForm(false);
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save word');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (word: Word) => {
        setEnglishWord(word.englishWord);
        setUzbekTranslation(word.uzbekTranslation);
        setPhonetic(word.phonetic || '');
        setExampleSentence(word.exampleSentence || '');
        setEditingId(word.id);
        setShowAddForm(true);
    };

    const handleCancelEdit = () => {
        setEnglishWord('');
        setUzbekTranslation('');
        setPhonetic('');
        setExampleSentence('');
        setEditingId(null);
        setShowAddForm(false);
    };

    const handleDelete = async (wordId: string, word: string) => {
        if (!confirm(`Delete "${word}"?`)) return;
        try {
            await deleteWord(wordId);
            setWords(words.filter(w => w.id !== wordId));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete word');
        }
    };

    if (loading || loadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    if (!unit) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Unit not found</h2>
                    <Link href="/teacher/units" className="btn-action">Back to Units</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 font-sans">
            <div className="p-8 pb-0 max-w-4xl mx-auto animate-fade-in relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-6">
                        <Link href="/teacher/units" className="btn-action !bg-primary !text-white hover:!bg-primary/90">
                            <ArrowLeft className="w-4 h-4" /> Bo'limlarga qaytish
                        </Link>
                        <button onClick={() => router.back()} className="btn-action bg-white/5 text-white/40 hover:bg-white/10 hover:text-white">Orqaga</button>

                        {isEditingUnit ? (
                            <form 
                                onSubmit={(e) => { e.preventDefault(); handleUpdateUnit(); }}
                                className="flex flex-wrap items-center gap-3"
                                onKeyDown={(e) => { if (e.key === 'Escape') setIsEditingUnit(false); }}
                            >
                                <input
                                    type="text"
                                    value={editUnitTitle}
                                    onChange={(e) => setEditUnitTitle(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-xl py-2 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                                    placeholder="Unit Title"
                                    autoFocus
                                />
                                <div className="w-56">
                                    <CategorySelector 
                                        tree={categoriesTree} 
                                        selectedId={editUnitCategoryId} 
                                        onSelect={(id, name) => {
                                            setEditUnitCategoryId(id);
                                            setEditUnitCategory(name);
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="submit" disabled={saving} className="p-2.5 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl">
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button type="button" onClick={() => setIsEditingUnit(false)} className="p-2.5 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-xl">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                <div className="flex items-center gap-3 group mb-1">
                                    <h1 className="text-3xl font-black text-white tracking-tight">{unit.title}</h1>
                                    <button
                                        onClick={() => {
                                            setEditUnitTitle(unit.title);
                                            setEditUnitCategory(unit.category || '');
                                            setEditUnitCategoryId(unit.categoryId || null);
                                            setEditUnitTimer(unit.customTimer?.toString() || '');
                                            setIsEditingUnit(true);
                                        }}
                                        className="transition-opacity p-2 text-gray-400 hover:text-primary bg-white/5 hover:bg-white/10 rounded-lg ml-2"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-bold">
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                        <FileText className="w-4 h-4" /> {words.length} words
                                    </div>
                                    <span className="text-gray-800">|</span>
                                    <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] uppercase tracking-widest ring-1 ring-primary/20">
                                        {findCategoryPath(categoriesTree, unit.categoryId || 'uncategorized')}
                                    </div>
                                    {unit.customTimer && (
                                        <>
                                            <span className="text-gray-800">|</span>
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md tracking-widest ring-1 ring-indigo-500/20">
                                                <Clock className="w-3 h-3" /> {unit.customTimer}s Timer
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {!showAddForm && !isEditingUnit && (
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => setIsSmartImportOpen(true)}
                                className="btn-action !bg-gradient-to-r !from-indigo-600 !to-purple-600 !text-white hover:!opacity-95 shadow-xl shadow-purple-500/20 px-6 h-12 rounded-xl flex items-center gap-2 font-bold"
                            >
                                <Sparkles className="w-5 h-5 text-purple-200 animate-pulse" /> ✨ Smart Import (AI / Fayl)
                            </button>

                            <button onClick={() => setShowAddForm(true)} className="btn-action !bg-primary !text-white hover:!bg-primary/90 shadow-xl shadow-primary/20 px-6 h-12 rounded-xl">
                                <Plus className="w-5 h-5" /> Yangi So'z Qo'shish
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Smart Import Modal */}
            <SmartImportModal
                isOpen={isSmartImportOpen}
                onClose={() => setIsSmartImportOpen(false)}
                unitId={unitId}
                onSuccess={() => loadData()}
            />




            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {showAddForm && (
                    <div className="card mb-10 border-l-4 border-primary p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                                </div>
                                {editingId ? 'Edit Word' : 'Bulk Import or Quick Add'}
                            </h3>
                            {!editingId && (
                                <div className="flex bg-gray-950 p-1.5 rounded-2xl border border-white/5">
                                    <button type="button" onClick={() => setIsBulkMode(false)} className={`px-8 py-3 text-sm font-black rounded-xl ${!isBulkMode ? 'bg-primary text-white shadow-lg' : 'text-white/30'}`}>Single</button>
                                    <button type="button" onClick={() => setIsBulkMode(true)} className={`px-8 py-3 text-sm font-black rounded-xl ${isBulkMode ? 'bg-primary text-white shadow-lg' : 'text-white/30'}`}>Bulk Add</button>
                                </div>
                            )}
                        </div>

                        {isBulkMode && !editingId ? (
                            <form onSubmit={handleBulkAdd} className="space-y-6">
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => { setBulkText(e.target.value); setImportWarnings([]); }}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 text-white font-mono text-sm min-h-[300px]"
                                    placeholder={`Qo'llab-quvvatlanadigan formatlar:\n\nbrackets — qavs\nrailway – temir yo'l\nbrand - brend\n\n1. thunder\n[ˈθʌndə]\nmomaqaldiroq\ne.g. Thunder roared.\n\n| tailor | tikuvchi |\n| contact | aloqa |`}
                                    required
                                />
                                {importWarnings.length > 0 && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-500 text-sm">
                                        <p className="font-bold mb-2">Diqqat:</p>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button type="submit" disabled={saving} className="btn-premium flex-1 h-14">
                                        <Save className="w-5 h-5" /> {saving ? 'Saqlanmoqda...' : 'Barcha so\'zlarni import qilish'}
                                    </button>
                                    <button type="button" onClick={() => { setShowAddForm(false); setImportWarnings([]); }} className="btn-glass px-8 h-14">Bekor qilish</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleAddWord} className="space-y-6">
                                <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase">Word *</label>
                                        <input type="text" value={englishWord} onChange={(e) => setEnglishWord(e.target.value)} className="w-full bg-gray-800 border-2 border-indigo-500/40 rounded-xl py-4 px-5 text-white" required autoFocus />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase">Tarjima *</label>
                                        <input type="text" value={uzbekTranslation} onChange={(e) => setUzbekTranslation(e.target.value)} className="w-full bg-gray-800 border-2 border-teal-500/40 rounded-xl py-4 px-5 text-white" required />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button type="submit" disabled={saving} className="btn-premium flex-1 h-14">
                                        <Save className="w-5 h-5" /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                    </button>
                                    <button type="button" onClick={handleCancelEdit} className="btn-glass px-8 h-14">Bekor qilish</button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    {words.map((word) => (
                        <div key={word.id} className="card !p-6 group hover:border-primary/30 transition-all border border-transparent">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        {word.emoji && <span className="text-3xl p-1 bg-white/5 border border-white/10 rounded-2xl shrink-0 leading-none">{word.emoji}</span>}
                                        <h3 className="text-xl font-bold text-white">{word.englishWord}</h3>
                                        {word.phonetic && <span className="text-sm text-primary bg-primary/5 px-2 py-0.5 rounded font-mono">[{word.phonetic}]</span>}
                                    </div>
                                    <p className="text-lg font-bold text-indigo-400">{word.uzbekTranslation}</p>
                                    {word.exampleSentence && <p className="mt-3 text-sm text-gray-400 italic bg-white/5 py-2 px-4 rounded-xl inline-block">&quot;{word.exampleSentence}&quot;</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(word)} className="btn-action !p-2 opacity-0 group-hover:opacity-100"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(word.id, word.englishWord)} className="btn-action !p-2 !text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {words.length === 0 && !showAddForm && (
                        <div className="text-center py-20 text-gray-500 uppercase font-black tracking-widest text-xs opacity-20">Unit hozircha bo'sh</div>
                    )}
                </div>
            </main>
        </div>
    );
}
