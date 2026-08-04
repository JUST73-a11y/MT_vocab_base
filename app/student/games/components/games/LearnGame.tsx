import React, { useState, useEffect } from 'react';
import { GameProps } from './types';
import { Volume2, CheckCircle } from 'lucide-react';

export default function LearnGame({ word, onCorrect, speak }: GameProps) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let timer: any;
    if (!revealed) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setRevealed(true);
            speak(word.englishWord);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [revealed, word, speak]);

  const handleKnowIt = () => {
    if (!revealed) {
      setRevealed(true);
      speak(word.englishWord);
    } else {
      onCorrect(); // Proceed to next word
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-2 mb-2">
        {!revealed ? (
          <div className="flex items-center gap-2 text-xs font-bold text-white/50">
            <span>Inglizchasi <span className="text-amber-400 font-mono">{timeLeft}s</span> dan keyin ko'rsatiladi</span>
          </div>
        ) : (
          <div className="h-4"></div> // Spacer
        )}
      </div>

      <div className="w-full max-w-sm bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center border border-white/10 shadow-xl backdrop-blur-md relative min-h-[220px]">
        {/* Uzbek (Always shown first) */}
        <div className="text-xs font-bold text-amber-500/70 uppercase tracking-widest mb-3">O'zbekcha</div>
        <div className="text-3xl font-black text-amber-400 text-center">{word.uzbekTranslation}</div>

        {/* English (Revealed later) */}
        <div className={`mt-8 flex flex-col items-center transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="text-xs font-bold text-emerald-500/70 uppercase tracking-widest mb-2">Inglizcha</div>
          <div className="text-4xl font-black text-white text-center">{word.englishWord}</div>
          {word.phonetic && <div className="text-lg text-white/50 mt-1">{word.phonetic}</div>}
          
          <button 
            onClick={() => speak(word.englishWord)}
            className="mt-4 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors flex items-center justify-center shadow-md"
            title="Qayta eshitish"
          >
            <Volume2 className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-sm mt-4">
        <button 
          onClick={handleKnowIt}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-gray-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          {revealed ? "Keyingisi" : "Bildim (O'tkazish)"}
        </button>
      </div>
    </div>
  );
}
