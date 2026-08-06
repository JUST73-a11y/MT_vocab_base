'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import { Play, Award, CheckCircle, Trophy, ArrowLeft, Layers, Zap, Lock, Trash2, Clock, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import NativeQuiz from './components/NativeQuiz';
import CertificateCelebrationModal from '@/components/CertificateCelebrationModal';
import { CertificateData } from '@/components/CertificateCard';

interface AccessibleUnit {
  id: string;
  title: string;
  category?: string;
}

interface UnitProgress {
  masteredWordIds: string[];
  masteredCount: number;
  totalWords: number;
  pct: number;
  activeSession?: {
    wordIds: string[];
    currentStageIndex: number;
    lastActivity: string;
  } | null;
}

interface ActiveSessionItem {
  progressId: string;
  unitId: string;
  unitTitle: string;
  unitCategory: string;
  totalWords: number;
  masteredCount: number;
  activeSession: {
    wordIds: string[];
    currentStageIndex: number;
    lastActivity: string;
  };
}

interface CertificateData {
  certId: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  unitTitle: string;
  earnedAt: string;
  status: string;
}

export const ACTIVITIES = [
  { id: 'learn', label: "So'zlarni O'rganish", ic: '💡', color: '#F59E0B' },
  { id: 'uz2en', label: "O'zbek → Ingliz", ic: '🇺🇿', color: '#2AA9E0' },
  { id: 'en2uz', label: "Ingliz → O'zbek", ic: '🇬🇧', color: '#2FB556' },
  { id: 'listening', label: "Tinglash", ic: '🎧', color: '#8C6CF1' },
  { id: 'pronounce', label: "Talaffuz", ic: '🗣️', color: '#EC4899' },
  { id: 'unscramble', label: "Harflarni Tuz", ic: '🧩', color: '#14B8A6' },
  { id: 'match', label: "Juftliklar", ic: '🔗', color: '#6366F1' },
  { id: 'memory', label: "Xotira Kartalar", ic: '🧠', color: '#8B5CF6' },
  { id: 'spelling', label: "Imlo", ic: '📝', color: '#10B981' }
];

