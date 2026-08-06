import React, { useState } from 'react';
import { GameProps } from './types';
import { Mic, MicOff, CheckCircle } from 'lucide-react';

export default function PronounceGame({ word, onCorrect, onWrong, speak, isCorrect }: GameProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [notSupported, setNotSupported] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  React.useEffect(() => {
    setIsListening(false);
    setTranscript('');
    setHasSubmitted(false);
  }, [word.id, word.englishWord]);

  const startListening = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setNotSupported(true);
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setTranscript(spoken);
        checkPronunciation(spoken);
      };
      recognition.onerror = () => {
        setIsListening(false);
        setNotSupported(true); // Fallback on error
      };
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (e) {
      setNotSupported(true);
    }
  };

  const checkPronunciation = (spoken: string) => {
    if (hasSubmitted) return;
    setHasSubmitted(true);
    
    // Simple sanitization
    const cleanedSpoken = spoken.toLowerCase().replace(/[.,!?]/g, '').trim();
    const cleanedTarget = word.englishWord.toLowerCase().replace(/[.,!?]/g, '').trim();

    if (cleanedSpoken.includes(cleanedTarget) || cleanedTarget.includes(cleanedSpoken)) {
      onCorrect();
    } else {
      onWrong();
      setTimeout(() => {
        setHasSubmitted(false);
        setTranscript('');
      }, 1500);
    }
  };

  const manualPass = () => {
    onCorrect();
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className={`w-full bg-white/5 rounded-3xl p-8 text-center border shadow-2xl backdrop-blur-2xl transition-all duration-300 ${isCorrect === true ? 'animate-[pulseGlow_1s_ease-in-out] border-emerald-500/50' : isCorrect === false ? 'animate-[shake_0.4s_ease-in-out] border-red-500/50' : 'border-white/10'}`}>
        <div className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">
          Talaffuz qiling
        </div>
        <div className="text-4xl font-black text-white mb-2">
          {word.englishWord}
        </div>
        <div className="text-xl font-bold text-white/40 mb-4">
          {word.uzbekTranslation}
        </div>
        <button 
          onClick={() => speak(word.englishWord)}
          className="text-amber-400 hover:text-amber-300 transition-colors text-sm font-bold mx-auto flex items-center gap-1"
        >
          🔊 Qanday o'qiladi?
        </button>
      </div>

      {!notSupported ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={isListening ? undefined : startListening}
            disabled={hasSubmitted}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse shadow-red-500/40 scale-110' 
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 hover:scale-105 active:scale-95 shadow-amber-500/30'
            }`}
          >
            {isListening ? <Mic className="w-10 h-10 animate-bounce" /> : <Mic className="w-10 h-10" />}
          </button>
          
          <div className="h-8">
            {transcript && (
              <span className={`text-lg font-bold ${isCorrect === false ? 'text-red-400' : 'text-white/60'}`}>
                Siz aytdingiz: "{transcript}"
              </span>
            )}
            {!transcript && isListening && (
              <span className="text-amber-400 text-sm font-bold animate-pulse">Eshitilmoqda...</span>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-4 text-center">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl">
            Sizning brauzeringiz ovozni yozib olishni qo'llab-quvvatlamaydi yoki ruxsat berilmagan.
          </div>
          <button 
            onClick={manualPass}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Men to'g'ri o'qidim
          </button>
        </div>
      )}
    </div>
  );
}
