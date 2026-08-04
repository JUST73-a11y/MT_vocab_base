import React, { useState, useEffect } from 'react';
import { GameProps } from './types';

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Card = {
  id: string; // unique per card
  matchId: string; // connects en and uz
  text: string;
  lang: 'en' | 'uz';
};

export default function MemoryGame({ allWords, onCorrect, onWrong, speak, onMatchPair, onBonusTime, onSetTimeLeft }: GameProps) {
  const CHUNK_SIZE = 6;
  const [chunkIndex, setChunkIndex] = useState(0);
  
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [matchedMatchIds, setMatchedMatchIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  
  const [firstFlipped, setFirstFlipped] = useState<Card | null>(null);
  const [phase, setPhase] = useState<'memorize' | 'play' | 'interstitial' | 'result'>('memorize');
  const [memorizeTime, setMemorizeTime] = useState(10);
  
  // Stats
  const [mistakes, setMistakes] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [bonusSeconds, setBonusSeconds] = useState(0);
  const [totalMatched, setTotalMatched] = useState(0);

  useEffect(() => {
    // Generate cards for the current chunk
    const chunk = allWords.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
    if (chunk.length === 0) return;
    
    const newCards: Card[] = [];
    chunk.forEach((w, i) => {
      const matchId = w._id || w.id || w.englishWord;
      newCards.push({ id: `en-${i}-${chunkIndex}`, matchId, text: w.englishWord, lang: 'en' });
      newCards.push({ id: `uz-${i}-${chunkIndex}`, matchId, text: w.uzbekTranslation, lang: 'uz' });
    });
    
    setCards(shuffle(newCards));
    setFlippedIds(new Set());
    setMatchedMatchIds(new Set());
    setErrorIds(new Set());
    setFirstFlipped(null);
    setPhase('memorize');
    setMemorizeTime(10);
    if (onSetTimeLeft) onSetTimeLeft(30); // 10s memorize + 20s play
  }, [chunkIndex, allWords]);

  useEffect(() => {
    let timer: any;
    if (phase === 'memorize') {
      timer = setInterval(() => {
        setMemorizeTime(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPhase('play');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase]);

  const handleCardClick = (card: Card) => {
    if (phase !== 'play') return;
    if (flippedIds.has(card.id) || matchedMatchIds.has(card.matchId) || errorIds.size > 0) return;

    if (!firstFlipped) {
      setFirstFlipped(card);
      setFlippedIds(prev => new Set([...prev, card.id]));
      if (card.lang === 'en') speak(card.text);
    } else {
      if (firstFlipped.id === card.id) return;
      
      setFlippedIds(prev => new Set([...prev, card.id]));
      if (card.lang === 'en') speak(card.text);

      if (firstFlipped.matchId === card.matchId) {
        // Match
        const newMatched = new Set([...matchedMatchIds, card.matchId]);
        setMatchedMatchIds(newMatched);
        setFirstFlipped(null);
        
        setTotalMatched(t => t + 1);
        
        // Bonus timer logic
        if (onMatchPair) onMatchPair(); // gives +2s
        setBonusSeconds(b => b + 2);
        
        const newCombo = comboCount + 1;
        setComboCount(newCombo);
        if (newCombo % 5 === 0) {
          if (onBonusTime) onBonusTime(5);
          setBonusSeconds(b => b + 5);
        }
        
        // Check if chunk is complete
        const chunk = allWords.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE);
        if (newMatched.size === chunk.length) {
          setTimeout(() => {
            if ((chunkIndex + 1) * CHUNK_SIZE < allWords.length) {
              setPhase('interstitial');
            } else {
              setPhase('result');
            }
          }, 600);
        }
      } else {
        // Wrong
        onWrong(); // Optional: NativeQuiz might handle wrong audio/visual, but we handle combo locally
        setComboCount(0);
        setMistakes(m => m + 1);
        
        const errs = new Set([firstFlipped.id, card.id]);
        setErrorIds(errs);
        setTimeout(() => {
          setFlippedIds(prev => {
            const next = new Set(prev);
            next.delete(firstFlipped.id);
            next.delete(card.id);
            return next;
          });
          setErrorIds(new Set());
          setFirstFlipped(null);
        }, 1000);
      }
    }
  };

  const totalMatchesAvailable = Math.ceil(allWords.length / CHUNK_SIZE);
  const currentChunkLength = allWords.slice(chunkIndex * CHUNK_SIZE, (chunkIndex + 1) * CHUNK_SIZE).length;

  if (phase === 'interstitial') {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-amber-500/40 text-center shadow-2xl relative backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-black text-amber-400 mb-2">{chunkIndex + 1}-match tugadi</h2>
        <p className="text-white/70 text-base mb-6">Siz bu matchda <span className="text-emerald-400 font-bold">{currentChunkLength}</span> ta juftlik topdingiz.</p>
        <p className="text-white/50 text-sm mb-6">{chunkIndex + 2}-matchni boshlashga tayyormisiz?</p>
        <button 
          onClick={() => setChunkIndex(idx => idx + 1)} 
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Davom etish
        </button>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-amber-500/40 text-center shadow-2xl relative backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        <div className="text-6xl mb-4 animate-[floatUp_2s_infinite_alternate_ease-in-out]">🏆</div>
        <h2 className="text-3xl font-black text-amber-400 mb-2">O'yin tugadi!</h2>
        <p className="text-white/70 text-base mb-6"><span className="text-white font-bold">{allWords.length}</span> ta so'z mustahkamlandi.</p>
        
        <div className="w-full flex flex-col gap-3 mb-8">
          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/60 font-bold text-sm">To'g'ri topilganlar:</span>
            <span className="text-emerald-400 font-black">{totalMatched}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-white/60 font-bold text-sm">Xatolar soni:</span>
            <span className="text-red-400 font-black">{mistakes}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-amber-500/80 font-bold text-sm">Jami bonus vaqt:</span>
            <span className="text-amber-400 font-black">+{bonusSeconds}s</span>
          </div>
        </div>

        <button 
          onClick={onCorrect} 
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Tugatish
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-2 mb-2 w-full max-w-4xl">
        <div className="flex items-center justify-between w-full">
          <div className="text-white/40 text-xs font-bold uppercase tracking-widest flex flex-col md:flex-row md:items-center gap-2">
            <span>🧠 Xotira Kartalar</span>
            <span className="hidden md:inline text-white/20">•</span>
            <span className="text-amber-400/80">Match {chunkIndex + 1}/{totalMatchesAvailable}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {comboCount >= 3 && (
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-xs shadow-lg animate-pulse">
                {comboCount} COMBO! 🔥
              </div>
            )}
            <div className="flex items-center gap-2 text-white/60 text-sm font-bold bg-white/5 px-3 py-1 rounded-xl border border-white/10">
              <span className="text-amber-400">⭐</span> {matchedMatchIds.size}/{currentChunkLength}
            </div>
          </div>
        </div>
        
        {phase === 'memorize' && (
          <div className="mt-4 px-6 py-2 rounded-full bg-amber-500 text-gray-950 font-black text-sm shadow-lg shadow-amber-500/20 animate-pulse">
            Eslab qoling: {memorizeTime}s
          </div>
        )}
      </div>
      
      <div className="w-full max-w-4xl grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto p-2 perspective-1000">
        <style dangerouslySetInnerHTML={{ __html: `
          .perspective-1000 { perspective: 1000px; }
          .transform-style-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; }
        `}} />

        {cards.map(card => {
          // In memorize phase, all cards are flipped (open)
          const isFlipped = phase === 'memorize' || flippedIds.has(card.id) || matchedMatchIds.has(card.matchId);
          const isMatched = matchedMatchIds.has(card.matchId);
          const isError = errorIds.has(card.id);

          return (
            <div 
              key={card.id}
              className={`relative w-full h-24 md:h-32 cursor-pointer transition-transform duration-500 transform-style-3d ${isError ? 'animate-[shake_0.4s_ease-in-out]' : ''} ${isMatched ? 'scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10' : ''}`}
              style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)' }}
              onClick={() => handleCardClick(card)}
            >
              {/* Back of Card (Cover) */}
              <div className="absolute w-full h-full backface-hidden bg-gray-800/80 rounded-2xl border-2 border-white/10 flex items-center justify-center hover:bg-gray-700/80 transition-colors shadow-lg">
                <span className="text-3xl opacity-20">🧠</span>
              </div>
              
              {/* Front of Card (Text) */}
              <div 
                className={`absolute w-full h-full backface-hidden rounded-2xl border-2 flex items-center justify-center p-2 text-center font-bold text-[10px] md:text-sm shadow-xl flex-col gap-1 ${
                  isError ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                  isMatched ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                  'bg-amber-500 border-amber-400 text-gray-950'
                }`}
                style={{ transform: 'rotateY(180deg)', wordBreak: 'break-word' }}
              >
                {card.text}
                {card.lang === 'en' && isFlipped && !isMatched && phase !== 'memorize' && (
                  <button onClick={(e) => { e.stopPropagation(); speak(card.text); }} className="text-xl mt-1 opacity-70 hover:opacity-100 hover:scale-125 transition-all" title="Eshitish">🔊</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