export default function StudentGamesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [units, setUnits] = useState<AccessibleUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<AccessibleUnit | null>(null);
  const [unitWords, setUnitWords] = useState<any[]>([]);
  
  const [unitProgress, setUnitProgress] = useState<UnitProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  const [activeSessionsList, setActiveSessionsList] = useState<ActiveSessionItem[]>([]);
  const [loadingActiveSessions, setLoadingActiveSessions] = useState(false);
  const [showContinueLearning, setShowContinueLearning] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [sessionWordIds, setSessionWordIds] = useState<string[]>([]);
  
  const [showCertModal, setShowCertModal] = useState(false);
  const [certData, setCertData] = useState<CertificateData | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  const [deleteConfirmUnit, setDeleteConfirmUnit] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadUnits();
      loadActiveSessions();
    }
  }, [user]);

  const loadUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await apiFetch('/api/units');
      const mapped = (res || []).map((u: any) => ({
        id: u.id || u._id?.toString(),
        title: u.title,
        category: u.category || "Bo'lim",
      }));
      setUnits(mapped);
    } catch {
      toast.error("Bo'limlarni yuklab bo'lmadi");
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadActiveSessions = async () => {
    setLoadingActiveSessions(true);
    try {
      const res = await apiFetch('/api/smartlex/progress?allActive=true');
      setActiveSessionsList(res?.activeSessions || []);
    } catch (e) {
      console.error('Failed to load active sessions:', e);
    } finally {
      setLoadingActiveSessions(false);
    }
  };

  const handleSelectUnit = async (unit: AccessibleUnit) => {
    setSelectedUnit(unit);
    setUnitProgress(null);
    setLoadingProgress(true);
    try {
      const [prog, wordsRes] = await Promise.all([
        apiFetch(`/api/smartlex/progress?unitId=${unit.id}`),
        apiFetch(`/api/words?unitId=${unit.id}`)
      ]);
      setUnitProgress(prog);
      setUnitWords(wordsRes || []);
    } catch {
      setUnitProgress({ masteredWordIds: [], masteredCount: 0, totalWords: 0, pct: 0 });
    } finally {
      setLoadingProgress(false);
    }
  };

  const [activeSeconds, setActiveSeconds] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        setActiveSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const checkCertificateCondition = async (prog: UnitProgress, currentUnit: AccessibleUnit) => {
    if (prog.pct >= 100) {
      try {
        const res = await apiFetch('/api/smartlex/certificate', {
          method: 'POST',
          body: JSON.stringify({
            unitId: currentUnit.id,
            activeSecondsToAdd: activeSeconds,
          }),
        });
        if (res.certificate) {
          setCertData(res.certificate);
          setShowCertModal(true);
          setActiveSeconds(0);
        }
      } catch (e) {
        console.error('Certificate claim error:', e);
      }
    }
  };

  const handleSessionStart = async (wordIds: string[]) => {
    if (!selectedUnit) return;
    try {
      await apiFetch('/api/smartlex/progress', {
        method: 'POST',
        body: JSON.stringify({
          unitId: selectedUnit.id,
          startNewSession: true,
          wordIds
        }),
      });
      loadActiveSessions();
    } catch (e) {
      console.error('Failed to start session:', e);
    }
  };

  const handleStageComplete = async (nextStageIndex: number) => {
    if (!selectedUnit) return;
    try {
      const updatedProg = await apiFetch('/api/smartlex/progress', {
        method: 'POST',
        body: JSON.stringify({
          unitId: selectedUnit.id,
          advanceStage: true,
          currentStageIndex: nextStageIndex
        }),
      });
      setCurrentStageIndex(nextStageIndex);
      setUnitProgress(updatedProg);
      loadActiveSessions();
    } catch (e) {
      console.error('Failed to save stage progress:', e);
      toast.error("Natijani saqlashda xatolik yuz berdi.");
    }
  };

  const handleSessionComplete = async (wordIds: string[]) => {
    if (!selectedUnit) return;
    try {
      const updatedProg = await apiFetch('/api/smartlex/progress', {
        method: 'POST',
        body: JSON.stringify({ 
          unitId: selectedUnit.id, 
          completeSession: true,
          wordIds
        }),
      });
      setUnitProgress(updatedProg);
      await checkCertificateCondition(updatedProg, selectedUnit);
      loadActiveSessions();
    } catch (e) {
      console.error('Failed to complete session:', e);
      toast.error("O'yinni yakunlashda xatolik.");
    }
  };

  const startLearningSession = () => {
    if (!unitProgress) return;
    if (unitProgress.activeSession) {
      setCurrentStageIndex(unitProgress.activeSession.currentStageIndex || 0);
      setSessionWordIds(unitProgress.activeSession.wordIds || []);
    } else {
      setCurrentStageIndex(0);
      setSessionWordIds([]);
    }
    setIsPlaying(true);
  };

  const resumeActiveSessionItem = async (sessionItem: ActiveSessionItem) => {
    const unitObj = units.find(u => u.id === sessionItem.unitId) || {
      id: sessionItem.unitId,
      title: sessionItem.unitTitle,
      category: sessionItem.unitCategory,
    };
    setSelectedUnit(unitObj);
    
    try {
      const wordsRes = await apiFetch(`/api/words?unitId=${sessionItem.unitId}`);
      setUnitWords(wordsRes || []);
      const prog = await apiFetch(`/api/smartlex/progress?unitId=${sessionItem.unitId}`);
      setUnitProgress(prog);
      
      setCurrentStageIndex(sessionItem.activeSession.currentStageIndex || 0);
      setSessionWordIds(sessionItem.activeSession.wordIds || []);
      setIsPlaying(true);
    } catch (e) {
      toast.error("O'yinni tiklashda xatolik yuz berdi");
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteConfirmUnit) return;
    try {
      await apiFetch(`/api/smartlex/progress?unitId=${deleteConfirmUnit.id}`, {
        method: 'DELETE',
      });
      toast.success("Chala o'yin o'chirildi");
      if (selectedUnit?.id === deleteConfirmUnit.id) {
        handleSelectUnit(selectedUnit);
      }
      loadActiveSessions();
    } catch (e) {
      toast.error("O'chirishda xatolik yuz berdi");
    } finally {
      setDeleteConfirmUnit(null);
    }
  };

  const handleNextStage = () => {
    setIsPlaying(false);
    loadActiveSessions();
    if (selectedUnit) {
      handleSelectUnit(selectedUnit);
    }
  };

  const handleExitGame = () => {
    setIsPlaying(false);
    if (selectedUnit) handleSelectUnit(selectedUnit);
    loadActiveSessions();
  };

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  const activeActObj = ACTIVITIES[currentStageIndex];
  const totalStages = ACTIVITIES.length;

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-8 px-4 max-w-6xl mx-auto flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-500/30">
              🎮
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">SmartLex O&apos;yini</h1>
          </div>
          <p className="text-white/40 text-sm ml-[52px]">Bo'lim so'zlarini interaktiv o'rganish platformasi</p>
        </div>
        <Link
          href="/student/certificates"
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm hover:from-amber-500/20 hover:to-orange-500/20 transition-all shadow-lg shadow-amber-500/10"
        >
          <Award className="w-4 h-4" />
          <span>Mening Sertifikatlarim</span>
        </Link>
      </div>

      {/* ── Continue Learning Section ── */}
      {activeSessionsList.length > 0 && !isPlaying && (
        <div className="rounded-3xl bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-gray-900 border border-amber-500/30 overflow-hidden shadow-xl">
          <button
            onClick={() => setShowContinueLearning(!showContinueLearning)}
            className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors focus:outline-none text-left"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <h2 className="text-lg font-black text-amber-400 tracking-wide uppercase">Davom ettirish</h2>
                <span className="text-xs font-bold text-white/40">Chala qolgan {activeSessionsList.length} ta bo'lim</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <svg className={`w-5 h-5 transition-transform duration-300 ${showContinueLearning ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          <div className={`transition-all duration-500 ease-in-out ${showContinueLearning ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-amber-500/10 mt-2">
              {activeSessionsList.map(item => {
                const stageIdx = item.activeSession.currentStageIndex;
                const actObj = ACTIVITIES[stageIdx] || ACTIVITIES[0];
                const pct = item.totalWords > 0 ? Math.round((item.masteredCount / item.totalWords) * 100) : 0;
                return (
                  <div key={item.unitId} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col justify-between gap-3 hover:border-amber-500/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between text-xs text-white/40 font-bold mb-1">
                        <span>{item.unitCategory}</span>
                        <span className="text-amber-400 font-mono">{pct}%</span>
                      </div>
                      <h3 className="text-base font-black text-white truncate">{item.unitTitle}</h3>
                      <p className="text-xs font-bold text-amber-300/80 mt-1 flex items-center gap-1">
                        <span>{actObj.ic}</span>
                        <span>Bosqich {stageIdx + 1} / {ACTIVITIES.length}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-white/50">
                        <span>O'rganilgan: {item.masteredCount}/{item.totalWords}</span>
                        <span>{item.activeSession.wordIds.length} ta so'z</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => resumeActiveSessionItem(item)}
                          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Davom ettirish</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmUnit({ id: item.unitId, title: item.unitTitle })}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors"
                          title="Natijani o'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Active Gameplay View (IN-PAGE LAYOUT) ── */}
      {isPlaying && selectedUnit ? (
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between px-2 pb-4 border-b border-white/10 flex-wrap gap-3">
            <button
              onClick={handleExitGame}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold transition-colors px-3 py-1.5 rounded-xl hover:bg-white/10 border border-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeActObj?.ic}</span>
              <span className="font-black text-white text-sm md:text-base">{selectedUnit.title} — {activeActObj?.label}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
              <span>{currentStageIndex + 1}-bosqich</span>
            </div>
          </div>

          <div className="min-h-[420px] flex flex-col justify-center">
            <NativeQuiz 
              unitId={selectedUnit.id}
              currentStageIndex={currentStageIndex}
              allWords={unitWords}
              masteredWordIds={unitProgress?.masteredWordIds || []}
              initialSessionWordIds={sessionWordIds}
              onSessionStart={handleSessionStart}
              onStageComplete={handleStageComplete}
              onSessionComplete={handleSessionComplete}
              onExit={handleExitGame}
              onNextStage={handleNextStage}
            />
          </div>
        </div>
      ) : (
        /* ── Main 3-col Grid (Setup View) ── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Unit List */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <p className="text-[11px] uppercase font-black tracking-widest text-white/30 px-1">Bo&apos;limlar</p>
            {loadingUnits ? (
              <div className="text-center text-white/30 py-8 text-sm">Yuklanmoqda...</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1 custom-scroll">
                {units.map(u => {
                  const isSelected = selectedUnit?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUnit(u)}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center gap-3 group ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                        📖
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>{u.title}</p>
                        <p className="text-[10px] text-white/30 truncate">{u.category}</p>
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-white/80 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CENTER: Unit details + play */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {selectedUnit ? (
              <>
                <div className="rounded-3xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-gray-900 border border-indigo-500/30 p-6 shadow-xl">
                  <p className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-1">Tanlangan bo&apos;lim</p>
                  <h2 className="text-2xl font-black text-white">{selectedUnit.title}</h2>

                  {loadingProgress ? (
                    <div className="mt-4 text-white/30 text-sm">Statistika yuklanmoqda...</div>
                  ) : unitProgress && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className="text-white/50">So&apos;zlarni O&apos;zlashtirish</span>
                          <span className="text-indigo-400">{unitProgress.pct}%</span>
                        </div>
                        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${unitProgress.pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 rounded-xl p-2.5 text-center">
                          <p className="text-lg font-black text-white">{unitProgress.totalWords}</p>
                          <p className="text-[9px] uppercase font-bold text-white/30">Jami So'zlar</p>
                        </div>
                        <div className="bg-emerald-500/10 rounded-xl p-2.5 text-center border border-emerald-500/20">
                          <p className="text-lg font-black text-emerald-400">{unitProgress.masteredCount}</p>
                          <p className="text-[9px] uppercase font-bold text-emerald-400/60">O&apos;rganildi</p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="w-full bg-white/5 rounded-xl border border-white/10 p-3 flex justify-between items-center text-sm font-bold">
                          <span className="text-white/60">Qolgan o'rganilmagan so'zlar:</span>
                          <span className="text-amber-400 font-mono text-base">{Math.max(0, unitProgress.totalWords - unitProgress.masteredCount)} ta</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {unitProgress?.pct === 100 ? (
                  <div className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 font-black text-xl text-gray-950 shadow-xl shadow-emerald-500/25 flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-2"><CheckCircle className="w-6 h-6 fill-current" /> Bo'lim to'liq yakunlangan!</div>
                    <span className="text-sm font-bold opacity-75">Sertifikat tayyor.</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={startLearningSession}
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 font-black text-xl text-gray-950 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      <span>{unitProgress?.activeSession ? "O'yinni davom ettirish" : "Yangi sessiya boshlash (15 ta so'z)"}</span>
                    </button>
                    {unitProgress?.activeSession && (
                      <button
                        onClick={() => setDeleteConfirmUnit({ id: selectedUnit.id, title: selectedUnit.title })}
                        className="w-full py-3 rounded-2xl bg-red-500/10 text-red-400 font-bold border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Sessiyani bekor qilish</span>
                      </button>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-3xl bg-white/3 border border-white/8 border-dashed text-center p-8">
                <Layers className="w-14 h-14 text-white/15 mb-4" />
                <p className="text-white/40 font-bold">Chap tomondan bo&apos;lim tanlang</p>
                <p className="text-white/25 text-sm mt-1">Siz tanlagan bo'limdagi so'zlar 15 talik guruhlarga bo'lib o'rganiladi.</p>
              </div>
            )}
          </div>

          {/* RIGHT: Stages progress (Current Session) */}
          <div className="lg:col-span-4">
            <p className="text-[11px] uppercase font-black tracking-widest text-white/30 mb-3 px-1">Sessiya bosqichlari</p>
            <div className="rounded-3xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2">
              {ACTIVITIES.map((act, i) => {
                const isSessionActive = !!unitProgress?.activeSession;
                const activeStageIdx = unitProgress?.activeSession?.currentStageIndex ?? 0;
                const done = isSessionActive && i < activeStageIdx;
                const isNext = isSessionActive && i === activeStageIdx;
                const locked = !isSessionActive || i > activeStageIdx;

                const replayStage = () => {
                  if (done && unitProgress?.activeSession) {
                    setCurrentStageIndex(i);
                    setSessionWordIds(unitProgress.activeSession.wordIds || []);
                    setIsPlaying(true);
                  }
                };

                return (
                  <button
                    key={act.id}
                    onClick={replayStage}
                    disabled={!done && !isNext}
                    className={`w-full flex items-center text-left gap-3 px-3.5 py-3.5 rounded-2xl border transition-all ${
                      done
                        ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:scale-[1.02] cursor-pointer'
                        : isNext
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-lg shadow-amber-500/10 cursor-default'
                        : 'bg-white/3 border-transparent opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className={`text-2xl ${locked ? 'grayscale opacity-40' : ''}`}>{done ? '✅' : isNext ? act.ic : '🔒'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${done ? 'text-emerald-300' : isNext ? 'text-amber-300' : 'text-white/30'}`}>
                        {i + 1}. {act.label}
                      </p>
                    </div>
                    {done && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                    {isNext && <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />}
                    {locked && <Lock className="w-4 h-4 text-white/20 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 p-5 rounded-3xl bg-gradient-to-b from-gray-900 to-gray-950 border border-amber-500/20 text-center relative overflow-hidden shadow-lg">
               <div className="absolute top-0 right-0 p-4 text-6xl opacity-10 blur-sm pointer-events-none">🎓</div>
               <p className="text-amber-500 font-black text-xs mb-1 uppercase tracking-wider">Sertifikat Olish Sharti</p>
               <p className="text-white/60 text-xs leading-relaxed">Barcha so'zlarni 15 talik guruhlarga bo'lib, har bir guruh uchun barcha bosqichlardan o'ting.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Delete Confirmation Modal ── */}
      {deleteConfirmUnit && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Chala o'yinni bekor qilish</h3>
            <p className="text-white/60 text-xs mb-6">
              <span className="text-white font-bold">{deleteConfirmUnit.title}</span> bo'limidagi 15 talik guruh uchun boshlangan chala o'yiningiz o'chirilsinmi?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteConfirmUnit(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/70 font-bold text-xs hover:bg-white/10 transition-colors"
              >
                Orqaga
              </button>
              <button
                onClick={handleDeleteSession}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-lg shadow-red-500/30 transition-all"
              >
                Ha, bekor qilinsin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Certificate Celebration Modal ── */}
      {showCertModal && certData && (
        <CertificateCelebrationModal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          unitTitle={selectedUnit?.title || certData.unitTitle}
          totalWords={unitProgress?.totalWords || 25}
          certificate={certData}
        />
      )}
    </div>
  );
}
