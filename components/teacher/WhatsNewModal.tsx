'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, FileText, Smile, Gamepad2, Clock, CheckCircle2, X } from 'lucide-react';

const CURRENT_UPDATE_KEY = 'teacher_seen_update_v2.1';

export default function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem(CURRENT_UPDATE_KEY);
      if (!hasSeen) {
        setIsOpen(true);
      }
    } catch {
      /* fallback if localStorage is blocked */
    }
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem(CURRENT_UPDATE_KEY, 'true');
    } catch {/* empty */}
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-xl bg-gray-950/95 border border-indigo-500/30 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col relative">
        {/* Top Decorative Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm" />

        {/* Header */}
        <div className="px-6 sm:px-8 pt-8 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                Yangi Imkoniyatlar v2.1
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Platformada Nima Yangiliklar?
              </h2>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature List Body */}
        <div className="px-6 sm:px-8 py-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Feature 1 */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4 transition-all hover:bg-white/[0.05]">
            <div className="p-3 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-white mb-0.5">
                ✨ Smart Import 2.0 (AI / Fayl Tahlili)
              </h4>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                PDF, Word (DOCX), Rasm OCR va istalgan matnlarni Gemini AI yordamida bir necha soniyada lug'at qilib avtomatik yuklash.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4 transition-all hover:bg-white/[0.05]">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-white mb-0.5">
                🦎 Aqlli Emojilar Tizimi
              </h4>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                So'z va tarjimalarga mos keluvchi emojilar avtomatik ravishda tanlanadi va darsda ulkan (9XL) shaklda namoyish etiladi.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4 transition-all hover:bg-white/[0.05]">
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-white mb-0.5">
                🎮 Live Lug'at O'yini & Yirik Shriftlar
              </h4>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                Guruhlar bilan jonli so'rovlar o'tkazishda so'zlar va tarjimalar ultra-yirik formatda va moslashuvchan hajmda ko'rinadi.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-4 transition-all hover:bg-white/[0.05]">
            <div className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-white mb-0.5">
                ⏱️ Ultra-Yorqin Taymer Tizimi
              </h4>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                Taymer birinchi soniyadanoq Indigo rangida yorqin ko'rinadi va vaqt kamayishi bilan ranglari dinamik ravishda o'zgaradi.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-end">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" /> Tushunarli, Boshlash!
          </button>
        </div>
      </div>
    </div>
  );
}
