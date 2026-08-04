import React, { useState, useEffect } from 'react';
import { GameProps } from './types';

export default function SpellingGame({ word, onCorrect, onWrong, speak, isCorrect }: GameProps) {
  const [inputValue, setInputValue] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    setInputValue('');
    setHasSubmitted(false);
    setTimeout(() => speak(word.englishWord), 300);
  }, [word, speak]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSubmitted || !inputValue.trim()) return;
    setHasSubmitted(true);

    if (inputValue.trim().toLowerCase() === word.englishWord.toLowerCase()) {
      onCorrect();
    } else {
      onWrong();
      setTimeout(() => setHasSubmitted(false), 1200);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className={`w-full bg-white/5 rounded-3xl p-8 text-center border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${isCorrect === true ? 'animate-[pulseGlow_1s_ease-in-out] border-emerald-500/50' : isCorrect === false ? 'animate-[shake_0.4s_ease-in-out] border-red-500/50' : 'border-white/10'}`}>
        <div className="flex flex-col items-center gap-4 py-2">
          <button 
            onClick={() => speak(word.englishWord)} 
            className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/20 hover:scale-110 active:scale-95 transition-transform"
          >
            🔊
          </button>
          <div className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">
            Tinglang va yozing
          </div>
          <div className="text-xl font-bold text-white/50">
            ({word.uzbekTranslation})
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col gap-4">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={hasSubmitted}
          placeholder="Inglizcha yozing..."
          autoFocus
          className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-center text-xl font-bold text-white placeholder-white/20 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
        />
        <button 
          type="submit"
          disabled={hasSubmitted || !inputValue.trim()}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          Tekshirish
        </button>
      </form>
    </div>
  );
}
