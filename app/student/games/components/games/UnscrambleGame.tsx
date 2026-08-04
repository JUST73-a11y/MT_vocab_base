import React, { useState, useEffect } from 'react';
import { GameProps } from './types';
import { RefreshCcw } from 'lucide-react';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

export default function UnscrambleGame({ word, onCorrect, onWrong, isCorrect }: GameProps) {
  const [jumbledLetters, setJumbledLetters] = useState<{char: string, id: number}[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<{char: string, id: number}[]>([]);

  useEffect(() => {
    reset();
  }, [word]);

  const reset = () => {
    const chars = word.englishWord.split('');
    // Ensure it's actually shuffled
    let shuffled = shuffle(chars.map((char, id) => ({char, id})));
    while (shuffled.map(c => c.char).join('') === word.englishWord && word.englishWord.length > 1) {
      shuffled = shuffle(chars.map((char, id) => ({char, id})));
    }
    setJumbledLetters(shuffled);
    setSelectedLetters([]);
  };

  const handleSelect = (item: {char: string, id: number}) => {
    setJumbledLetters(prev => prev.filter(p => p.id !== item.id));
    const newSelected = [...selectedLetters, item];
    setSelectedLetters(newSelected);

    if (newSelected.length === word.englishWord.length) {
      if (newSelected.map(s => s.char).join('') === word.englishWord) {
        onCorrect();
      } else {
        onWrong();
        setTimeout(reset, 1000);
      }
    }
  };

  const handleDeselect = (item: {char: string, id: number}) => {
    setSelectedLetters(prev => prev.filter(p => p.id !== item.id));
    setJumbledLetters(prev => [...prev, item]);
  };

  return (
    <div className="w-full flex flex-col items-center gap-8">
      <div className={`w-full bg-white/5 rounded-3xl p-8 text-center border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${isCorrect === true ? 'animate-[pulseGlow_1s_ease-in-out] border-emerald-500/50' : isCorrect === false ? 'animate-[shake_0.4s_ease-in-out] border-red-500/50' : 'border-white/10'}`}>
        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
          So'zni to'g'ri taxlang
        </div>
        <div className="text-3xl font-black text-amber-400 mb-2">
          {word.uzbekTranslation}
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Drop zone */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 min-h-[60px] p-4 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          {selectedLetters.map((item) => (
            <button
              key={`sel-${item.id}`}
              onClick={() => handleDeselect(item)}
              className="w-12 h-12 flex items-center justify-center bg-emerald-500 text-gray-950 text-2xl font-black rounded-xl shadow-lg shadow-emerald-500/20 transform hover:scale-110 active:scale-95 transition-all"
            >
              {item.char}
            </button>
          ))}
          {selectedLetters.length === 0 && (
            <span className="text-white/20 text-sm font-bold flex items-center h-12">Harflarni bu yerga terib chiqing</span>
          )}
        </div>

        {/* Source letters */}
        <div className="flex flex-wrap justify-center gap-2 mb-4 min-h-[60px]">
          {jumbledLetters.map((item) => (
            <button
              key={`src-${item.id}`}
              onClick={() => handleSelect(item)}
              className="w-12 h-12 flex items-center justify-center bg-white/10 border border-white/20 text-white text-2xl font-black rounded-xl shadow-md transform hover:-translate-y-1 hover:border-amber-500 active:scale-95 transition-all"
            >
              {item.char}
            </button>
          ))}
        </div>

        <button 
          onClick={reset}
          className="mx-auto flex items-center gap-2 px-4 py-2 text-white/40 hover:text-white/80 transition-colors text-sm font-bold"
        >
          <RefreshCcw className="w-4 h-4" />
          <span>Boshidan</span>
        </button>
      </div>
    </div>
  );
}
