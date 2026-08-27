'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Smile, X, Check } from 'lucide-react';

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string | undefined, isTeacherSelected: boolean) => void;
}

const COMMON_EMOJIS = [
  '⚡', '🌩️', '☀️', '🌙', '🌊', '🌲', '🍎', '🍕', '☕', '🚆',
  '🚗', '✈️', '⛵', '🧵', '🪡', '🔍', '💰', '📚', '🖊️', '🏠',
  '🏫', '🏥', '⚽', '🎨', '🎵', '❤️', '💡', '❓', '⚠️', '✨'
];

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputVal(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (emoji: string) => {
    onChange(emoji, true);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(undefined, false);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-white/10 rounded-lg hover:border-indigo-500/50 text-sm transition-colors"
        title="Emoji biriktirish"
      >
        {value ? (
          <span className="text-base">{value}</span>
        ) : (
          <Smile className="w-4 h-4 text-gray-500 hover:text-gray-300" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 w-64 bg-gray-900 border border-gray-800 rounded-2xl p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emoji tanlang</span>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> O'chirish
              </button>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto p-1 custom-scrollbar">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-white/10 transition-transform active:scale-95 ${value === emoji ? 'bg-indigo-500/20 border border-indigo-500' : ''}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 flex gap-2">
            <input
              type="text"
              placeholder="E.g. 🚀"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
              maxLength={4}
            />
            <button
              type="button"
              onClick={() => {
                if (inputVal.trim()) handleSelect(inputVal.trim());
              }}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shrink-0"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
