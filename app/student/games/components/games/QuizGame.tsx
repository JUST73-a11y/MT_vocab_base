import React, { useState, useEffect } from 'react';
import { GameProps, Word } from './types';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

export default function QuizGame({ word, allWords, activityId, onCorrect, onWrong, speak, isCorrect }: GameProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (activityId === 'listening') {
      speak(word.englishWord);
    }
  }, [word, activityId, speak]);

  useEffect(() => {
    let correctValue = '';
    let fullPool: string[] = [];

    if (activityId === 'uz2en' || activityId === 'listening') {
      correctValue = word.englishWord;
      fullPool = Array.from(new Set(allWords.map(w => w.englishWord).filter(en => en !== correctValue && !!en)));
    } else {
      correctValue = word.uzbekTranslation;
      fullPool = Array.from(new Set(allWords.map(w => w.uzbekTranslation).filter(uz => uz !== correctValue && !!uz)));
    }

    const wrongOptions = shuffle(fullPool).slice(0, 3);
    while (wrongOptions.length < 3) {
      wrongOptions.push(`Variant ${wrongOptions.length + 1}`);
    }

    setOptions(shuffle([correctValue, ...wrongOptions]));
    setSelectedIdx(null);
  }, [word, allWords, activityId]);

  const handleSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);

    const correctValue = (activityId === 'uz2en' || activityId === 'listening') ? word.englishWord : word.uzbekTranslation;
    if (options[idx] === correctValue) {
      onCorrect();
    } else {
      onWrong();
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className={`bg-white/5 rounded-3xl p-8 text-center border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${isCorrect === true ? 'animate-[pulseGlow_1s_ease-in-out] border-emerald-500/50' : ''} ${isCorrect === false ? 'animate-[shake_0.4s_ease-in-out] border-red-500/50' : 'border-white/10'}`}>
        {activityId === 'listening' ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <button 
              onClick={() => speak(word.englishWord)} 
              className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/20 hover:scale-110 active:scale-95 transition-transform"
            >
              🔊
            </button>
            <div className="text-white/60 text-xs font-bold uppercase tracking-wider">Tinglang va to'g'ri javobni tanlang</div>
          </div>
        ) : (
          <>
            <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">
              {activityId === 'uz2en' ? "O'zbekcha so'z" : "Inglizcha so'z"}
            </div>
            <div className="text-3xl md:text-4xl font-black text-white drop-shadow-md tracking-tight">
              {activityId === 'uz2en' ? word.uzbekTranslation : word.englishWord}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {options.map((opt, i) => {
          const isSelected = selectedIdx === i;
          const correctValue = (activityId === 'uz2en' || activityId === 'listening') ? word.englishWord : word.uzbekTranslation;
          const isActuallyCorrect = opt === correctValue;

          let btnClasses = "w-full p-4 rounded-2xl border text-left font-bold text-base md:text-lg transition-all duration-200 backdrop-blur-md flex items-center justify-between ";

          if (selectedIdx !== null) {
            if (isSelected && isCorrect) {
              btnClasses += "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.01]";
            } else if (isSelected && !isCorrect) {
              btnClasses += "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
            } else if (isActuallyCorrect) {
              btnClasses += "bg-emerald-500/20 border-emerald-500 text-emerald-400";
            } else {
              btnClasses += "bg-white/5 border-white/5 text-white/30 opacity-40";
            }
          } else {
            btnClasses += "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-amber-500/40 hover:scale-[1.01] active:scale-[0.99]";
          }

          return (
            <button
              key={i}
              className={btnClasses}
              onClick={() => handleSelect(i)}
              disabled={selectedIdx !== null}
            >
              <span>{opt}</span>
              {isSelected && isCorrect && <span>✅</span>}
              {isSelected && !isCorrect && <span>❌</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
