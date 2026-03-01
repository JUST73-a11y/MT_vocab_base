'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getUnit, getWordsByUnit, createWord, deleteWord, updateWord, createWords, updateUnit, getUnits } from '@/lib/firestore';
import { Unit, Word } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Edit, Save, X, Loader2, FileText, CheckCircle, BookOpen, Clock } from 'lucide-react';

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

    // Unit Editing State
    const [isEditingUnit, setIsEditingUnit] = useState(false);
    const [editUnitTitle, setEditUnitTitle] = useState('');
    const [editUnitCategory, setEditUnitCategory] = useState('');
    const [editUnitTimer, setEditUnitTimer] = useState('');

    const [englishWord, setEnglishWord] = useState('');
    const [uzbekTranslation, setUzbekTranslation] = useState('');
    const [phonetic, setPhonetic] = useState('');
    const [exampleSentence, setExampleSentence] = useState('');
    const [saving, setSaving] = useState(false);

    // Bulk Add State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [importMode, setImportMode] = useState<'kids1' | 'kids2' | 'adult'>('kids1');

    const [existingCategories, setExistingCategories] = useState<string[]>([]);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }

        if (user) {
            loadData();
            // Fetch existing categories for autocomplete
            getUnits(user.role === 'admin' ? undefined : user.id).then(units => {
                const categories = Array.from(new Set(units.map(u => u.category || 'Uncategorized').filter(c => c !== 'Uncategorized')));
                setExistingCategories(categories.sort());
            }).catch(err => console.error('Failed to load categories', err));
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
            console.error('Failed to load data:', error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleUpdateUnit = async () => {
        if (!unit || !editUnitTitle.trim()) return;
        setSaving(true);
        try {
            // Send null if empty to clear the timer
            const timerValue = editUnitTimer ? parseInt(editUnitTimer) : null;
            await updateUnit(unit.id, editUnitTitle, editUnitCategory.trim() || 'Uncategorized', timerValue);
            setUnit({
                ...unit,
                title: editUnitTitle,
                category: editUnitCategory.trim() || 'Uncategorized',
                customTimer: timerValue === null ? undefined : timerValue
            });
            setIsEditingUnit(false);
        } catch (error) {
            console.error('Failed to update unit:', error);
            alert('Failed to update unit');
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkText.trim()) return;

        setSaving(true);
        try {
            const rawLines = bulkText.split('\n');
            const newWords: Omit<Word, 'id'>[] = [];

            const parseLine = (text: string) => {
                // Remove numbering: "1. ", "1) ", "1- "
                const cleanText = text.replace(/^\d+[\.\-\)]\s*/, '').trim();

                // Try to find phonetic/metadata in brackets [] or slashes //
                const bracketMatch = cleanText.match(/^(.*?)\s*(\[[^\]]+\]|\/[^\/]+\/)\s*(.*)$/);
                if (bracketMatch) {
                    return {
                        english: bracketMatch[1].trim(),
                        pho: bracketMatch[2].replace(/[\[\]\/]/g, '').trim(),
                        trans: bracketMatch[3].trim()
                    };
                }

                // Fallback: split by common delimiters (tabs, multiple spaces, arrows, dashes, colons)
                const parts = cleanText.split(/\t|\s{2,}|[—–→]|[=:]+/).map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    return {
                        english: parts[0],
                        pho: parts.length === 3 ? parts[1] : undefined,
                        trans: parts[parts.length - 1]
                    };
                }

                return { english: cleanText, pho: undefined, trans: '' };
            };

            let i = 0;
            while (i < rawLines.length) {
                const line = rawLines[i].trim();
                if (!line) { i++; continue; }

                const { english, pho, trans } = parseLine(line);
                let translation = trans;
                let phonetic = pho;
                let example: string | undefined = undefined;

                // 1. If no translation on current line, look ahead (unless it's an Adult example)
                if (!translation && i + 1 < rawLines.length) {
                    const nextLine = rawLines[i + 1].trim();
                    // Don't consume if it's an example or another word starting
                    if (nextLine && !nextLine.toLowerCase().startsWith('e.g.') && !nextLine.includes('[')) {
                        translation = nextLine;
                        i++;
                    }
                }

                // 2. Look ahead for example (Adult mode only mostly, but good to have)
                if (i + 1 < rawLines.length) {
                    const nextLine = rawLines[i + 1].trim();
                    if (nextLine.toLowerCase().startsWith('e.g.')) {
                        example = nextLine.replace(/^e\.g\.\s*/i, '').trim();
                        i++;
                    }
                }

                // 3. Fallback check for example embedded in translation
                if (translation.toLowerCase().includes('e.g.')) {
                    const egMatch = translation.match(/^(.*?)\s*e\.g\.\s*(.*)$/i);
                    if (egMatch) {
                        translation = egMatch[1].trim();
                        example = egMatch[2].trim();
                    }
                }

                if (english && (translation || importMode === 'adult')) {
                    // For adult, we might allow words without immediate translations if they have examples
                    // but usually we want both.
                    if (translation) {
                        newWords.push({
                            unitId,
                            englishWord: english,
                            uzbekTranslation: translation,
                            exampleSentence: example,
                            phonetic: phonetic,
                        });
                    }
                }
                i++;
            }

            if (newWords.length === 0) {
                alert('Hech qanday so\'z topilmadi. Iltimos, formatni tekshiring.');
                setSaving(false);
                return;
            }

            const newIds = await createWords(newWords);

            const createdWords = newWords.map((w, i) => ({
                ...w,
                id: newIds[i] || Math.random().toString(),
            }));

            setWords([...words, ...createdWords as Word[]]);
            setBulkText('');
            setShowAddForm(false);
            alert(`${newWords.length} ta so'z muvaffaqiyatli qo'shildi!`);
        } catch (error) {
            console.error('Failed to save bulk words:', error);
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
            console.error('Failed to save word:', error);
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
            console.error('Failed to delete word:', error);
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
                    <Link href="/teacher/units" className="btn-action">
                        Back to Units
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 font-sans">
            <div className="p-8 pb-0 max-w-4xl mx-auto animate-fade-in relative z-10 transition-all duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/teacher/units"
                            className="btn-action !bg-primary !text-white hover:!bg-primary/90"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Bo'limlarga qaytish
                        </Link>
                        <button
                            onClick={() => router.back()}
                            className="btn-action bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                        >
                            Orqaga
                        </button>

                        {isEditingUnit ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="text"
                                    value={editUnitTitle}
                                    onChange={(e) => setEditUnitTitle(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-xl py-2 px-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                                    placeholder="Unit Title"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    list="categories"
                                    value={editUnitCategory}
                                    onChange={(e) => setEditUnitCategory(e.target.value)}
                                    className="bg-gray-800 border border-gray-700 rounded-xl py-2 px-4 text-sm text-gray-300 w-40 focus:outline-none"
                                    placeholder="Category"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleUpdateUnit}
                                        disabled={saving}
                                        className="p-2.5 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-all"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setIsEditingUnit(false)}
                                        className="p-2.5 text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded-xl transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-3 group mb-1">
                                    <h1 className="text-3xl font-black text-white tracking-tight">{unit.title}</h1>
                                    <button
                                        onClick={() => {
                                            setEditUnitTitle(unit.title);
                                            setEditUnitCategory(unit.category || '');
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
                                        <FileText className="w-4 h-4" />
                                        {words.length} words
                                    </div>
                                    <span className="text-gray-800">|</span>
                                    <div className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] uppercase tracking-widest ring-1 ring-primary/20">
                                        {unit.category || 'Uncategorized'}
                                    </div>
                                    {unit.customTimer && (
                                        <>
                                            <span className="text-gray-800">|</span>
                                            <div className="flex items-center gap-1.5 text-[10px] uppercase bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md tracking-widest ring-1 ring-indigo-500/20">
                                                <Clock className="w-3 h-3" />
                                                {unit.customTimer}s Timer
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {!showAddForm && !isEditingUnit && (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="btn-action !bg-primary !text-white hover:!bg-primary/90 shadow-xl shadow-primary/20 px-6 h-12 rounded-xl"
                            >
                                <Plus className="w-5 h-5" />
                                Yangi So'z Qo'shish
                            </button>
                            {words.length > 0 && (
                                <Link
                                    href="/teacher/units"
                                    className="btn-glass px-6 h-12 flex items-center justify-center gap-2 rounded-xl"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    Bo'limlarga Qaytish
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
                {showAddForm && (
                    <div className="card mb-10 border-l-4 border-primary">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                                </div>
                                {editingId ? 'Edit Word' : 'Bulk Import or Quick Add'}
                            </h3>

                            {!editingId && (
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex bg-gray-950 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkMode(false)}
                                            className={`px-8 py-3 text-sm font-black rounded-xl transition-all ${!isBulkMode ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-white/30 hover:text-white/60'}`}
                                        >
                                            Single
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkMode(true)}
                                            className={`px-8 py-3 text-sm font-black rounded-xl transition-all ${isBulkMode ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-white/30 hover:text-white/60'}`}
                                        >
                                            Bulk Add
                                        </button>
                                    </div>

                                    {isBulkMode && (
                                        <div className="flex bg-gray-950 p-1.5 rounded-2xl border border-white/5 shadow-inner animate-in slide-in-from-left-4 duration-500">
                                            <button
                                                type="button"
                                                onClick={() => setImportMode('kids1')}
                                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${importMode === 'kids1' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' : 'text-white/30 hover:text-white/60'}`}
                                            >
                                                Kids 1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setImportMode('kids2')}
                                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${importMode === 'kids2' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105' : 'text-white/30 hover:text-white/60'}`}
                                            >
                                                Kids 2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setImportMode('adult')}
                                                className={`px-6 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${importMode === 'adult' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105' : 'text-white/30 hover:text-white/60'}`}
                                            >
                                                Adult
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {isBulkMode && !editingId ? (
                            <form onSubmit={handleBulkAdd} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest text-[10px]">
                                        {importMode === 'kids1' ? 'Kids 1: Single Line Format' : importMode === 'kids2' ? 'Kids 2: Multi-line Format' : 'Adult: Numbered Format with Examples'}
                                    </label>
                                    <textarea
                                        value={bulkText}
                                        onChange={(e) => setBulkText(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[300px] shadow-inner transition-all"
                                        placeholder={importMode === 'kids1'
                                            ? `1.Monster  Monstr  Maxluq\n2.Difference  Diffrens  Farq`
                                            : importMode === 'kids2'
                                                ? `stickers [ stikez ]\nnakleykalar\nposters [ po'stez ]\nplakatlar`
                                                : `1. Knock [verb]\nTaqqillatmoq\ne.g. He knocked three times.\n2. Burglar [noun]\nO'g'ri\ne.g. Chase the burglar.`}
                                        required
                                    />
                                    <div className={`mt-4 p-5 rounded-2xl border ${importMode === 'adult' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-primary/5 border-primary/10'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <CheckCircle className={`w-4 h-4 ${importMode === 'adult' ? 'text-emerald-400' : 'text-primary'}`} />
                                            <p className={`text-xs font-black uppercase tracking-widest ${importMode === 'adult' ? 'text-emerald-400' : 'text-primary'}`}>
                                                {importMode === 'kids1' ? 'Kids 1 Parser Active' : importMode === 'kids2' ? 'Kids 2 Parser Active' : 'Adult Parser Active'}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-gray-400 leading-relaxed font-bold">
                                            {importMode === 'kids1'
                                                ? 'Numbered lists, Tabs, and Double Spaces on a single line are automatically handled.'
                                                : importMode === 'kids2'
                                                    ? 'Place Word [phonetic] on the first line and Translation on the second line.'
                                                    : 'Format: "1. Word [grammar]" → Translation → "e.g. Example sentence" (e.g. is optional). Grammar tags like [verb], [noun, C] are stripped automatically.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-premium flex-1 h-14"
                                    >
                                        <Save className="w-5 h-5" />
                                        {saving ? 'Saqlanmoqda...' : 'Barcha so\'zlarni import qilish'}
                                    </button>
                                    <button type="button" onClick={() => setShowAddForm(false)} className="btn-glass px-8 h-14">Bekor qilish</button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleAddWord} className="space-y-6">
                                {/* English Section */}
                                <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className="text-2xl">🇬🇧</span>
                                        <h4 className="text-white font-black text-base uppercase tracking-widest">English</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                                                Word <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={englishWord}
                                                onChange={(e) => setEnglishWord(e.target.value)}
                                                className="w-full bg-gray-800 border-2 border-indigo-500/40 focus:border-indigo-400 rounded-xl py-4 px-5 text-white text-lg font-bold focus:outline-none transition-colors"
                                                placeholder="Apple"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                                                Phonetic [ talaffuz ]
                                            </label>
                                            <input
                                                type="text"
                                                value={phonetic}
                                                onChange={(e) => setPhonetic(e.target.value)}
                                                className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl py-4 px-5 text-white/80 text-lg focus:outline-none focus:border-gray-500 transition-colors font-mono"
                                                placeholder="æpl"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Uzbek Section */}
                                <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-2 mb-5">
                                        <span className="text-2xl">🇺🇿</span>
                                        <h4 className="text-white font-black text-base uppercase tracking-widest">O'zbek</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                                                Tarjima <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={uzbekTranslation}
                                                onChange={(e) => setUzbekTranslation(e.target.value)}
                                                className="w-full bg-gray-800 border-2 border-teal-500/40 focus:border-teal-400 rounded-xl py-4 px-5 text-white text-lg font-bold focus:outline-none transition-colors"
                                                placeholder="Olma"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">
                                                Misol gap
                                            </label>
                                            <input
                                                type="text"
                                                value={exampleSentence}
                                                onChange={(e) => setExampleSentence(e.target.value)}
                                                className="w-full bg-gray-800 border-2 border-gray-700 rounded-xl py-4 px-5 text-white/80 text-lg focus:outline-none focus:border-gray-500 transition-colors"
                                                placeholder="I eat an apple"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-premium flex-1 h-14"
                                    >
                                        <Save className="w-5 h-5" />
                                        {saving ? 'Saqlanmoqda...' : editingId ? 'Yangilash' : 'So\'zni saqlash'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="btn-glass px-8 h-14"
                                    >
                                        Bekor qilish
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {words.length === 0 ? (
                    <div className="card text-center py-20 flex flex-col items-center gap-6">
                        <div className="p-6 bg-gray-900 rounded-full border border-gray-800">
                            <BookOpen className="w-12 h-12 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2">Empty Unit</h3>
                            <p className="text-gray-500 font-medium">Add some words to start practicing!</p>
                        </div>
                        {!showAddForm && (
                            <button onClick={() => setShowAddForm(true)} className="btn-action !bg-white !text-gray-900 hover:!scale-105 transition-transform">
                                <Plus className="w-4 h-4" />
                                Add First Word
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {words.map((word) => (
                            <div key={word.id} className="card !p-6 group hover:border-primary/30 transition-all border border-transparent">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{word.englishWord}</h3>
                                            {word.phonetic && (
                                                <span className="text-sm font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                                    [{word.phonetic}]
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-lg font-bold text-indigo-400">{word.uzbekTranslation}</p>
                                        </div>
                                        {word.exampleSentence && (
                                            <p className="mt-3 text-sm text-gray-400 italic bg-white/5 py-2 px-4 rounded-xl inline-block">
                                                &quot;{word.exampleSentence}&quot;
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(word)}
                                            className="btn-action !p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(word.id, word.englishWord)}
                                            className="btn-action !p-2 !text-red-500 hover:!bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
