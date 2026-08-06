'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Flame, ArrowRight, Loader2 } from 'lucide-react';
import { Word } from './games/types';

import LearnGame from './games/LearnGame';
import QuizGame from './games/QuizGame';
import UnscrambleGame from './games/UnscrambleGame';
import SpellingGame from './games/SpellingGame';
import MatchGame from './games/MatchGame';
import MemoryGame from './games/MemoryGame';
import PronounceGame from './games/PronounceGame';

import { ACTIVITIES } from '../page';

interface NativeQuizProps {
  unitId: string;
  currentStageIndex: number;
  allWords: any[];
  masteredWordIds: string[];
  initialSessionWordIds?: string[];
  onSessionStart: (wordIds: string[]) => void;
  onStageComplete: (nextStageIndex: number) => void;
  onSessionComplete: (wordIds: string[]) => void;
  onExit: () => void;
  onNextStage?: () => void;
}

const FLOAT_ANIMATION = `
  @keyframes floatUp {
    0% { opacity: 0; transform: translateY(20px) scale(0.5) rotate(-15deg); }
    20% { opacity: 1; transform: translateY(0) scale(1.2) rotate(10deg); }
    100% { opacity: 0; transform: translateY(-120px) scale(1) rotate(45deg); }
  }
`;
const SHAKE_ANIMATION = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px) rotate(-1deg); }
    40%, 80% { transform: translateX(6px) rotate(1deg); }
  }
`;
const PULSE_GLOW_ANIMATION = `
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
    70% { box-shadow: 0 0 0 24px rgba(16,185,129,0); }
    100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
  }
