import React, { useState, useEffect } from 'react';
import { GameProps } from './types';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

export default function MatchGame({ word, allWords, onCorrect, onWrong, speak, onMatchPair }: GameProps) {
  const [enList, setEnList] = useState<{id: string, text: string}[]>([]);
  const [uzList, setUzList] = useState<{id: string, text: string}[]>([]);
  
  const [selectedEn, setSelectedEn] = useState<string | null>(null);
  const [selectedUz, setSelectedUz] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Use all words provided (sessionWords)
    const pool = allWords;
    
    setEnList(shuffle(pool.map(w => ({ id: w._id || w.id || w.englishWord, text: w.englishWord }))));
    setUzList(shuffle(pool.map(w => ({ id: w._id || w.id || w.englishWord, text: w.uzbekTranslation }))));
    setMatchedIds(new Set());
    setSelectedEn(null);
    setSelectedUz(null);
    setErrorIds(new Set());
  }, [allWords]);

  useEffect(() => {
    if (selectedEn && selectedUz) {
      if (selectedEn === selectedUz) {
        // Match!
        speak(enList.find(e => e.id === selectedEn)?.text || '');
        setMatchedIds(prev => new Set([...prev, selectedEn]));
        if (onMatchPair) onMatchPair();
        setSelectedEn(null);
        setSelectedUz(null);
        
        // If all matched, advance
        if (matchedIds.size + 1 === enList.length) {
          setTimeout(() => onCorrect(), 500);
        }
      } else {
        // Wrong
        setErrorIds(new Set([selectedEn, selectedUz]));
        onWrong(); // Optional: record error for combo breaking
        setTimeout(() => {
          setSelectedEn(null);
          setSelectedUz(null);
          setErrorIds(new Set());
        }, 800);
      }
    }
  }, [selectedEn, selectedUz]);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">
        Juftliklarni toping
      </div>
      
      <div className="w-full max-w-2xl grid grid-cols-2 gap-4 md:gap-8 max-h-[65vh] overflow-y-auto pr-2 pb-4">
        {/* English Column */}
        <div className="flex flex-col gap-3">
          {enList.map(item => {
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedEn === item.id;
            const isError = errorIds.has(item.id);
            
            return (
              <button
                key={`en-${item.id}`}
                disabled={isMatched || selectedEn !== null}
                onClick={() => setSelectedEn(item.id)}
                className={`w-full p-4 rounded-2xl border text-center font-bold text-sm md:text-base transition-all duration-200 backdrop-blur-md ${
                  isMatched ? 'opacity-0 pointer-events-none translate-x-4' : 
                  isSelected ? 'bg-amber-500 text-gray-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-[1.02]' :
                  isError ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-[shake_0.4s_ease-in-out]' :
                  'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-amber-500/40 active:scale-[0.98]'
                }`}
              >
                {item.text}
              </button>
            )
          })}
        </div>

        {/* Uzbek Column */}
        <div className="flex flex-col gap-3">
          {uzList.map(item => {
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedUz === item.id;
            const isError = errorIds.has(item.id);
            
            return (
              <button
                key={`uz-${item.id}`}
                disabled={isMatched || selectedUz !== null}
                onClick={() => setSelectedUz(item.id)}
                className={`w-full p-4 rounded-2xl border text-center font-bold text-sm md:text-base transition-all duration-200 backdrop-blur-md ${
                  isMatched ? 'opacity-0 pointer-events-none -translate-x-4' : 
                  isSelected ? 'bg-amber-500 text-gray-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-[1.02]' :
                  isError ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-[shake_0.4s_ease-in-out]' :
                  'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-amber-500/40 active:scale-[0.98]'
                }`}
              >
                {item.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}
