'use client';

import React from 'react';
import { ExtractedEntry, confidenceLabel } from '@/lib/vocab/smartExtract';
import EmojiPicker from './EmojiPicker';
import { Check, AlertTriangle, Sparkles, Copy, XCircle, Wand2, Loader2 } from 'lucide-react';

interface PreviewTableProps {
  entries: ExtractedEntry[];
  onUpdateEntry: (id: string, updates: Partial<ExtractedEntry>) => void;
  onToggleSelectAll: (select: boolean) => void;
  onGenerateMissingTranslations: () => void;
  generatingTranslations: boolean;
}

export default function PreviewTable({
  entries,
  onUpdateEntry,
  onToggleSelectAll,
  onGenerateMissingTranslations,
  generatingTranslations,
}: PreviewTableProps) {
  const allSelected = entries.length > 0 && entries.every((e) => e.selected);
  const missingTranslationCount = entries.filter((e) => !e.uzbekTranslation.trim()).length;

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/60 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleSelectAll(!allSelected)}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
          >
            {allSelected ? 'Barchasini bekor qilish' : 'Barchasini tanlash'}
          </button>
          <span className="text-xs text-gray-400">
            Jami: <strong className="text-white">{entries.length}</strong> ta entry | Tanlangan: {' '}
            <strong className="text-emerald-400">{entries.filter((e) => e.selected).length}</strong> ta
          </span>
        </div>

        {missingTranslationCount > 0 && (
          <button
            type="button"
            onClick={onGenerateMissingTranslations}
            disabled={generatingTranslations}
            className="flex items-center gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {generatingTranslations ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 text-purple-200" />
            )}
            {missingTranslationCount} ta yetishmayotgan tarjimani AI bilan yaratish
          </button>
        )}
      </div>

      {/* Table container */}
      <div className="overflow-x-auto border border-white/10 rounded-2xl bg-gray-950/80 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-black text-gray-400 uppercase tracking-wider">
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleSelectAll(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
                />
              </th>
              <th className="p-4 w-12">Emoji</th>
              <th className="p-4">Inglizcha so'z / ibora</th>
              <th className="p-4">O'zbekcha tarjima</th>
              <th className="p-4">Fonetika / Misol</th>
              <th className="p-4 w-32">Holat</th>
              <th className="p-4 w-28">Manba</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 text-sm">
            {entries.map((entry, index) => {
              const confLabel = confidenceLabel(entry.confidence);

              return (
                <tr
                  key={entry.id}
                  className={`group transition-colors ${
                    !entry.selected
                      ? 'opacity-50 bg-gray-900/20'
                      : entry.status === 'duplicate'
                      ? 'bg-indigo-950/20'
                      : entry.status === 'needs_review' || entry.ocrUncertain
                      ? 'bg-amber-950/20'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={entry.selected}
                      onChange={(e) => onUpdateEntry(entry.id, { selected: e.target.checked })}
                      className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500/50"
                    />
                  </td>

                  {/* Emoji Picker */}
                  <td className="p-4">
                    <EmojiPicker
                      value={entry.emoji}
                      onChange={(emoji, isTeacher) =>
                        onUpdateEntry(entry.id, {
                          emoji,
                          emojiSource: isTeacher ? 'teacher_selected' : 'automatic',
                        })
                      }
                    />
                  </td>

                  {/* English Word */}
                  <td className="p-4 font-bold text-white">
                    <input
                      type="text"
                      value={entry.englishWord}
                      onChange={(e) =>
                        onUpdateEntry(entry.id, { englishWord: e.target.value })
                      }
                      className="w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-gray-900/80 px-2 py-1 rounded text-white font-bold focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Uzbek Translation */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={entry.uzbekTranslation}
                        onChange={(e) =>
                          onUpdateEntry(entry.id, {
                            uzbekTranslation: e.target.value,
                            aiTranslation: false, // Teacher edited it
                          })
                        }
                        placeholder="Tarjima kiritilmagan..."
                        className={`w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:bg-gray-900/80 px-2 py-1 rounded focus:outline-none transition-colors ${
                          !entry.uzbekTranslation
                            ? 'text-amber-400 placeholder:text-amber-500/50 italic font-semibold'
                            : 'text-indigo-300 font-medium'
                        }`}
                      />
                      {entry.aiTranslation && (
                        <span
                          className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          title="AI tomonidan yaratilgan tarjima"
                        >
                          ✨ AI
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Phonetic & Example */}
                  <td className="p-4 text-xs text-gray-400">
                    <div className="flex flex-col gap-1">
                      {entry.phonetic && (
                        <span className="text-indigo-400 font-mono">[{entry.phonetic}]</span>
                      )}
                      {entry.exampleSentence && (
                        <span className="italic text-gray-500 line-clamp-1">
                          "{entry.exampleSentence}"
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      {entry.status === 'duplicate' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                          <Copy className="w-3 h-3" /> Takroriy
                        </span>
                      )}
                      {entry.ocrUncertain && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> OCR noaniq
                        </span>
                      )}
                      {entry.status === 'valid' && !entry.ocrUncertain && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Tasdiqlangan
                        </span>
                      )}
                      {confLabel === 'low' && !entry.ocrUncertain && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                          <XCircle className="w-3 h-3" /> Tekshirish kerak
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Source Reference */}
                  <td className="p-4 text-xs font-mono text-gray-500">
                    {entry.sourceReference || entry.sourceType}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
