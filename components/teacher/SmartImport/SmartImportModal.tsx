'use client';

import React, { useState } from 'react';
import {
  Sparkles, FileText, Image as ImageIcon, FileCode, FileSpreadsheet,
  Upload, X, Loader2, Wand2, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import { ExtractedEntry, ExtractionResult, SavePayload } from '@/lib/vocab/smartExtract';
import PreviewTable from './PreviewTable';
import ConfirmBar from './ConfirmBar';
import toast from 'react-hot-toast';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  onSuccess: () => void;
}

type TabType = 'text' | 'image' | 'pdf' | 'docx' | 'smart';

export default function SmartImportModal({
  isOpen,
  onClose,
  unitId,
  onSuccess,
}: SmartImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('text');

  // Form / Options state
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [suggestEmojis, setSuggestEmojis] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(true);

  // Extraction state
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingTranslations, setGeneratingTranslations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  if (!isOpen) return null;

  // Reset extraction to start over
  const handleReset = () => {
    setExtractionResult(null);
    setInputText('');
    setSelectedFile(null);
  };

  // ── Trigger extraction ──────────────────────────────────────────────────
  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      let res: Response;

      if (activeTab === 'text' || activeTab === 'smart') {
        if (!inputText.trim()) {
          toast.error("Iltimos, matn kiriting");
          setAnalyzing(false);
          return;
        }

        res = await fetch('/api/teacher/vocab-import/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            mode: activeTab === 'smart' ? 'smart_extract' : 'auto',
            suggestEmojis,
          }),
        });
      } else {
        if (!selectedFile) {
          toast.error("Iltimos, fayl tanlang");
          setAnalyzing(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('suggestEmojis', String(suggestEmojis));

        res = await fetch('/api/teacher/vocab-import/file', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Tahlilda xatolik yuz berdi');
      }

      const result = data as ExtractionResult;
      setExtractionResult(result);

      if (result.entries.length === 0) {
        toast.error("Lug'at so'zlari topilmadi");
      } else {
        toast.success(`${result.entries.length} ta so'z ajratib olindi`);
      }
    } catch (err: any) {
      console.error('Analyze failed:', err);
      toast.error(err.message || 'Tahlil muvaffaqiyatsiz bo\'ldi');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Batch generate missing translations ─────────────────────────────────
  const handleGenerateMissingTranslations = async () => {
    if (!extractionResult) return;

    const missingEntries = extractionResult.entries.filter(
      (e) => !e.uzbekTranslation.trim()
    );
    if (missingEntries.length === 0) return;

    setGeneratingTranslations(true);
    try {
      const wordsToTranslate = missingEntries.map((e) => e.englishWord);
      const res = await fetch('/api/teacher/vocab-import/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: wordsToTranslate }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Tarjima yaratishda xatolik');

      const translationsMap: Record<string, string> = data.translations || {};

      const updatedEntries = extractionResult.entries.map((entry) => {
        if (!entry.uzbekTranslation.trim() && translationsMap[entry.englishWord]) {
          return {
            ...entry,
            uzbekTranslation: translationsMap[entry.englishWord],
            aiTranslation: true,
          };
        }
        return entry;
      });

      setExtractionResult({
        ...extractionResult,
        entries: updatedEntries,
      });

      toast.success(`${Object.keys(translationsMap).length} ta tarjima AI bilan yaratildi`);
    } catch (err: any) {
      console.error('Translate failed:', err);
      toast.error(err.message || 'Tarjimada xatolik yuz berdi');
    } finally {
      setGeneratingTranslations(false);
    }
  };

  // ── Final save confirmation ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!extractionResult) return;

    const selectedEntries = extractionResult.entries.filter((e) => e.selected);
    if (selectedEntries.length === 0) {
      toast.error("Saqlash uchun kamida 1 ta so'z tanlang");
      return;
    }

    setSaving(true);
    try {
      const payload: SavePayload = {
        unitId,
        entries: selectedEntries.map((e) => ({
          englishWord: e.englishWord,
          uzbekTranslation: e.uzbekTranslation,
          phonetic: e.phonetic,
          exampleSentence: e.exampleSentence,
          emoji: e.emoji,
          emojiSource: e.emojiSource,
          sourceType: e.sourceType,
          confidence: e.confidence,
        })),
      };

      const res = await fetch('/api/teacher/vocab-import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Saqlashda xatolik');

      toast.success(data.message || 'Lug\'at so\'zlari saqlandi');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error(err.message || 'Saqlash muvaffaqiyatsiz bo\'ldi');
    } finally {
      setSaving(false);
    }
  };

  // Helper entry updater
  const handleUpdateEntry = (id: string, updates: Partial<ExtractedEntry>) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      entries: extractionResult.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  };

  const handleToggleSelectAll = (select: boolean) => {
    if (!extractionResult) return;
    setExtractionResult({
      ...extractionResult,
      entries: extractionResult.entries.map((e) => ({ ...e, selected: select })),
    });
  };

  // Counts for confirmation bar
  const validCount = extractionResult?.entries.filter((e) => e.selected && e.status === 'valid').length || 0;
  const duplicateCount = extractionResult?.entries.filter((e) => e.selected && e.status === 'duplicate').length || 0;
  const reviewCount = extractionResult?.entries.filter((e) => e.selected && (e.status === 'needs_review' || e.ocrUncertain)).length || 0;
  const aiTranslationCount = extractionResult?.entries.filter((e) => e.selected && e.aiTranslation).length || 0;
  const totalSelected = extractionResult?.entries.filter((e) => e.selected).length || 0;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="glass-card w-full max-w-6xl max-h-[92vh] flex flex-col !bg-gray-950/95 border-white/10 shadow-2xl overflow-hidden rounded-3xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">
                Smart Vocabulary Import
              </h2>
              <p className="text-xs font-semibold text-gray-400">
                Matn, rasm (OCR), PDF yoki DOCX dan avtomatik lug'at ajratish
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!extractionResult ? (
            <>
              {/* Source Mode Tabs */}
              <div className="flex flex-wrap gap-2 bg-gray-900/80 p-1.5 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => { setActiveTab('text'); setSelectedFile(null); }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'text'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4" /> 📋 Matn Joylash
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('image'); setInputText(''); }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'image'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" /> 🖼️ Rasm / Skrinshot
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('pdf'); setInputText(''); }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'pdf'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileCode className="w-4 h-4" /> 📄 PDF Hujjat
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('docx'); setInputText(''); }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'docx'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" /> 📝 DOCX Hujjat
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('smart'); setSelectedFile(null); }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'smart'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> ✨ Smart Extract (AI)
                </button>
              </div>

              {/* Input Area */}
              {activeTab === 'text' || activeTab === 'smart' ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {activeTab === 'smart'
                      ? "Lug'at so'zlari bor bo'lgan har qanday matnni joylang:"
                      : "Lug'at ro'yxatini joylang (har xil formatlar qo'llab-quvvatlanadi):"}
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={10}
                    className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-5 text-white font-mono text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                    placeholder={
                      activeTab === 'smart'
                        ? "Masalan: Today we learned about railway transport. A tailor works hard to fix clothing..."
                        : "brackets — qavs\nrailway – temir yo'l\n1. thunder\n[ˈθʌndə]\nmomaqaldiroq\ne.g. Thunder roared."
                    }
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/10 hover:border-indigo-500/50 rounded-3xl p-10 text-center bg-gray-900/40 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept={
                      activeTab === 'image'
                        ? 'image/jpeg,image/png,image/webp'
                        : activeTab === 'pdf'
                        ? 'application/pdf'
                        : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    }
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />

                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {selectedFile ? selectedFile.name : 'Faylni tanlash uchun bosing'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activeTab === 'image' && 'JPG, PNG, WEBP (maks. 10MB)'}
                        {activeTab === 'pdf' && 'PDF hujjat (maks. 20MB)'}
                        {activeTab === 'docx' && 'DOCX Word hujjat (maks. 10MB)'}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Options */}
              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suggestEmojis}
                    onChange={(e) => setSuggestEmojis(e.target.checked)}
                    className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
                  />
                  <span>Avtomatik emoji taklif qilish</span>
                </label>
              </div>

              {/* Submit / Analyze button */}
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fayl tahlil qilinmoqda...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Tahlil Qilish
                  </>
                )}
              </button>
            </>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    📥 Import Ko'rib Chiqish
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Manba: <strong className="text-white">{extractionResult.source}</strong> |{' '}
                    Jami topildi: <strong className="text-indigo-400">{extractionResult.entries.length}</strong> ta
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-xl transition-colors"
                >
                  Qayta yuklash
                </button>
              </div>

              {/* Warnings List */}
              {extractionResult.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-400 text-xs space-y-1">
                  <strong className="block font-bold mb-1">Diqqat qilingan eslatmalar:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {extractionResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <PreviewTable
                entries={extractionResult.entries}
                onUpdateEntry={handleUpdateEntry}
                onToggleSelectAll={handleToggleSelectAll}
                onGenerateMissingTranslations={handleGenerateMissingTranslations}
                generatingTranslations={generatingTranslations}
              />
            </div>
          )}
        </div>

        {/* Footer Confirmation Bar */}
        {extractionResult && (
          <ConfirmBar
            validCount={validCount}
            duplicateCount={duplicateCount}
            reviewCount={reviewCount}
            aiTranslationCount={aiTranslationCount}
            totalSelected={totalSelected}
            saving={saving}
            onSave={handleSave}
            onCancel={handleReset}
          />
        )}
      </div>
    </div>
  );
}
