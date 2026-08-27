'use client';

import React from 'react';
import { Save, Loader2, CheckCircle, AlertTriangle, Sparkles, Copy } from 'lucide-react';

interface ConfirmBarProps {
  validCount: number;
  duplicateCount: number;
  reviewCount: number;
  aiTranslationCount: number;
  totalSelected: number;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function ConfirmBar({
  validCount,
  duplicateCount,
  reviewCount,
  aiTranslationCount,
  totalSelected,
  saving,
  onSave,
  onCancel,
}: ConfirmBarProps) {
  return (
    <div className="sticky bottom-0 z-30 bg-gray-950/90 border-t border-white/10 backdrop-blur-xl p-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>{validCount} ta to'g'ri</span>
          </div>

          {duplicateCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Copy className="w-4 h-4" />
              <span>{duplicateCount} ta takroriy</span>
            </div>
          )}

          {reviewCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{reviewCount} ta ko'rib chiqish</span>
            </div>
          )}

          {aiTranslationCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span>{aiTranslationCount} ta AI tarjima</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-bold text-sm transition-colors flex-1 sm:flex-none"
          >
            Bekor qilish
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || totalSelected === 0}
            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 flex-1 sm:flex-none"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {totalSelected} ta so'zni saqlash
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
