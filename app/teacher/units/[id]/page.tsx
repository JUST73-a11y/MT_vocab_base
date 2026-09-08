'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getUnit, getWordsByUnit, createWord, deleteWord, updateWord, createWords, updateUnit } from '@/lib/firestore';
import { Unit, Word } from '@/lib/types';
import {
  ArrowLeft, Plus, Trash2, Edit, Save, X, Loader2, FileText, CheckCircle,
  BookOpen, Clock, AlertTriangle, Sparkles, FolderOpen, Volume2, Check,
  Search, HelpCircle, Play, Layers, Pencil
} from 'lucide-react';
import { useCategoryTree } from '@/lib/useCategoryTree';
import CategorySelector from '@/components/teacher/CategorySelector';
import SmartImportModal from '@/components/teacher/SmartImport/SmartImportModal';
import { parseVocabText } from '@/lib/vocab/vocabParser';
import toast from 'react-hot-toast';

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
  const [search, setSearch] = useState('');

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
      toast.error('Unit ma\'lumotlarini yuklashda xatolik');
    } finally {
      setLoadingData(false);
    }
  };

  const openUnitEdit = () => {
    if (!unit) return;
    setEditUnitTitle(unit.title);
    setEditUnitCategory(unit.category || 'Uncategorized');
    setEditUnitCategoryId(unit.categoryId || null);
    setEditUnitTimer(unit.customTimer?.toString() || '');
    setIsEditingUnit(true);
  };

  const handleUpdateUnit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unit || !editUnitTitle.trim()) {
      toast.error('Unit nomini kiriting');
      return;
    }
    setSaving(true);
    try {
      const timerValue = editUnitTimer.trim() ? parseInt(editUnitTimer.trim()) : null;
      await updateUnit(
        unit.id,
        editUnitTitle.trim(),
        editUnitCategory.trim() || 'Uncategorized',
        timerValue,
        editUnitCategoryId
      );
      setUnit({
        ...unit,
        title: editUnitTitle.trim(),
        category: editUnitCategory.trim() || 'Uncategorized',
        categoryId: editUnitCategoryId || undefined,
        customTimer: timerValue === null ? undefined : timerValue
      });
      setIsEditingUnit(false);
      toast.success('Unit ma\'lumotlari muvaffaqiyatli saqlandi!');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Unitni yangilashda xatolik yuz berdi');
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
        toast.error('Hech qanday so\'z topilmadi. Formatni tekshiring.');
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
      toast.success(`${parsed.length} ta so'z muvaffaqiyatli qo'shildi!`);
    } catch (error) {
      console.error('Bulk save failed:', error);
      toast.error('So\'zlarni saqlashda xatolik yuz berdi');
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
          englishWord: englishWord.trim(),
          uzbekTranslation: uzbekTranslation.trim(),
          phonetic: phonetic.trim() || undefined,
          exampleSentence: exampleSentence.trim() || undefined,
        });
        setWords(words.map(w => w.id === editingId ? {
          ...w,
          englishWord: englishWord.trim(),
          uzbekTranslation: uzbekTranslation.trim(),
          phonetic: phonetic.trim() || undefined,
          exampleSentence: exampleSentence.trim() || undefined,
        } : w));
        setEditingId(null);
        toast.success('So\'z tahrirlandi');
      } else {
        const wordId = await createWord({
          unitId,
          englishWord: englishWord.trim(),
          uzbekTranslation: uzbekTranslation.trim(),
          phonetic: phonetic.trim() || undefined,
          exampleSentence: exampleSentence.trim() || undefined,
        });
        setWords([...words, {
          id: wordId,
          unitId,
          englishWord: englishWord.trim(),
          uzbekTranslation: uzbekTranslation.trim(),
          phonetic: phonetic.trim() || undefined,
          exampleSentence: exampleSentence.trim() || undefined,
        }]);
        toast.success('Yangi so\'z qo\'shildi');
      }
      setEnglishWord('');
      setUzbekTranslation('');
      setPhonetic('');
      setExampleSentence('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('So\'zni saqlashda xatolik');
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
    if (!confirm(`"${word}" so'zini o'chirasizmi?`)) return;
    try {
      await deleteWord(wordId);
      setWords(words.filter(w => w.id !== wordId));
      toast.success('So\'z o\'chirildi');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('O\'chirishda xatolik');
    }
  };

  const playAudio = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const filteredWords = words.filter(w =>
    w.englishWord?.toLowerCase().includes(search.toLowerCase()) ||
    w.uzbekTranslation?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-white">
        <div className="text-center p-8 rounded-3xl bg-white/[0.03] border border-white/10 max-w-md">
          <BookOpen className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Unit topilmadi</h2>
          <p className="text-xs text-white/50 mb-6">Ushbu unit o'chirilgan yoki sizda ruxsat yo'q bo'lishi mumkin.</p>
          <Link href="/teacher/units" className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider inline-block">
            Unitlarga qaytish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8 py-2 md:py-4 font-sans text-white">

      {/* ── Top Header Navigation & Unit Edit Section ── */}
      <div className="glass-card p-6 md:p-8 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Normal Header Mode */}
        {!isEditingUnit ? (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <Link
                href="/teacher/units"
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 shrink-0 shadow-lg"
                title="Unitlarga qaytish"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-white">{unit.title}</h1>
                  <button
                    onClick={openUnitEdit}
                    className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Unit ma'lumotlarini tahrirlash"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50 mt-1.5 font-bold flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                    <FolderOpen className="w-3.5 h-3.5" />
                    {findCategoryPath(categoriesTree, unit.categoryId || 'uncategorized')}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-white/80">
                    <FileText className="w-3.5 h-3.5 text-white/40" />
                    {words.length} ta so'z
                  </span>
                  {unit.customTimer && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        {unit.customTimer}s taymer
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsSmartImportOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-purple-600/30 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                Smart Import (AI / Fayl)
              </button>

              <button
                onClick={() => { setShowAddForm(true); setEditingId(null); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Yangi So'z Qo'shish
              </button>
            </div>
          </div>
        ) : (
          /* Unit Edit Section (Dedicated Design & Settings Editor) */
          <div className="relative z-10 animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">Unit Sozlamalari & Dizayni</h3>
                  <p className="text-xs text-white/50 mt-0.5">Unit nomi, kategoriyasi va mashq taymerini tahrirlash</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingUnit(false)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* 1. Title */}
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-white/60">
                    Unit Nomi *
                  </label>
                  <input
                    type="text"
                    value={editUnitTitle}
                    onChange={e => setEditUnitTitle(e.target.value)}
                    placeholder="Masalan: Unit 1: Nature & Animals"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white font-black text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner"
                    autoFocus
                    required
                  />
                </div>

                {/* 2. Category Selector */}
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-white/60">
                    Kategoriya / Papka
                  </label>
                  <CategorySelector
                    tree={categoriesTree}
                    selectedId={editUnitCategoryId}
                    onSelect={(id, name) => {
                      setEditUnitCategoryId(id);
                      setEditUnitCategory(name);
                    }}
                  />
                </div>

                {/* 3. Custom Timer */}
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-white/60">
                    Mashq Taymeri (Sekundlarda, ixtiyoriy)
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="3"
                      max="120"
                      value={editUnitTimer}
                      onChange={e => setEditUnitTimer(e.target.value)}
                      placeholder="Standart yoki sekund (masalan: 10)"
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-white font-bold text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-600/25 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  O'zgarishlarni Saqlash
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingUnit(false)}
                  className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Smart Import Modal */}
      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        unitId={unitId}
        onSuccess={() => loadData()}
      />

      {/* ── Add / Edit Word Form ── */}
      {showAddForm && (
        <div className="glass-card p-6 md:p-8 rounded-3xl bg-white/[0.03] border border-indigo-500/30 shadow-2xl relative overflow-hidden animate-fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <h3 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                {editingId ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[3]" />}
              </div>
              {editingId ? "So'zni Tahrirlash" : "Yangi So'z Qo'shish"}
            </h3>
            {!editingId && (
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setIsBulkMode(false)}
                  className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${!isBulkMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Bitta so'z
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkMode(true)}
                  className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${isBulkMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Matndan ko'chirish
                </button>
              </div>
            )}
          </div>

          {isBulkMode && !editingId ? (
            <form onSubmit={handleBulkAdd} className="space-y-6">
              <div>
                <textarea
                  value={bulkText}
                  onChange={(e) => { setBulkText(e.target.value); setImportWarnings([]); }}
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white font-mono text-sm min-h-[220px] outline-none focus:border-indigo-500 transition-colors custom-scrollbar"
                  placeholder={`Har bir qatorga: so'z - tarjima\n\napple - olma\nconsequence - oqibat\nflourish - gullab-yashnamoq`}
                  required
                  autoFocus
                />
              </div>
              {importWarnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-400 text-xs font-bold space-y-1">
                  <p className="font-black uppercase tracking-wider">Diqqat:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !bulkText.trim()}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Barchasini saqlash
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setImportWarnings([]); }}
                  className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddWord} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-white/60 tracking-wider">Inglizcha So'z *</label>
                  <input
                    type="text"
                    value={englishWord}
                    onChange={(e) => setEnglishWord(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl py-3.5 px-4 text-white font-bold text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    placeholder="Masalan: thrive"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-white/60 tracking-wider">O'zbekcha Tarjima *</label>
                  <input
                    type="text"
                    value={uzbekTranslation}
                    onChange={(e) => setUzbekTranslation(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl py-3.5 px-4 text-white font-bold text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 transition-all"
                    placeholder="Masalan: gullab-yashnamoq"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-white/60 tracking-wider">Transkripsiya / Fonetika (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl py-3.5 px-4 text-white text-sm outline-none focus:border-indigo-500 transition-all font-mono"
                    placeholder="[θraɪv]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase text-white/60 tracking-wider">Misol gap (ixtiyoriy)</label>
                  <input
                    type="text"
                    value={exampleSentence}
                    onChange={(e) => setExampleSentence(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl py-3.5 px-4 text-white text-sm outline-none focus:border-indigo-500 transition-all"
                    placeholder="Plants thrive with water and sunlight."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || !englishWord.trim() || !uzbekTranslation.trim()}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "O'zgarishni saqlash" : "So'zni saqlash"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Search Bar ── */}
      {words.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="So'zlarni qidirish (inglizcha yoki o'zbekcha)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500 transition-colors shadow-inner"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60 cursor-pointer"
            >
              Tozalash
            </button>
          )}
        </div>
      )}

      {/* ── Words Display Grid ── */}
      {words.length === 0 && !showAddForm ? (
        <div className="py-16 md:py-20 px-6 md:px-12 text-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.015] backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden my-2">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-5 shadow-2xl shadow-purple-600/20">
            <BookOpen className="w-10 h-10" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">Bu unitda hali so'zlar yo'q</h3>
          <p className="text-sm text-white/50 max-w-lg mb-8 leading-relaxed font-medium">
            Smart Import yordamida IELTS Reading yoki fayldan oling, yoki yangi so'zlarni qo'lda kiriting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 w-full max-w-xl">
            <button
              onClick={() => setIsSmartImportOpen(true)}
              className="flex-1 min-w-[220px] flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-purple-600/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" /> Smart Import (AI / Fayl)
            </button>
            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); }}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Bitta so'z qo'shish
            </button>
          </div>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="py-16 text-center text-white/40 glass-card rounded-3xl border border-white/10 p-8">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold">"{search}" bo'yicha hech qanday so'z topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((word) => (
            <div
              key={word.id}
              className="p-5 md:p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all flex flex-col justify-between group relative overflow-hidden shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl font-black tracking-tight text-white">{word.englishWord}</span>
                    <button
                      onClick={() => playAudio(word.englishWord)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                      title="Tinglash"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    {word.phonetic && (
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono border border-indigo-500/20">
                        {word.phonetic}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(word)}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(word.id, word.englishWord)}
                      className="p-2 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-base font-bold text-indigo-300 mb-2">
                  {word.uzbekTranslation}
                </p>

                {word.exampleSentence && (
                  <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                    <p className="text-xs text-white/70 italic leading-relaxed">"{word.exampleSentence}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
