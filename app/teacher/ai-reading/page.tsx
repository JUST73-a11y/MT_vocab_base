'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Search,
  Eye,
  Edit2,
  Trash2,
  BookOpen,
  Layers,
  CheckSquare,
  Square,
  Star,
  Info,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface VocabItem {
  id: string;
  word: string;
  uzbekTranslation: string;
  cefr: string;
  partOfSpeech: string;
  definition: string;
  contextSentence: string;
  contextTranslation: string;
  importanceScore: number;
  confidence: 'high' | 'medium' | 'low';
  phonetic?: string;
  itemType: 'word' | 'phrase';
  selected: boolean;
  isDuplicate?: boolean;
}

interface IdeaItem {
  id: string;
  title: string;
  summary: string;
  importance: 'high' | 'medium' | 'low';
  sourceQuote: string;
}

interface UnitOption {
  _id: string;
  title: string;
  category?: string;
}

const IELTS_LEVELS = [
  { id: 'Mixed', label: 'IELTS Standard (Mixed)', band: 'Band 6.0 – 7.5', cefr: 'B1–C1', desc: 'Asosiy IELTS o\'qish va akademik so\'zlari' },
  { id: 'B2', label: 'IELTS Upper-Intermediate', band: 'Band 5.5 – 6.5', cefr: 'CEFR B2', desc: 'Ko\'p uchraydigan akademik leksika' },
  { id: 'C1', label: 'IELTS Advanced Reading', band: 'Band 7.0 – 8.0', cefr: 'CEFR C1', desc: 'Yuqori ball uchun zarur ilmiy so\'zlar' },
  { id: 'C2', label: 'IELTS Expert / Native', band: 'Band 8.5 – 9.0', cefr: 'CEFR C2', desc: 'Murakkab, noyob akademik strukturalar' },
  { id: 'B1', label: 'IELTS Foundation / Pre-Int', band: 'Band 4.5 – 5.0', cefr: 'CEFR B1', desc: 'Boshlang\'ich akademik so\'z boyligi' },
  { id: 'Any', label: 'Barcha IELTS Darajalari', band: 'All Bands', cefr: 'A1–C2', desc: 'Matndagi eng foydali barcha so\'zlar' },
  { id: 'A2', label: 'IELTS Elementary', band: 'Band 3.5 – 4.0', cefr: 'CEFR A2', desc: 'Oddiy umumiy so\'zlar' },
  { id: 'A1', label: 'IELTS Beginner', band: 'Band 2.5 – 3.0', cefr: 'CEFR A1', desc: 'Boshlang\'ich eng sodda so\'zlar' },
] as const;

const WORD_COUNT_PRESETS = [10, 15, 20, 30, 40, 50, 75, 100];

