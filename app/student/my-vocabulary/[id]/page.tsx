'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  ArrowLeft, Plus, Trash2, Edit, Save, X, Loader2, BookOpen, Volume2,
  Search, Sparkles, Play, HelpCircle, Check, AlertCircle, FileText,
  UploadCloud, FileUp, Filter, CheckSquare, Square, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WordItem {
  id: string;
  _id?: string;
  unitId: string;
  englishWord: string;
  uzbekTranslation: string;
  phonetic?: string;
  partOfSpeech?: string;
  cefr?: string;
  definition?: string;
  exampleSentence?: string;
  contextTranslation?: string;
}

interface UnitData {
  _id: string;
  id?: string;
  title: string;
  category?: string;
  createdAt: string;
  ownerType?: string;
}

interface ExtractedCandidate {
  word: string;
  uzbekTranslation: string;
  cefr: string;
  partOfSpeech: string;
  definition?: string;
  contextSentence?: string;
  contextTranslation?: string;
  selected: boolean;
}

const CEFR_COLORS: Record<string, string> = {
  A1: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  A2: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  B1: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  B2: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  C1: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  C2: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

export default function StudentUnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const unitId = resolvedParams.id;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [unit, setUnit] = useState<UnitData | null>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingWord, setEditingWord] = useState<WordItem | null>(null);

  // Single word form state
  const [formWord, setFormWord] = useState('');
  const [formTranslation, setFormTranslation] = useState('');
  const [formPos, setFormPos] = useState('noun');
  const [formCefr, setFormCefr] = useState('B1');
  const [formSentence, setFormSentence] = useState('');
  const [formSentenceTr, setFormSentenceTr] = useState('');
  const [savingWord, setSavingWord] = useState(false);

  // Bulk add state
  const [bulkText, setBulkText] = useState('');
  const [savingBulk, setSavingBulk] = useState(false);

  // AI Reading / PDF Extractor State
  const [aiTab, setAiTab] = useState<'text' | 'file'>('text');
  const [aiText, setAiText] = useState('');
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiRequestedCount, setAiRequestedCount] = useState(20);
  const [aiCefr, setAiCefr] = useState('B2');
  const [aiIncludePhrases, setAiIncludePhrases] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProgressText, setAiProgressText] = useState('');
  const [extractedCandidates, setExtractedCandidates] = useState<ExtractedCandidate[]>([]);
  const [aiStep, setAiStep] = useState<'input' | 'review'>('input');
  const [savingAiWords, setSavingAiWords] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Unit title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'student') {
      loadUnitAndWords();
    }
  }, [unitId, user]);

  async function loadUnitAndWords() {
    setLoading(true);
    try {
      const res = await fetch(`/api/student/personal-units/${unitId}`);
      if (!res.ok) {
        if (res.status === 404) toast.error('Unit topilmadi');
        else toast.error('Yuklashda xatolik');
        router.push('/student/my-vocabulary');
        return;
      }
      const data = await res.json();
      setUnit(data.unit);
      setEditTitle(data.unit.title);
      const normalizedWords = (data.words || []).map((w: any) => ({
        ...w,
        id: w._id || w.id,
      }));
      setWords(normalizedWords);
    } catch {
      toast.error('Server bilan aloqa uzildi');
    } finally {
      setLoading(false);
    }
  }

  function playAudio(word: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function openCreateModal() {
    setEditingWord(null);
    setFormWord('');
    setFormTranslation('');
    setFormPos('noun');
    setFormCefr('B1');
    setFormSentence('');
    setFormSentenceTr('');
    setShowAddModal(true);
  }

  function openEditModal(word: WordItem) {
    setEditingWord(word);
    setFormWord(word.englishWord);
    setFormTranslation(word.uzbekTranslation);
    setFormPos(word.partOfSpeech || 'noun');
    setFormCefr(word.cefr || 'B1');
    setFormSentence(word.exampleSentence || '');
    setFormSentenceTr(word.contextTranslation || '');
    setShowAddModal(true);
  }

  async function handleSaveWord(e: React.FormEvent) {
    e.preventDefault();
    if (!formWord.trim() || !formTranslation.trim()) {
      toast.error("Inglizcha so'z va o'zbekcha tarjima kiritilishi shart");
      return;
    }

    setSavingWord(true);
    try {
      if (editingWord) {
        const wordId = editingWord.id || editingWord._id;
        const res = await fetch(`/api/words/${wordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            englishWord: formWord.trim(),
            uzbekTranslation: formTranslation.trim(),
            partOfSpeech: formPos,
            cefr: formCefr,
            exampleSentence: formSentence.trim() || undefined,
            contextTranslation: formSentenceTr.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Yangilab bo\'lmadi');
        toast.success('So\'z yangilandi!');
      } else {
        const res = await fetch('/api/words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId,
            englishWord: formWord.trim(),
            uzbekTranslation: formTranslation.trim(),
            partOfSpeech: formPos,
            cefr: formCefr,
            exampleSentence: formSentence.trim() || undefined,
            contextTranslation: formSentenceTr.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Qo\'shib bo\'lmadi');
        toast.success('Yangi so\'z qo\'shildi!');
      }

      setShowAddModal(false);
      loadUnitAndWords();
    } catch (err: any) {
      toast.error(err?.message || 'Xatolik yuz berdi');
    } finally {
      setSavingWord(false);
    }
  }

  async function handleDeleteWord(wordId: string, wordText: string) {
    if (!confirm(`"${wordText}" so'zini o'chirasizmi?`)) return;
    try {
      const res = await fetch(`/api/words/${wordId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('O\'chirib bo\'lmadi');
      setWords(prev => prev.filter(w => (w.id || w._id) !== wordId));
      toast.success('So\'z o\'chirildi');
    } catch {
      toast.error('O\'chirishda xatolik');
    }
  }

  async function handleBulkSave(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: { englishWord: string; uzbekTranslation: string; unitId: string }[] = [];

    for (const line of lines) {
      const parts = line.split(/[-–—:=|\t]+/).map(p => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        parsed.push({
          unitId,
          englishWord: parts[0],
          uzbekTranslation: parts[1],
        });
      }
    }

    if (parsed.length === 0) {
      toast.error('Format noto\'g\'ri. Masalan: apple - olma');
      return;
    }

    setSavingBulk(true);
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) throw new Error('Saqlab bo\'lmadi');
      toast.success(`${parsed.length} ta so'z qo'shildi!`);
      setBulkText('');
      setShowBulkModal(false);
      loadUnitAndWords();
    } catch {
      toast.error('So\'zlarni qo\'shishda xatolik');
    } finally {
      setSavingBulk(false);
    }
  }

  async function handleAiExtract() {
    if (aiTab === 'text' && !aiText.trim()) {
      toast.error('Reading matnini kiriting');
      return;
    }
    if (aiTab === 'file' && !aiFile) {
      toast.error('Fayl tanlang');
      return;
    }

    setAiLoading(true);
    setAiProgressText('AI hujjatni o\'qimoqda va IELTS so\'zlarini tahlil qilmoqda...');

    try {
      let res: Response;
      if (aiTab === 'file' && aiFile) {
        const formData = new FormData();
        formData.append('file', aiFile);
        formData.append('requestedCount', String(aiRequestedCount));
        formData.append('cefr', aiCefr);
        formData.append('includePhrases', String(aiIncludePhrases));

        res = await fetch('/api/student/ai-reading/extract', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/student/ai-reading/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: aiText.trim(),
            requestedCount: aiRequestedCount,
            cefr: aiCefr,
            includePhrases: aiIncludePhrases,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'AI tahlilida xatolik yuz berdi');
        return;
      }

      const combined: ExtractedCandidate[] = [
        ...(data.vocabulary || []).map((v: any) => ({ ...v, selected: true })),
        ...(data.phrases || []).map((p: any) => ({ ...p, selected: true })),
      ];

      if (combined.length === 0) {
        toast.error('Matndan mos keluvchi so\'zlar topilmadi');
        return;
      }

      setExtractedCandidates(combined);
      setAiStep('review');
      toast.success(`${combined.length} ta so'z muvaffaqiyatli ajratib olindi!`);
    } catch {
      toast.error('Server bilan aloqada xatolik');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveExtractedWords() {
    const selected = extractedCandidates.filter(c => c.selected);
    if (selected.length === 0) {
      toast.error('Kamida bitta so\'z tanlang');
      return;
    }

    setSavingAiWords(true);
    try {
      const wordsToInsert = selected.map(s => ({
        unitId,
        englishWord: s.word,
        uzbekTranslation: s.uzbekTranslation,
        cefr: s.cefr,
        partOfSpeech: s.partOfSpeech,
        definition: s.definition,
        exampleSentence: s.contextSentence,
        contextTranslation: s.contextTranslation,
      }));

      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordsToInsert),
      });

      if (!res.ok) throw new Error('Saqlab bo\'lmadi');
      toast.success(`${wordsToInsert.length} ta so'z unitga saqlandi!`);
      setShowAiModal(false);
      setAiStep('input');
      setAiText('');
      setAiFile(null);
      loadUnitAndWords();
    } catch {
      toast.error('So\'zlarni saqlashda xatolik');
    } finally {
      setSavingAiWords(false);
    }
  }

  async function handleSaveUnitTitle() {
    if (!editTitle.trim() || !unit) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/student/personal-units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTitle.trim() }),
      });
      if (!res.ok) throw new Error('O\'zgartirib bo\'lmadi');
      setUnit({ ...unit, title: editTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Unit nomi o\'zgartirildi');
    } catch {
      toast.error('Xatolik');
    } finally {
      setSavingTitle(false);
    }
  }

  const filteredWords = words.filter(w =>
    w.englishWord?.toLowerCase().includes(search.toLowerCase()) ||
    w.uzbekTranslation?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f] text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!unit) return null;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8 py-2 md:py-4">

      {/* ── Top Header Navigation Card ── */}
      <div className="glass-card p-6 md:p-8 rounded-3xl bg-white/[0.03] border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <Link
            href="/student/my-vocabulary"
            className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 shrink-0 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 border border-indigo-500 text-lg font-black text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
                <button
                  onClick={handleSaveUnitTitle}
                  disabled={savingTitle}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setIsEditingTitle(false); setEditTitle(unit.title); }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-white">{unit.title}</h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Nomini o'zgartirish"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-xs text-white/50 mt-1.5 font-bold">
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                {unit.category || 'Shaxsiy'}
              </span>
              <span>•</span>
              <span className="text-white/80">{words.length} ta so'z</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {words.length > 0 && (
            <>
              <Link
                href={`/student/games?unitId=${unitId}`}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
              >
                <Play className="w-4 h-4 fill-white" />
                O'yinlar
              </Link>
              <Link
                href={`/student/quiz?unitId=${unitId}`}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
              >
                <HelpCircle className="w-4 h-4" />
                Quiz
              </Link>
            </>
          )}

          {/* AI Reading / PDF Extractor Button */}
          <button
            onClick={() => { setShowAiModal(true); setAiStep('input'); }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-purple-600/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
            Reading / PDF dan olish
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-white/60" />
            Matndan
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            So'z qo'shish
          </button>
        </div>
      </div>

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

      {/* ── Words Display Grid / Down Wrapper ── */}
      {words.length === 0 ? (
        <div className="py-16 md:py-20 px-6 md:px-12 text-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.015] backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl relative overflow-hidden my-2">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500/20 via-indigo-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-5 shadow-2xl shadow-purple-600/20">
            <BookOpen className="w-10 h-10" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-2">Bu unitda hali so'zlar yo'q</h3>
          <p className="text-sm text-white/50 max-w-lg mb-8 leading-relaxed font-medium">
            IELTS Reading matnidan, PDF/DOCX fayldan AI yordamida ajratib oling yoki qo'lda yangi so'zlarni kiriting.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 w-full max-w-2xl">
            <button
              onClick={() => { setShowAiModal(true); setAiStep('input'); }}
              className="flex-1 min-w-[240px] flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-purple-600/30 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" /> Reading / PDF dan AI bilan olish
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs md:text-sm uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Bitta so'z qo'shish
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-black text-xs md:text-sm uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4" /> Matndan ko'chirish
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
            {filteredWords.map((word, index) => {
              const wordId = word.id || word._id || String(index);
              const cefrBadge = word.cefr ? (CEFR_COLORS[word.cefr] || 'bg-white/10 text-white/60') : null;

              return (
                <div
                  key={wordId}
                  className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xl font-black tracking-tight text-white">{word.englishWord}</span>
                        <button
                          onClick={() => playAudio(word.englishWord)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          title="Tinglash"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        {cefrBadge && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase ${cefrBadge}`}>
                            {word.cefr}
                          </span>
                        )}
                        {word.partOfSpeech && (
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            {word.partOfSpeech}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(word)}
                          className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteWord(wordId, word.englishWord)}
                          className="p-2 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
                        {word.contextTranslation && (
                          <p className="text-xs text-white/40">{word.contextTranslation}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ── AI Reading / PDF Extractor Modal ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#12131c] border border-white/15 shadow-2xl overflow-hidden relative my-auto">

            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">AI Reading & PDF So'z Ajratgich</h3>
                  <p className="text-xs text-white/50 mt-0.5">IELTS Reading yoki PDF / DOCX fayllardan avtomatik akademik so'zlar ajratish</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-7 custom-scrollbar">
              {aiStep === 'input' ? (
                <>
                  {/* Tab Selector */}
                  <div className="flex rounded-2xl bg-white/5 p-1.5 border border-white/10 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAiTab('text')}
                      className={`flex-1 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                        aiTab === 'text'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <FileText className="w-4 h-4" /> Matn kiritish
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTab('file')}
                      className={`flex-1 py-3.5 px-6 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                        aiTab === 'file'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" /> Fayl yuklash (PDF / DOCX)
                    </button>
                  </div>

                  {aiTab === 'text' ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-white/50">
                        Reading passage yoki matnni shu yerga qo'ying
                      </label>
                      <textarea
                        rows={9}
                        value={aiText}
                        onChange={e => setAiText(e.target.value)}
                        placeholder="Reading passage matnini bu yerga nusxalab qo'ying (IELTS passage, ilmiy maqola, kitob parchasi)..."
                        className="w-full p-5 rounded-2xl bg-white/[0.04] border border-white/10 text-sm md:text-base text-white placeholder:text-white/30 outline-none focus:border-purple-500 transition-colors custom-scrollbar leading-relaxed"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-white/50">
                        Faylni tanlang yoki yuklang
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                        onChange={e => setAiFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-white/15 hover:border-purple-500/60 rounded-3xl p-10 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-purple-500/5 group"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        {aiFile ? (
                          <div>
                            <p className="text-base font-black text-white">{aiFile.name}</p>
                            <p className="text-xs text-white/50 mt-1">{(aiFile.size / 1024).toFixed(1)} KB • Fayl tanlandi</p>
                            <p className="text-xs text-purple-400 mt-3 font-bold uppercase tracking-wider underline">Boshqa fayl tanlash</p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-base font-black text-white mb-1.5">PDF, DOCX yoki Rasm faylini tanlash uchun bosing</p>
                            <p className="text-xs text-white/40">Maksimal hajm: 20MB gacha</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-white/50">
                        So'zlar soni
                      </label>
                      <select
                        value={aiRequestedCount}
                        onChange={e => setAiRequestedCount(parseInt(e.target.value))}
                        className="w-full h-14 px-5 rounded-2xl bg-[#1a1c29] border border-white/10 text-sm font-bold text-white outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value={10}>10 ta eng muhim so'z</option>
                        <option value={20}>20 ta so'z (Tavsiya etiladi)</option>
                        <option value={30}>30 ta so'z</option>
                        <option value={50}>50 ta so'z (Katta matnlar)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-white/50">
                        IELTS / CEFR Darajasi
                      </label>
                      <select
                        value={aiCefr}
                        onChange={e => setAiCefr(e.target.value)}
                        className="w-full h-14 px-5 rounded-2xl bg-[#1a1c29] border border-white/10 text-sm font-bold text-white outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="Mixed">Barcha darajalar (Mixed B1-C2)</option>
                        <option value="B1">B1 — Intermediate (IELTS 4.5 - 5.0)</option>
                        <option value="B2">B2 — Upper-Intermediate (IELTS 5.5 - 6.5)</option>
                        <option value="C1">C1 — Advanced (IELTS 7.0 - 8.0)</option>
                        <option value="C2">C2 — Proficiency (IELTS 8.5 - 9.0)</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                /* Step 2: Review Extracted Candidates */
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div>
                      <h4 className="text-base font-black uppercase tracking-wider text-white">
                        Ajratib olingan so'zlar ({extractedCandidates.filter(c => c.selected).length} / {extractedCandidates.length})
                      </h4>
                      <p className="text-xs text-white/50 mt-0.5">Unitga qo'shmoqchi bo'lgan so'zlarni tanlang</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = extractedCandidates.every(c => c.selected);
                        setExtractedCandidates(prev => prev.map(c => ({ ...c, selected: !allSelected })));
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider text-purple-400 self-start sm:self-auto"
                    >
                      {extractedCandidates.every(c => c.selected) ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-2 custom-scrollbar">
                    {extractedCandidates.map((candidate, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setExtractedCandidates(prev =>
                            prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c))
                          );
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                          candidate.selected
                            ? 'bg-purple-600/10 border-purple-500/40 shadow-lg shadow-purple-600/10'
                            : 'bg-white/[0.02] border-white/5 opacity-50 hover:opacity-75'
                        }`}
                      >
                        <div className="pt-1 text-purple-400 shrink-0">
                          {candidate.selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-white/30" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <span className="font-black text-white text-lg">{candidate.word}</span>
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border uppercase ${CEFR_COLORS[candidate.cefr] || 'bg-white/10'}`}>
                              {candidate.cefr}
                            </span>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {candidate.partOfSpeech}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-purple-300 mb-1.5">{candidate.uzbekTranslation}</p>

                          {candidate.contextSentence && (
                            <p className="text-xs text-white/55 italic leading-relaxed">"{candidate.contextSentence}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 sm:px-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02]">
              {aiStep === 'input' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-white/60 transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleAiExtract}
                    className="w-full sm:w-auto flex-1 sm:flex-initial h-14 px-10 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-500 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-purple-600/35 transition-all active:scale-95"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Tahlil qilinmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                        <span>AI Tahlilni Boshlash</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAiStep('input')}
                    className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-white/60 transition-colors"
                  >
                    Ortga qaytish
                  </button>
                  <button
                    type="button"
                    disabled={savingAiWords || extractedCandidates.filter(c => c.selected).length === 0}
                    onClick={handleSaveExtractedWords}
                    className="w-full sm:w-auto flex-1 sm:flex-initial h-14 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-purple-600/35 transition-all active:scale-95"
                  >
                    {savingAiWords ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5 stroke-[3]" />
                    )}
                    <span>{extractedCandidates.filter(c => c.selected).length} ta so'zni saqlash</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Single Word Add/Edit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#12131c] border border-white/10 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase tracking-wider">
                {editingWord ? 'So\'zni tahrirlash' : 'Yangi so\'z qo\'shish'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWord} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                  Inglizcha so'z <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  value={formWord}
                  onChange={e => setFormWord(e.target.value)}
                  placeholder="Masalan: accomplish"
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                  O'zbekcha tarjima <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="text"
                  value={formTranslation}
                  onChange={e => setFormTranslation(e.target.value)}
                  placeholder="Masalan: erishmoq, bajarmoq"
                  required
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                    So'z turkumi
                  </label>
                  <select
                    value={formPos}
                    onChange={e => setFormPos(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#1a1c29] border border-white/10 text-sm outline-none focus:border-indigo-500 transition-colors text-white"
                  >
                    <option value="noun">Ot (noun)</option>
                    <option value="verb">Fe'l (verb)</option>
                    <option value="adjective">Sifat (adjective)</option>
                    <option value="adverb">Ravish (adverb)</option>
                    <option value="phrase">Ibora (phrase)</option>
                    <option value="other">Boshqa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                    CEFR / IELTS Darajasi
                  </label>
                  <select
                    value={formCefr}
                    onChange={e => setFormCefr(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-[#1a1c29] border border-white/10 text-sm outline-none focus:border-indigo-500 transition-colors text-white"
                  >
                    <option value="A1">A1 — Beginner</option>
                    <option value="A2">A2 — Elementary</option>
                    <option value="B1">B1 — Intermediate</option>
                    <option value="B2">B2 — Upper-Intermediate</option>
                    <option value="C1">C1 — Advanced</option>
                    <option value="C2">C2 — Proficiency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">
                  Misol gap (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={formSentence}
                  onChange={e => setFormSentence(e.target.value)}
                  placeholder="She accomplished her lifelong goal."
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white/60"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingWord || !formWord.trim() || !formTranslation.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  {savingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Add Modal ── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#12131c] border border-white/10 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider">Matndan so'zlar qo'shish</h3>
                <p className="text-xs text-white/40 mt-0.5">Har bir qatorga: so'z - tarjima</p>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkSave} className="space-y-4">
              <div>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={`accomplish - erishmoq\ncanopy - o'rmon qoplami\ngleaned - to'plangan\ndiversity - xilma-xillik`}
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-mono outline-none focus:border-indigo-500 transition-colors custom-scrollbar"
                  autoFocus
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                💡 Maslahat: Har bir qatorga bittadan so'z va chiziqcha (-) yoki tenglik (=) bilan tarjimasini yozing.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white/60"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingBulk || !bulkText.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  {savingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                  Barchasini qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
