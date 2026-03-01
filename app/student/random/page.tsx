'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getWordsByUnits, getTodaySession, createSession, updateSession, updateUserWordCount, getRandomTeacherSettings, getUnits } from '@/lib/firestore';
import { Word, Unit } from '@/lib/types';
import { getRandomWord, getBalancedExclusions } from '@/lib/randomEngine';
import { ArrowLeft, SkipForward, Loader2, Play, Volume2, Timer, FolderOpen, Headphones, Settings2, Eye, EyeOff, Languages } from 'lucide-react';

// ─── Circular Timer ────────────────────────────────────────────────────
function CircularTimer({ timeLeft, total, isPaused }: { timeLeft: number; total: number; isPaused: boolean }) {
    const R = 50, C = 2 * Math.PI * R;
    const progress = total > 0 ? timeLeft / total : 0;
    const color = progress > 0.5 ? 'var(--primary)' : progress > 0.25 ? '#f59e0b' : '#f87171';
    return (
        <div className="relative flex items-center justify-center mb-8 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]" style={{ width: 140, height: 140 }}>
            <svg className="absolute inset-0 -rotate-90" style={{ width: '100%', height: '100%' }} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={`${C * progress} ${C}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }} />
            </svg>
            <div className="text-center z-10">
                <div className="text-4xl font-black tabular-nums text-white">{timeLeft}</div>
                <div className="text-[10px] uppercase font-black tracking-widest text-white/30">saniye</div>
            </div>
        </div>
    );
}

export default function RandomPracticePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [viewingUnits, setViewingUnits] = useState(false);

    const [allWords, setAllWords] = useState<Word[]>([]);
    const [currentWord, setCurrentWord] = useState<Word | null>(null);
    const [showTranslation, setShowTranslation] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [wordsSeen, setWordsSeen] = useState<string[]>([]);
    const [timerDuration, setTimerDuration] = useState(10);
    const [timeLeft, setTimeLeft] = useState(10);
    const [timerActive, setTimerActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [historyStack, setHistoryStack] = useState<Word[]>([]);
    const [speechRate, setSpeechRate] = useState(1.0);
    const [isBlurred, setIsBlurred] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [feedbackColor, setFeedbackColor] = useState<'none' | 'success' | 'danger'>('none');
    const [practiceMode, setPracticeMode] = useState<'EN' | 'UZ'>('EN'); // EN -> UZ or UZ -> EN
    const [wordServedAt, setWordServedAt] = useState<number>(Date.now());

    const categoryMap = availableUnits.reduce((acc, unit) => {
        const cat = unit.category || 'Kategoriyasiz';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(unit);
        return acc;
    }, {} as Record<string, Unit[]>);
    const categories = Object.keys(categoryMap).sort((a, b) =>
        a === 'Kategoriyasiz' ? 1 : b === 'Kategoriyasiz' ? -1 : a.localeCompare(b));
    const displayedUnits = activeCategory ? (categoryMap[activeCategory] || []) : availableUnits;

    useEffect(() => { if (loading || !user) return; loadInitialData(); }, [user, loading]);

    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (timerActive && !isPaused && timeLeft > 0 && !showTranslation) {
            interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (timeLeft === 0 && !showTranslation) {
            setShowTranslation(true); setTimerActive(false);

            // Vaqt tugaganda avval dumaloq timer animatsiyasi tugashi kutiladi (1s) keyin QIZIL fon
            setTimeout(() => {
                setFeedbackColor('danger');
                setTimeout(() => {
                    setFeedbackColor('none');
                }, 300);
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [timerActive, isPaused, timeLeft, showTranslation]);

    // Oyna NavBar ni yashirish (Faqat mashq paytida)
    useEffect(() => {
        const nav = document.getElementById('student-nav');
        if (nav) {
            nav.style.display = isSelectionMode ? 'block' : 'none';
        }
        return () => {
            if (nav) nav.style.display = 'block';
        }
    }, [isSelectionMode]);

    const loadInitialData = async () => {
        if (!user) return;
        setLoadingData(true); setError('');
        try {
            const [unitsRes, treeRes] = await Promise.all([
                getUnits(),
                fetch('/api/teacher/categories/tree').catch(() => null)
            ]);

            let tree = [];
            if (treeRes && treeRes.ok) {
                tree = await treeRes.json();
            }

            const catIdToPathName: Record<string, string> = {};
            const flatten = (nodes: any[], depthStr: string) => {
                nodes.forEach(n => {
                    catIdToPathName[n._id] = depthStr + n.name;
                    if (n.children && n.children.length > 0) {
                        flatten(n.children, depthStr + n.name + ' / ');
                    }
                });
            };
            flatten(tree, '');

            const unitsWithPath = unitsRes.map(u => ({
                ...u,
                category: (u.categoryId && catIdToPathName[u.categoryId]) ? catIdToPathName[u.categoryId] : (u.category || 'Kategoriyasiz')
            }));

            setAvailableUnits(unitsWithPath); setAllWords([]);
            const settings = await getRandomTeacherSettings(user.role === 'teacher' ? user.id : undefined);
            setTimerDuration(settings?.timerDuration || 10);
            const sel = settings?.selectedUnits;
            setSelectedUnitIds(sel?.length ? sel : unitsRes.map(u => u.id));
        } catch { setError('Yuklab bo\'lmadi.'); }
        finally { setLoadingData(false); }
    };

    const toggleUnitSelection = (unitId: string) =>
        setSelectedUnitIds(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);

    const startPractice = async () => {
        if (selectedUnitIds.length === 0) { setError("Kamida bitta bo'lim tanlang."); return; }
        setLoadingData(true); setError(''); setIsSelectionMode(false);
        try {
            const words = await getWordsByUnits(selectedUnitIds);
            if (!words.length) {
                setError("Tanlangan bo'limlarda so'z topilmadi. Iltimos, o'qituvchi bilan bog'laning yoki bo'limga so'z qo'shing.");
                setLoadingData(false);
                return;
            }
            setAllWords(words);
            let session = await getTodaySession(user!.id);
            if (!session) { setSessionId(await createSession(user!.id)); setWordsSeen([]); }
            else { setSessionId(session.id); setWordsSeen(session.wordsSeen); }
            const excl = getBalancedExclusions(words, session?.wordsSeen || []);
            const first = getRandomWord(words, excl) || getRandomWord(words, []);
            if (!first) { setError("So'z topilmadi."); setLoadingData(false); return; }
            setCurrentWord(first); setHistoryStack([]);
            setWordServedAt(Date.now());
            setTimeLeft(timerDuration); setTimerActive(true);
        } catch { setError('Mashqni boshlashda xato'); }
        finally { setLoadingData(false); }
    };

    const handleSpeak = (e?: React.MouseEvent | null, lang: 'en-US' | 'en-GB' = 'en-US') => {
        if (e) e.stopPropagation();
        if (!currentWord) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(currentWord.englishWord);
        u.lang = lang; u.rate = speechRate;
        const v = window.speechSynthesis.getVoices().find(v => v.lang === lang || v.lang.startsWith(lang));
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
    };

    useEffect(() => {
        if (currentWord && !isSelectionMode && !showTranslation && practiceMode === 'EN') {
            const t = setTimeout(() => handleSpeak(null, 'en-GB'), 500);
            return () => clearTimeout(t);
        }
    }, [currentWord?.id, isSelectionMode, practiceMode]);

    const handleNext = async () => {
        if (!sessionId || !currentWord || !user) return;

        const seen = [...wordsSeen, currentWord.id];
        setWordsSeen(seen);
        const timeSpent = Math.floor((Date.now() - wordServedAt) / 1000);
        await updateSession(sessionId, seen, timeSpent);
        await updateUserWordCount(user.id, user.totalWordsSeen + 1);
        const next = getRandomWord(allWords, getBalancedExclusions(allWords, seen), currentWord.unitId)
            || getRandomWord(allWords, [], currentWord.unitId);
        if (next) {
            setHistoryStack(p => currentWord ? [...p, currentWord] : p);
            setCurrentWord(next); setShowTranslation(false);
            setWordServedAt(Date.now());
            setTimerActive(true); setIsPaused(false); setTimeLeft(timerDuration);
        } else { setError("So'z topilmadi."); }
    };

    const handlePrevious = () => {
        if (!historyStack.length) return;
        const prev = historyStack[historyStack.length - 1];
        setHistoryStack(s => s.slice(0, -1));
        setCurrentWord(prev); setShowTranslation(false);
        setTimerActive(true); setIsPaused(false); setTimeLeft(timerDuration);
    };

    const handleResetSession = async () => {
        if (!sessionId) return;
        setLoadingData(true);
        try { await updateSession(sessionId, []); setWordsSeen([]); setError(''); await startPractice(); }
        catch { setError('Reset xato'); setLoadingData(false); }
    };

    // ── Loading ──
    if (loading || (loadingData && !isSelectionMode)) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
            <div className="text-center animate-pulse">
                <Loader2 className="w-16 h-16 text-indigo-500 mx-auto mb-6 animate-spin" />
                <p className="text-white/40 font-black uppercase tracking-[0.3em] text-xs">Tayyorlaning...</p>
            </div>
        </div>
    );

    // ── Error (during practice) ──
    if (error && !isSelectionMode) {
        const done = error.includes('seen all available words');
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-card max-w-sm w-full p-10 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
                        <span className="text-4xl">{done ? '🏆' : '⚠️'}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">{done ? "Ajoyib natija!" : 'Xatolik yuz berdi'}</h2>
                    <p className="text-white/40 mb-8 text-sm leading-relaxed">{error}</p>
                    <div className="flex flex-col gap-3">
                        {done && (
                            <button onClick={handleResetSession} className="btn-premium py-4">
                                <Play className="w-4 h-4" /> Boshidan boshlash
                            </button>
                        )}
                        <button onClick={() => { setIsSelectionMode(true); setError(''); }} className="btn-glass py-4">
                            Bo'limni o'zgartirish
                        </button>
                    </div>
                    <Link href="/student/dashboard" className="block mt-8 text-[11px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors">
                        ← Dashboardga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    if (isSelectionMode) {
        return (
            <div className="flex-1 w-full flex items-center justify-center p-4">
                <main className="glass-card w-full max-w-lg flex flex-col max-h-[85vh] animate-fade-in">
                    {/* Header */}
                    <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            {viewingUnits ? (
                                <button onClick={() => { setViewingUnits(false); setActiveCategory(null); }}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-white" />
                                </button>
                            ) : (
                                <Link href="/student/dashboard"
                                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95">
                                    <ArrowLeft className="w-5 h-5 text-white" />
                                </Link>
                            )}
                            <div>
                                <h1 className="font-black text-xl tracking-tighter text-white">
                                    {viewingUnits ? activeCategory : 'Mashq Turi'}
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-0.5">
                                    {viewingUnits ? 'Bo\'limni tanlang' : 'Yo\'nalishni tanlang'}
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                        {loadingData ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/20">Yuklanmoqda...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {!viewingUnits ? (
                                    categories.map(cat => {
                                        const unitsInCat = categoryMap[cat] || [];
                                        const selectedInCat = unitsInCat.filter(u => selectedUnitIds.includes(u.id)).length;
                                        return (
                                            <button key={cat} onClick={() => { setActiveCategory(cat); setViewingUnits(true); }}
                                                className="w-full flex items-center justify-between p-5 rounded-2xl text-left transition-all hover:bg-white/5 border border-transparent hover:border-white/10 active:scale-[0.98] group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all">
                                                        <FolderOpen className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-lg text-white block leading-tight">{cat}</span>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mt-1">{unitsInCat.length} bo'lim</p>
                                                    </div>
                                                </div>
                                                {selectedInCat > 0 ? (
                                                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                                        {selectedInCat} tanlandi
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white/20 group-hover:text-white/60 transition-all">
                                                        <ArrowLeft className="w-5 h-5 rotate-180" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 mb-4">
                                            <button onClick={() => {
                                                const ids = displayedUnits.map(u => u.id);
                                                setSelectedUnitIds(p => Array.from(new Set([...p, ...ids])));
                                            }} className="flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 transition-all active:scale-95">
                                                Hammasi
                                            </button>
                                            <button onClick={() => {
                                                const ids = displayedUnits.map(u => u.id);
                                                setSelectedUnitIds(p => p.filter(id => !ids.includes(id)));
                                            }} className="flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400 transition-all active:scale-95">
                                                Barchasini Bekor Qilish
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                            {displayedUnits.map(unit => {
                                                const sel = selectedUnitIds.includes(unit.id);
                                                return (
                                                    <button key={unit.id} onClick={() => toggleUnitSelection(unit.id)}
                                                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${sel ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-transparent border-white/5 hover:border-white/10'}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${sel ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-white/20'}`}>
                                                                <FolderOpen className="w-4 h-4" />
                                                            </div>
                                                            <span className={`font-black text-sm ${sel ? 'text-white' : 'text-white/60'}`}>{unit.title}</span>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${sel ? 'bg-emerald-500 scale-110 shadow-lg shadow-emerald-500/30' : 'bg-white/10 border border-white/20'}`}>
                                                            {sel && <svg width="10" height="8" viewBox="0 0 12 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5l2 2 6-6" /></svg>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer - Timer Settings */}
                    <footer className="px-8 py-6 border-t border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60">
                                    <Settings2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Vaqt chegarasi</p>
                                    <p className="text-sm font-black text-white">{timerDuration} soniya</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {[5, 10, 20, 30].map(val => (
                                    <button key={val} onClick={() => setTimerDuration(val)}
                                        className={`w-10 h-8 rounded-lg text-[10px] font-black transition-all ${timerDuration === val ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-white/30 hover:text-white/60'}`}>
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60">
                                    <Languages className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Tarjima yo'nalishi</p>
                                    <p className="text-sm font-black text-white">{practiceMode === 'EN' ? 'EN → UZ' : 'UZ → EN'}</p>
                                </div>
                            </div>
                            <div className="flex bg-white/5 rounded-2xl p-1.5 gap-2">
                                {(['EN', 'UZ'] as const).map(m => (
                                    <button key={m} onClick={() => setPracticeMode(m)}
                                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${practiceMode === m ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'text-white/30 hover:text-white/60'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={startPractice} disabled={selectedUnitIds.length === 0 || loadingData}
                            className="btn-premium w-full h-16 text-lg group">
                            <Play className="w-5 h-5 fill-current" />
                            <span>Mashqni boshlash</span>
                            <div className="shimmer-active group-hover:block" />
                        </button>
                        {error && <p className="text-red-400 text-[10px] font-black uppercase text-center mt-3 tracking-widest">{error}</p>}
                    </footer>
                </main>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // PRACTICE MODE
    // ══════════════════════════════════════════════
    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${feedbackColor === 'success' ? 'bg-emerald-900/40' : feedbackColor === 'danger' ? 'bg-red-900/40' : ''}`}>
            {/* Header: Progress & Back */}
            <header className="w-full max-w-4xl flex items-center justify-between py-6">
                <button onClick={() => setIsSelectionMode(true)} className="btn-glass px-4 py-2 text-xs">
                    <ArrowLeft className="w-4 h-4" /> To'xtatish
                </button>
                <div className="flex items-center gap-8">
                    <div className="text-center group">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-indigo-400 transition-colors">Bugun</p>
                        <p className="text-2xl font-black text-white">{wordsSeen.length}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center">
                {currentWord && (
                    <div className="w-full flex flex-col items-center animate-fade-in">
                        <CircularTimer timeLeft={timeLeft} total={timerDuration} isPaused={isPaused} />

                        {/* Word Card */}
                        <section className="glass-card w-full p-12 md:p-20 text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                <div className="absolute top-10 right-10 flex gap-4 rotate-12">
                                    <Headphones className="w-20 h-20" />
                                    <Volume2 className="w-20 h-20" />
                                </div>
                            </div>

                            {/* [1] Large English Word */}
                            <div className="relative mb-12">
                                <h1 className={`text-[clamp(44px,15vw,110px)] font-black text-white tracking-tighter capitalize leading-[0.9] select-none transition-all duration-500 ${isBlurred ? 'blur-2xl opacity-20 scale-95' : ''}`}>
                                    {practiceMode === 'EN' ? currentWord.englishWord : currentWord.uzbekTranslation}
                                </h1>

                                {/* [2] Phonetic transcription (Directly below English) */}
                                {practiceMode === 'EN' && currentWord.phonetic && (
                                    <div className={`mt-4 transition-all duration-500 ${isBlurred ? 'blur-2xl opacity-20 scale-95' : ''}`}>
                                        <button
                                            onClick={() => handleSpeak(null, 'en-US')}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold tracking-wider text-sm md:text-lg hover:bg-indigo-500/20 transition-all active:scale-95"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                            {currentWord.phonetic}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* [3] Example Sentence (Different color/style) */}
                            {currentWord.exampleSentence && (
                                <div className="max-w-3xl mx-auto mb-12">
                                    <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Context Usage</p>
                                    <p className="text-lg md:text-2xl text-emerald-100/30 italic leading-relaxed font-medium px-4">
                                        "{currentWord.exampleSentence}"
                                    </p>
                                </div>
                            )}

                            {/* [4] Uzbek Translation (Shown after time up) */}
                            <div className="mt-8 min-h-[120px] pt-8 border-t border-white/5 flex items-center justify-center">
                                {showTranslation ? (
                                    <div className="animate-fade-in group/uz">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4">Ma'nosi</p>
                                        <h2 className="text-4xl md:text-7xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_30px_rgba(16,185,129,0.4)] capitalize">
                                            {practiceMode === 'EN' ? currentWord.uzbekTranslation : currentWord.englishWord}
                                        </h2>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-2 h-2 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                                            ))}
                                        </div>
                                        <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">Tarjima kutilmoqda...</span>
                                    </div>
                                )}
                            </div>

                            {/* Audio & Blur Controls */}
                            <div className="mt-12 flex items-center justify-center flex-wrap gap-4 pt-12 border-t border-white/5">
                                <button onClick={() => handleSpeak(null, 'en-US')} className="btn-glass px-6 py-3 text-[10px] border-indigo-500/10 font-black uppercase tracking-widest active:scale-95">
                                    <Headphones className="w-4 h-4 text-indigo-400" /> US Accent
                                </button>
                                <button onClick={() => handleSpeak(null, 'en-GB')} className="btn-glass px-6 py-3 text-[10px] border-indigo-500/10 font-black uppercase tracking-widest active:scale-95">
                                    <Headphones className="w-4 h-4 text-indigo-400" /> UK Accent
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsBlurred(!isBlurred); }}
                                    className={`btn-glass px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isBlurred ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'border-white/10'}`}
                                >
                                    {isBlurred ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    {isBlurred ? 'Ko\'rsatish' : 'Yashirish'}
                                </button>
                            </div>
                        </section>

                        {/* Interaction Bar */}
                        <div className="w-full mt-8 flex flex-col md:flex-row gap-4">
                            <div className="flex gap-3">
                                <button onClick={handlePrevious} disabled={historyStack.length === 0}
                                    className="btn-glass w-16 h-16 md:w-20 md:h-20 flex-shrink-0 disabled:opacity-20 border-white/10">
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <button onClick={() => setIsPaused(p => !p)}
                                    className={`btn-glass flex-1 md:flex-none md:w-32 h-16 md:h-20 flex flex-col items-center justify-center border-white/10 ${isPaused ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : ''}`}>
                                    {isPaused ? <Play className="w-6 h-6 fill-current" /> : <div className="flex gap-1.5"><div className="w-1.5 h-6 bg-white/40 rounded-full" /><div className="w-1.5 h-6 bg-white/40 rounded-full" /></div>}
                                    <span className="text-[9px] font-black uppercase tracking-widest mt-1">{isPaused ? 'Davom' : 'Pauza'}</span>
                                </button>
                            </div>

                            {!showTranslation ? (
                                <button onClick={() => {
                                    setShowTranslation(true);
                                    if (timeLeft > 0) {
                                        setFeedbackColor('success');
                                        setTimeout(() => {
                                            setFeedbackColor('none');
                                        }, 300);
                                    }
                                }} className="btn-premium flex-1 h-16 md:h-20 text-2xl uppercase tracking-widest">
                                    Ko'rsatish
                                </button>
                            ) : (
                                <button onClick={handleNext} className="btn-accent flex-1 h-16 md:h-20 text-2xl uppercase tracking-widest">
                                    Keyingi <SkipForward className="w-6 h-6 fill-current" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