`;

export default function NativeQuiz({
  unitId,
  currentStageIndex,
  allWords,
  masteredWordIds,
  initialSessionWordIds = [],
  onSessionStart,
  onStageComplete,
  onSessionComplete,
  onExit,
  onNextStage
}: NativeQuizProps) {
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [combo, setCombo] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);

  const [step, setStep] = useState<'intro' | 'playing' | 'result'>('intro');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const emojisContainerRef = useRef<HTMLDivElement>(null);

  const getWordId = (w: Word) => (w._id || w.id || '').toString();

  const activityId = ACTIVITIES[currentStageIndex]?.id || 'uz2en';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {}
    }
  }, []);

  const playTone = (freq: number, dur: number, type: OscillatorType, gain: number) => {
    if (!soundEnabled) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = ctx.currentTime;
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {}
  };

  const playSuccess = () => {
    playTone(880, 0.12, 'sine', 0.18);
    setTimeout(() => playTone(1180, 0.14, 'sine', 0.16), 90);
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
  };

  const playWrong = () => {
    playTone(220, 0.22, 'sawtooth', 0.12);
    if (navigator.vibrate) try { navigator.vibrate([25, 40, 25]); } catch (e) {}
  };

  const playWin = () => {
    [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => playTone(f, 0.16, 'sine', 0.16), i * 95));
  };

  const spawnEmojis = (isWrong: boolean) => {
    if (!emojisContainerRef.current) return;
    const n = isWrong ? 5 : 8;
    const emojis = isWrong 
      ? ['😔','😕','😢','🙁','🤔','😅','💭','❌']
      : ['🎉','🥳','✨','⭐','🔥','👏','💯','🏆','🚀','🎯','🎊'];

    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.position = 'absolute';
      el.style.fontSize = '32px';
      el.style.left = '50%';
      el.style.top = '50%';
      el.style.transform = 'translate(-50%, -50%)';
      el.style.zIndex = '100';
      el.style.pointerEvents = 'none';
      el.style.animation = `floatUp 1.8s cubic-bezier(0.2,1,0.3,1) forwards`;
      el.style.animationDelay = `${Math.random() * 0.2}s`;
      el.style.marginLeft = `${Math.random() * 120 - 60}px`;
      el.style.marginTop = `${Math.random() * 60 - 30}px`;
      emojisContainerRef.current.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  };

  const speak = useCallback((text: string) => {
    if (!soundEnabled) return;
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.92;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }, [soundEnabled]);

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  useEffect(() => {
    const formattedWords: Word[] = allWords.map(w => ({
      _id: w._id || w.id,
      englishWord: w.englishWord || w.en || '',
      uzbekTranslation: w.uzbekTranslation || w.uz || '',
      exampleSentence: w.exampleSentence,
      audioUrl: w.audioUrl,
      phonetic: w.phonetic
    }));

    if (formattedWords.length === 0) return;

    if (initialSessionWordIds && initialSessionWordIds.length > 0) {
      const sessionMap = new Map(formattedWords.map(w => [getWordId(w), w]));
      const selected = initialSessionWordIds.map(id => sessionMap.get(id)).filter(Boolean) as Word[];
      if (selected.length > 0) {
        setSessionWords(selected);
        setCurrentIndex(0);
        setStep('intro');
        setTimeLeft(activityId === 'match' ? 30 : (activityId === 'memory' ? 90 : 15));
        return;
      }
    }

    const masteredSet = new Set(masteredWordIds.map(id => id.toString()));
    const unmastered = formattedWords.filter(w => !masteredSet.has(getWordId(w)));
    
    const poolToUse = unmastered.length > 0 ? unmastered : formattedWords;
    
    if (poolToUse.length === 0) {
      setStep('result');
      return;
    }

    const selected = shuffle(poolToUse).slice(0, 15);
    setSessionWords(selected);
    setCurrentIndex(0);
    setStep('intro');
    setTimeLeft(activityId === 'match' ? 30 : (activityId === 'memory' ? 90 : 15));
  }, [
    unitId,
    currentStageIndex,
    allWords.length,
    (initialSessionWordIds || []).join(',')
  ]);

  useEffect(() => {
    let timer: any;
    if (step === 'playing' && isCorrect === null && activityId !== 'learn') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (activityId === 'match' || activityId === 'memory') {
              finishStage();
            } else {
              handleWrong();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, isCorrect, activityId, currentIndex]);

  const startGame = () => {
    setStep('playing');
    setTimeLeft(activityId === 'match' ? 30 : (activityId === 'memory' ? 90 : 15));
    if (currentStageIndex === 0 && (!initialSessionWordIds || initialSessionWordIds.length === 0)) {
      onSessionStart(sessionWords.map(w => getWordId(w)));
    }
  };

  const [levelMistakes, setLevelMistakes] = useState(0);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const restartCurrentLevel = () => {
    setLevelMistakes(0);
    setCurrentIndex(0);
    setIsCorrect(null);
    setShowFailedModal(false);
    setStep('playing');
    setTimeLeft(activityId === 'match' ? 30 : (activityId === 'memory' ? 90 : 15));
  };

  const handleCorrect = () => {
    if (isCorrect !== null || showFailedModal) return;
    setIsCorrect(true);
    playSuccess();
    spawnEmojis(false);
    setCombo(c => c + 1);
    setCorrectCount(c => c + 1);
    setTotalAttempts(t => t + 1);
    
    const nextIdx = currentIndex + 1;

    setTimeout(() => {
      setIsCorrect(null);
      if (nextIdx < sessionWords.length) {
        setCurrentIndex(nextIdx);
        setTimeLeft(15);
      } else {
        finishStage();
      }
    }, 1200);
  };

  const handleWrong = () => {
    if (isCorrect !== null || showFailedModal) return;
    setIsCorrect(false);
    playWrong();
    spawnEmojis(true);
    setCombo(0);
    setTotalAttempts(t => t + 1);

    const newMistakes = levelMistakes + 1;
    setLevelMistakes(newMistakes);

    if (newMistakes >= 3) {
      setTimeout(() => {
        setIsCorrect(null);
        setShowFailedModal(true);
      }, 1000);
      return;
    }

    const nextIdx = currentIndex + 1;

    setTimeout(() => {
      setIsCorrect(null);
      if (nextIdx < sessionWords.length) {
        setCurrentIndex(nextIdx);
        setTimeLeft(15);
      } else {
        finishStage();
      }
    }, 1200);
  };

  const finishStage = () => {
    setLevelMistakes(0);
    setStep('result');
    playWin();
    spawnEmojis(false);
    
    if (currentStageIndex === ACTIVITIES.length - 1) {
      onSessionComplete(sessionWords.map(w => getWordId(w)));
    } else {
      onStageComplete(currentStageIndex + 1);
    }
  };

  if (sessionWords.length === 0 && step === 'result') {
    return (
      <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl backdrop-blur-2xl border border-amber-500/30 text-center animate-in fade-in zoom-in duration-300 my-auto shadow-2xl">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h2 className="text-2xl font-black text-amber-400 mb-2">Barcha so'zlar o'zlashtirildi!</h2>
        <button onClick={onExit} className="mt-6 px-8 py-3.5 bg-amber-500 text-gray-950 font-black rounded-2xl transition-all shadow-lg">Orqaga qaytish</button>
      </div>
    );
  }

  if (sessionWords.length === 0 && step !== 'result') {
    return (
      <div className="w-full min-h-[350px] flex flex-col items-center justify-center gap-3 text-center my-auto animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin">
          <Loader2 className="w-6 h-6" />
        </div>
        <p className="text-white/60 text-sm font-bold animate-pulse">Mashq tayyorlanmoqda...</p>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
        <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 text-center relative">
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 transition-all border border-white/10">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 text-red-400" />}
            </button>
          </div>
          <div className="text-7xl mb-6 transform hover:scale-110 transition-transform drop-shadow-2xl">{ACTIVITIES[currentStageIndex]?.ic || '🎮'}</div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">Tayyormisiz?</h2>
          <p className="text-white/60 text-sm md:text-base mb-8 max-w-xs">{sessionWords.length} ta saralangan so'zlar bo'yicha {ACTIVITIES[currentStageIndex]?.label} bosqichini boshlaymiz.</p>
          <button onClick={startGame} className="w-full py-4.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-gray-950 font-black text-xl rounded-2xl shadow-2xl shadow-amber-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-3">
            <span>Boshlash</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'playing' && sessionWords[currentIndex]) {
    const w = sessionWords[currentIndex];
    
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-xl mx-auto flex flex-col relative" ref={emojisContainerRef}>
          <style dangerouslySetInnerHTML={{ __html: SHAKE_ANIMATION + FLOAT_ANIMATION + PULSE_GLOW_ANIMATION }} />
        
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1.5">
            {combo >= 2 && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-xs shadow-lg animate-pulse">
                <Flame className="w-4 h-4 fill-current text-yellow-300" /> <span>COMBO x{combo}!</span>
              </div>
            )}
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-xl bg-white/5 text-white/70">
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300" style={{ width: (activityId === 'match' || activityId === 'memory') ? '100%' : `${((currentIndex) / sessionWords.length) * 100}%` }} />
            </div>
            <div className="text-xs font-black text-amber-400 w-10 text-right">
              {(activityId === 'match' || activityId === 'memory') ? '1 / 1' : `${currentIndex + 1} / ${sessionWords.length}`}
            </div>
          </div>
          
          {activityId !== 'learn' && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-white/10 border border-white/20">⏱</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-amber-500/60'}`} style={{ width: `${(timeLeft / (activityId === 'match' ? 30 : (activityId === 'memory' ? 90 : 15))) * 100}%` }} />
              </div>
              <span className={`w-6 text-right ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>{timeLeft}s</span>
            </div>
          )}
        </div>

        <div className="w-full flex-1 flex flex-col justify-center animate-in fade-in zoom-in duration-300">
          {activityId === 'learn' && <LearnGame word={w} allWords={sessionWords} activityId={activityId} onCorrect={handleCorrect} onWrong={handleWrong} speak={speak} isCorrect={isCorrect} />}
          {['uz2en', 'en2uz', 'listening'].includes(activityId) && <QuizGame word={w} allWords={sessionWords} activityId={activityId} onCorrect={handleCorrect} onWrong={handleWrong} speak={speak} isCorrect={isCorrect} />}
          {activityId === 'unscramble' && <UnscrambleGame word={w} allWords={sessionWords} activityId={activityId} onCorrect={handleCorrect} onWrong={handleWrong} speak={speak} isCorrect={isCorrect} />}
          {activityId === 'spelling' && <SpellingGame word={w} allWords={sessionWords} activityId={activityId} onCorrect={handleCorrect} onWrong={handleWrong} speak={speak} isCorrect={isCorrect} />}
          {activityId === 'match' && <MatchGame word={w} allWords={sessionWords} activityId={activityId} 
            onCorrect={() => {
              playSuccess();
              finishStage();
            }} 
            onWrong={() => {}} 
            speak={speak} 
            isCorrect={isCorrect} 
            onMatchPair={() => setTimeLeft(t => t + 2)}
          />}
          {activityId === 'memory' && <MemoryGame word={w} allWords={sessionWords} activityId={activityId} 
            onCorrect={() => {
              playSuccess();
              finishStage();
              if (onNextStage) onNextStage(); else onExit();
            }} 
            onWrong={handleWrong} 
            speak={speak} 
            isCorrect={isCorrect} 
            onMatchPair={() => setTimeLeft(t => t + 2)}
            onBonusTime={(sec) => setTimeLeft(t => t + sec)}
            onSetTimeLeft={setTimeLeft}
          />}
          {activityId === 'pronounce' && <PronounceGame word={w} allWords={sessionWords} activityId={activityId} onCorrect={handleCorrect} onWrong={handleWrong} speak={speak} isCorrect={isCorrect} />}
        </div>

        {/* ── 3 Mistakes Failed Level Modal ── */}
        {showFailedModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
            <div className="glass-card max-w-md w-full p-8 text-center flex flex-col items-center gap-5 border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.3)] my-auto">
              <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center animate-bounce">
                <span className="text-4xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">3 ta xatolik yetdi!</h3>
                <p className="text-sm text-red-400 font-bold mt-1">Ushbu bosqich yakunlanmadi</p>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                O'quv bo'limida bir bosqichda 3 ta yoki undan ko'p xato qilinsa, o'sha mashqni qaytadan topshirishingiz kerak.
              </p>
              <button
                onClick={restartCurrentLevel}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                🔄 Qaytadan topshirish
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  if (step === 'result') {
    const isFinal = currentStageIndex === ACTIVITIES.length - 1;
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center relative min-h-[60vh] max-w-2xl mx-auto z-10 px-4">
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-amber-500/40 text-center shadow-2xl relative backdrop-blur-xl" ref={emojisContainerRef}>
          <style dangerouslySetInnerHTML={{ __html: FLOAT_ANIMATION }} />
          <div className="text-6xl mb-4 animate-[floatUp_2s_infinite_alternate_ease-in-out]">🎉</div>
          <h2 className="text-3xl font-black text-amber-400 mb-2">Bosqich Yakunlandi!</h2>
          <p className="text-white/70 text-base mb-6">Siz <span className="text-white font-bold">{sessionWords.length}</span> ta so'zdan iborat {ACTIVITIES[currentStageIndex]?.label} bosqichini muvaffaqiyatli yakunladingiz.</p>
          <button 
            onClick={isFinal ? onExit : onNextStage} 
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isFinal ? "Sessiyani yakunlash" : "Menyuga qaytish"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