export default function AIReadingExtractorPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Input
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Settings
  const [requestedCount, setRequestedCount] = useState<number>(30);
  const [customCount, setCustomCount] = useState<string>('');
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [cefr, setCefr] = useState<string>('B2');
  const [includePhrases, setIncludePhrases] = useState(true);
  const [includeIdeas, setIncludeIdeas] = useState(false);

  // Step 3: Analysis State
  const [analysisStatus, setAnalysisStatus] = useState<string>("Hujjat tahlilga tayyorlanmoqda...");
  const [analysisProgress, setAnalysisProgress] = useState(15);
  const [sessionId, setSessionId] = useState<string>('');
  const [serverNotice, setServerNotice] = useState<string>('');

  // Step 4: Review
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [ideasList, setIdeasList] = useState<IdeaItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'word' | 'phrase'>('all');
  const [filterCefr, setFilterCefr] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  const [viewingContextItem, setViewingContextItem] = useState<VocabItem | null>(null);

  // Step 5: Target Unit & Import
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [categories, setCategories] = useState<string[]>(['IELTS Reading', 'Cambridge IELTS', 'Academic Reading', 'General English']);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [isCreatingNewUnit, setIsCreatingNewUnit] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitCategory, setNewUnitCategory] = useState('IELTS Reading');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
      router.push('/login');
      return;
    }
    fetchUnits();
  }, [user, authLoading]);

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units');
      if (res.ok) {
        const data = await res.json();
        const loadedUnits = Array.isArray(data) ? data : data.units || [];
        setUnits(loadedUnits);
        if (loadedUnits.length > 0 && !selectedUnitId) {
          setSelectedUnitId(loadedUnits[0]._id);
        }

        // Extract categories
        const unitCats = loadedUnits.map((u: any) => u.category).filter(Boolean);
        try {
          const catRes = await fetch('/api/teacher/categories');
          if (catRes.ok) {
            const catData = await catRes.json();
            if (Array.isArray(catData)) {
              unitCats.push(...catData.map((c: any) => c.name || c.path).filter(Boolean));
            }
          }
        } catch { /* ignore */ }

        const uniqueCats = Array.from(new Set(['IELTS Reading', 'Cambridge IELTS', 'Academic Reading', 'General English', ...unitCats]));
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('Failed to load units:', err);
    }
  };

  const startExtraction = async () => {
    if (inputMode === 'file' && !file) {
      toast.error('Iltimos, avval faylni yuklang!');
      return;
    }
    if (inputMode === 'text' && !rawText.trim()) {
      toast.error('Iltimos, matn kiriting!');
      return;
    }

    setStep(3);
    setAnalysisProgress(20);
    setAnalysisStatus("Matn ajratib olinmoqda va tozalanmoqda...");

    const countToSend = isCustomCount ? parseInt(customCount) || 30 : requestedCount;

    try {
      let res: Response;

      if (inputMode === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requestedCount', countToSend.toString());
        formData.append('cefr', cefr);
        formData.append('includePhrases', includePhrases.toString());
        formData.append('includeIdeas', includeIdeas.toString());

        setTimeout(() => {
          setAnalysisProgress(45);
          setAnalysisStatus("AI o'qish kontekstini tahlil qilmoqda (CEFR & IELTS mezonlari)...");
        }, 1200);

        setTimeout(() => {
          setAnalysisProgress(75);
          setAnalysisStatus("Eng qimmatli so'zlar saralanmoqda va tekshirilmoqda...");
        }, 3500);

        res = await fetch('/api/teacher/ai-reading/extract', {
          method: 'POST',
          body: formData,
        });
      } else {
        setTimeout(() => {
          setAnalysisProgress(45);
          setAnalysisStatus("AI matnni CEFR bo'yicha tahlil qilmoqda...");
        }, 1000);

        res = await fetch('/api/teacher/ai-reading/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: rawText,
            requestedCount: countToSend,
            cefr,
            includePhrases,
            includeIdeas,
          }),
        });
      }

      setAnalysisProgress(90);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI tahlilida xatolik yuz berdi');
      }

      setSessionId(data.sessionId);
      if (data.metadata?.message) {
        setServerNotice(data.metadata.message);
      }

      const combinedItems: VocabItem[] = [
        ...(data.vocabulary || []).map((v: any, idx: number) => ({
          ...v,
          id: 'v_' + idx + '_' + Date.now(),
          selected: true,
          itemType: 'word' as const,
        })),
        ...(data.phrases || []).map((p: any, idx: number) => ({
          ...p,
          id: 'p_' + idx + '_' + Date.now(),
          selected: true,
          itemType: 'phrase' as const,
        })),
      ];

      const mappedIdeas: IdeaItem[] = (data.ideas || []).map((i: any, idx: number) => ({
        ...i,
        id: 'idea_' + idx + '_' + Date.now(),
      }));

      setVocabList(combinedItems);
      setIdeasList(mappedIdeas);

      setAnalysisProgress(100);
      setAnalysisStatus('Muvaffaqiyatli yakunlandi!');
      setTimeout(() => setStep(4), 500);

    } catch (err: any) {
      toast.error(err.message || 'Xatolik yuz berdi');
      setStep(2);
    }
  };

  const checkDuplicatesForUnit = async (unitId: string) => {
    if (!unitId || vocabList.length === 0) return;
    try {
      const wordsToCheck = vocabList.map(v => v.word);
      const res = await fetch('/api/teacher/ai-reading/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, words: wordsToCheck }),
      });
      if (res.ok) {
        const data = await res.json();
        const dupSet = new Set((data.duplicates || []).map((d: string) => d.toLowerCase().trim()));
        setVocabList(prev => prev.map(item => ({
          ...item,
          isDuplicate: dupSet.has(item.word.toLowerCase().trim()),
        })));
      }
    } catch (err) {
      console.error('Duplicate check error:', err);
    }
  };

  const toggleSelect = (id: string) => {
    setVocabList(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setVocabList(prev => prev.map(item => ({ ...item, selected: select })));
  };

  const handleRemoveItem = (id: string) => {
    setVocabList(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveEdit = (updated: VocabItem) => {
    setVocabList(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    setEditingItem(null);
    toast.success("O'zgarish saqlandi");
  };

  const handleFinalImport = async () => {
    let targetUnitId = selectedUnitId;

    if (isCreatingNewUnit) {
      if (!newUnitTitle.trim()) {
        toast.error('Yangi unit nomini kiriting!');
        return;
      }
      const finalCategory = isCustomCategory
        ? (customCategoryName.trim() || 'AI Reading')
        : (newUnitCategory || 'AI Reading');

      try {
        const createRes = await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newUnitTitle.trim(),
            category: finalCategory,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.message || createData.error || 'Unit yaratishda xato');
        targetUnitId = createData._id || createData.id || createData.unit?._id || createData.unit?.id;
        if (!targetUnitId) throw new Error('Unit ID olinmadi');
      } catch (e: any) {
        toast.error(e.message || 'Unit yaratishda xatolik');
        return;
      }
    }

    if (!targetUnitId) {
      toast.error('Iltimos, maqsadli unitni tanlang');
      return;
    }

    const selectedItems = vocabList.filter(v => v.selected);
    if (selectedItems.length === 0) {
      toast.error("Hech bo'lmaganda bitta so'z tanlang");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch('/api/teacher/ai-reading/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          unitId: targetUnitId,
          selectedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Saqlashda xato');

      toast.success(data.message || "So'zlar muvaffaqiyatli import qilindi!");
      router.push('/teacher/units/' + targetUnitId);
    } catch (err: any) {
      toast.error(err.message || 'Import amalga oshmadi');
      setIsImporting(false);
    }
  };

  const filteredVocab = vocabList.filter(item => {
    if (filterType === 'word' && item.itemType !== 'word') return false;
    if (filterType === 'phrase' && item.itemType !== 'phrase') return false;
    if (filterCefr !== 'all' && item.cefr?.toUpperCase() !== filterCefr.toUpperCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.word.toLowerCase().includes(q) ||
        item.uzbekTranslation.toLowerCase().includes(q) ||
        item.definition?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedCount = vocabList.filter(v => v.selected).length;
  const duplicateCount = vocabList.filter(v => v.isDuplicate).length;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">AI Reading Vocabulary Extractor</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                v1.0 Pro
              </span>
            </div>
            <p className="text-sm text-slate-400">
              O'qish matnlari va hujjatlardan IELTS/CEFR uchun eng muhim akademik so'zlarni aqlli ajratish
            </p>
          </div>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
          {[
            { num: 1, label: 'Fayl' },
            { num: 2, label: 'Sozlamalar' },
            { num: 3, label: 'AI Tahlil' },
            { num: 4, label: "Ko'rib chiqish" },
            { num: 5, label: 'Import' },
          ].map(s => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : step > s.num
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-500'
              }`}
            >
              <span>{step > s.num ? '✓' : s.num}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              <button
                onClick={() => setInputMode('file')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  inputMode === 'file'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                Hujjat yoki Rasm yuklash
              </button>
              <button
                onClick={() => setInputMode('text')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  inputMode === 'text'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                Matn nusxasini qo'yish (Paste)
              </button>
            </div>

            {inputMode === 'file' ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    setFile(e.dataTransfer.files[0]);
                    setInputMode('file');
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[320px] ${
                  file
                    ? 'border-indigo-500/80 bg-indigo-950/20'
                    : 'border-slate-800 hover:border-indigo-500/50 bg-slate-900/40 hover:bg-slate-900/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={e => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />

                {file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{file.name}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'Hujjat'}
                      </p>
                    </div>
                    <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold">
                      Fayl tanlandi — Sozlamalarga o'tish mumkin
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-200">
                        Hujjatni bu yerga tashlang yoki tanlash uchun bosing
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PDF, DOCX, XLSX, CSV, TXT yoki Rasm (JPG, PNG, WEBP)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="IELTS yoki akademik o'qish matnini shu yerga joylashtiring..."
                  className="w-full h-80 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 focus:border-indigo-500 outline-none text-slate-200 text-sm leading-relaxed resize-none"
                />
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  if (inputMode === 'file' && !file) {
                    toast.error('Fayl tanlang');
                    return;
                  }
                  if (inputMode === 'text' && !rawText.trim()) {
                    toast.error('Matn kiriting');
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                Keyingi: Sozlamalar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: SETTINGS */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Number of Words */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Ajratib olinadigan so'zlar soni
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    AI hujjatdan taxminan shuncha eng muhim so'zlarni tanlaydi (sifat miqdordan ustun).
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-bold rounded-xl text-sm border border-indigo-500/30">
                  {isCustomCount ? customCount || 0 : requestedCount} ta so'z
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {WORD_COUNT_PRESETS.map(count => (
                  <button
                    key={count}
                    onClick={() => {
                      setRequestedCount(count);
                      setIsCustomCount(false);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      !isCustomCount && requestedCount === count
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}

                <button
                  onClick={() => setIsCustomCount(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isCustomCount
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Boshqa...
                </button>
              </div>

              {isCustomCount && (
                <div className="pt-2">
                  <input
                    type="number"
                    min="5"
                    max="150"
                    value={customCount}
                    onChange={e => setCustomCount(e.target.value)}
                    placeholder="Masalan: 35"
                    className="w-40 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* IELTS / CEFR Target Level */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    Target IELTS / CEFR Darajasi
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    O'quvchilaringizning IELTS darajasiga mos akademik so'zlar ajratiladi.
                  </p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-bold rounded-xl text-xs border border-indigo-500/30">
                  Tanlangan: {IELTS_LEVELS.find(l => l.id === cefr)?.band || cefr}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {IELTS_LEVELS.map(lvl => (
                  <button
                    key={lvl.id}
                    onClick={() => setCefr(lvl.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      cefr === lvl.id
                        ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-white">{lvl.band}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-300">
                        {lvl.cefr}
                      </span>
                    </div>
                    <p className="font-semibold text-xs text-slate-300">{lvl.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                      {lvl.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Toggles */}
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Qo'shimcha ajratish turlari
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setIncludePhrases(!includePhrases)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    includePhrases
                      ? 'border-indigo-500/60 bg-indigo-950/20 text-white'
                      : 'border-slate-800 bg-slate-900/30 text-slate-400'
                  }`}
                >
                  <div className="pt-0.5">
                    {includePhrases ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-200">Useful Phrases & Collocations</p>
                    <p className="text-xs text-slate-400 mt-1">
                      "pose a threat", "play a crucial role" kabi akademik iboralarni ham ajratish
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setIncludeIdeas(!includeIdeas)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    includeIdeas
                      ? 'border-indigo-500/60 bg-indigo-950/20 text-white'
                      : 'border-slate-800 bg-slate-900/30 text-slate-400'
                  }`}
                >
                  <div className="pt-0.5">
                    {includeIdeas ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-200">Important Ideas & Concepts</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Matndagi asosiy g'oyalar va ilmiy tezislarni ko'rib chiqish oynasida chiqarish
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Nav Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Orqaga
              </button>

              <button
                onClick={startExtraction}
                className="px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                AI Tahlilni Boshlash
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: AI ANALYSIS PROGRESS */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-16 text-center max-w-lg mx-auto space-y-6"
          >
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/40">
                <Sparkles className="w-12 h-12 text-white animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">AI Matnni O'rganmoqda...</h2>
              <p className="text-sm text-slate-400">{analysisStatus}</p>
            </div>

            <div className="space-y-2">
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  initial={{ width: '10%' }}
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-xs text-slate-500">{analysisProgress}% bajarildi</p>
            </div>
          </motion.div>
        )}

        {/* STEP 4: REVIEW */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {serverNotice && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-sm">
                <Info className="w-5 h-5 flex-shrink-0" />
                <span>{serverNotice}</span>
              </div>
            )}

            {/* Ideas Section */}
            {ideasList.length > 0 && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Matndagi Asosiy G'oyalar ({ideasList.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ideasList.map(idea => (
                    <div key={idea.id} className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
                      <p className="font-bold text-slate-200">{idea.title}</p>
                      <p className="text-slate-400">{idea.summary}</p>
                      {idea.sourceQuote && (
                        <p className="text-slate-400 italic bg-slate-900/50 p-2 rounded-lg">
                          "{idea.sourceQuote}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl">
                {[
                  { id: 'all', label: `Barchasi (${vocabList.length})` },
                  { id: 'word', label: `So'zlar (${vocabList.filter(v => v.itemType === 'word').length})` },
                  { id: 'phrase', label: `Iboralar (${vocabList.filter(v => v.itemType === 'phrase').length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterType === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Qidirish..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={filterCefr}
                  onChange={e => setFilterCefr(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white outline-none"
                >
                  <option value="all">Barcha CEFR</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Hammasini tanlash
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                >
                  Tozalash
                </button>
              </div>
            </div>

            {/* Vocabulary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredVocab.map(item => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all relative ${
                    item.selected
                      ? 'bg-slate-900/80 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className="mt-0.5 text-indigo-400 hover:text-indigo-300"
                    >
                      {item.selected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-white">{item.word}</span>
                        {item.phonetic && (
                          <span className="text-xs text-slate-400 font-mono">[{item.phonetic}]</span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {item.cefr || 'B2'}
                        </span>
                        {item.partOfSpeech && (
                          <span className="text-[11px] text-slate-400 italic">
                            {item.partOfSpeech}
                          </span>
                        )}
                        {item.itemType === 'phrase' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-purple-500/20 text-purple-300 rounded">
                            phrase
                          </span>
                        )}
                        {item.isDuplicate && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                            Dublikat
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-emerald-400 mt-1">
                        {item.uzbekTranslation || 'Tarjima kiritilmagan'}
                      </p>

                      {item.definition && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {item.definition}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-2 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.round((item.importanceScore || 0.8) * 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-slate-500 ml-1">
                          {item.confidence}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.contextSentence && (
                        <button
                          onClick={() => setViewingContextItem(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                          title="Kontekstni ko'rish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Sozlamalarga qaytish
              </button>

              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">
                  <b className="text-white">{selectedCount}</b> ta so'z tanlandi
                </span>

                <button
                  onClick={() => {
                    if (selectedCount === 0) {
                      toast.error("Hech bo'lmaganda bitta so'z tanlang");
                      return;
                    }
                    if (selectedUnitId) checkDuplicatesForUnit(selectedUnitId);
                    setStep(5);
                  }}
                  className="px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  Keyingi: Unit Tanlash
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: IMPORT TO UNIT */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                So'zlarni MT-Vocab Unitiga Import Qilish
              </h2>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Maqsadli Unit
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCreatingNewUnit(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      !isCreatingNewUnit
                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400'
                    }`}
                  >
                    Mavjud Unitga qo'shish
                  </button>
                  <button
                    onClick={() => setIsCreatingNewUnit(true)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      isCreatingNewUnit
                        ? 'border-indigo-500 bg-indigo-600/20 text-white'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400'
                    }`}
                  >
                    + Yangi Unit yaratish
                  </button>
                </div>

                {!isCreatingNewUnit ? (
                  <select
                    value={selectedUnitId}
                    onChange={e => {
                      setSelectedUnitId(e.target.value);
                      checkDuplicatesForUnit(e.target.value);
                    }}
                    className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
                  >
                    {units.length === 0 && <option value="">Unitlar mavjud emas</option>}
                    {units.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.title} {u.category ? `(${u.category})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 font-medium">Yangi Unit nomi</label>
                      <input
                        type="text"
                        value={newUnitTitle}
                        onChange={e => setNewUnitTitle(e.target.value)}
                        placeholder="Masalan: IELTS Reading Passage 3 — Biodiversity"
                        className="w-full mt-1 p-3.5 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-slate-400 font-medium">Unit Kategoriyasi</label>
                        <button
                          type="button"
                          onClick={() => setIsCustomCategory(!isCustomCategory)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          {isCustomCategory ? "Mavjud ro'yxatdan tanlash" : "+ Yangi kategoriya yozish"}
                        </button>
                      </div>

                      {!isCustomCategory ? (
                        <select
                          value={newUnitCategory}
                          onChange={e => setNewUnitCategory(e.target.value)}
                          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                        >
                          {categories.map((cat, idx) => (
                            <option key={idx} value={cat}>
                              📁 {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={customCategoryName}
                          onChange={e => setCustomCategoryName(e.target.value)}
                          placeholder="Kategoriya nomini yozing (masalan: Cambridge 18, Academic..."
                          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs">
                <p className="font-bold text-slate-300">Import xulosasi:</p>
                <div className="flex justify-between text-slate-400">
                  <span>Tanlangan so'zlar:</span>
                  <span className="font-bold text-white">{selectedCount} ta</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Mavjud dublikatlar (o'tkazib yuboriladi):</span>
                  <span className="font-bold text-amber-400">{duplicateCount} ta</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Yangi qo'shiladigan so'zlar:</span>
                  <span className="font-bold text-emerald-400">{Math.max(0, selectedCount - duplicateCount)} ta</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(4)}
                disabled={isImporting}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Ro'yxatga qaytish
              </button>

              <button
                onClick={handleFinalImport}
                disabled={isImporting || selectedCount === 0}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    MT-Vocab'ga Import Qilish
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-white">So'zni Tahrirlash</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Inglizcha so'z</label>
                <input
                  type="text"
                  value={editingItem.word}
                  onChange={e => setEditingItem({ ...editingItem, word: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">O'zbekcha tarjimasi</label>
                <input
                  type="text"
                  value={editingItem.uzbekTranslation}
                  onChange={e => setEditingItem({ ...editingItem, uzbekTranslation: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">CEFR darajasi</label>
                  <select
                    value={editingItem.cefr}
                    onChange={e => setEditingItem({ ...editingItem, cefr: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium">So'z turkumi (POS)</label>
                  <input
                    type="text"
                    value={editingItem.partOfSpeech || ''}
                    onChange={e => setEditingItem({ ...editingItem, partOfSpeech: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Ta'rif (Definition)</label>
                <textarea
                  value={editingItem.definition || ''}
                  onChange={e => setEditingItem({ ...editingItem, definition: e.target.value })}
                  rows={2}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleSaveEdit(editingItem)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Context Modal */}
      {viewingContextItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                Matndagi Manba Konteksti
              </h3>
              <button
                onClick={() => setViewingContextItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-slate-400 font-medium">So'z:</p>
                <p className="text-sm font-bold text-indigo-300">{viewingContextItem.word}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-slate-400 font-medium">Asl jumla (Source Sentence):</p>
                <p className="text-slate-200 text-sm italic">
                  "{viewingContextItem.contextSentence}"
                </p>
              </div>

              {viewingContextItem.contextTranslation && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-medium">Jumla tarjimasi:</p>
                  <p className="text-emerald-400 text-sm">
                    {viewingContextItem.contextTranslation}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingContextItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
