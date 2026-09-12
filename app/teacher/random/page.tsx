'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getWordsByUnits, getTodaySession, createSession, updateSession, updateUserWordCount, getRandomTeacherSettings, getUnits } from '@/lib/firestore';
import { Word, Unit } from '@/lib/types';
import { getRandomWord, getBalancedExclusions } from '@/lib/randomEngine';
import { ArrowLeft, SkipForward, Loader2, Play, Volume2, Timer, FolderOpen, Headphones, Settings2, Eye, EyeOff, Languages, Search, ChevronRight, Check, X, CheckCheck } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────
interface CategoryNode {
    _id: string;
    name: string;
    parentId?: string | null;
    children?: CategoryNode[];
}

function findNodeInTree(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const n of nodes) {
        if (n._id === id) return n;
        if (n.children && n.children.length > 0) {
            const found = findNodeInTree(n.children, id);
            if (found) return found;
        }
    }
    return null;
}

function getAllDescendantCategoryIds(node: CategoryNode): string[] {
    const ids: string[] = [node._id];
    if (node.children && node.children.length > 0) {
        for (const c of node.children) {
            ids.push(...getAllDescendantCategoryIds(c));
        }
    }
    return ids;
}

// ─── Circular Timer ────────────────────────────────────────────────────
function CircularTimer({ timeLeft, total, isPaused }: { timeLeft: number; total: number; isPaused: boolean }) {
    const R = 50, C = 2 * Math.PI * R;
    const progress = total > 0 ? timeLeft / total : 0;
    const color = isPaused
        ? '#f59e0b'
        : progress > 0.5
        ? '#6366f1'
        : progress > 0.25
        ? '#f59e0b'
        : '#ef4444';
    return (
        <div className="relative flex items-center justify-center mb-6 sm:mb-8 drop-shadow-[0_0_20px_rgba(99,102,241,0.35)] w-[140px] h-[140px] sm:w-[170px] sm:h-[170px]">
            <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={`${C * progress} ${C}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }} />
            </svg>
            <div className="text-center z-10">
                <div className="text-4xl sm:text-6xl font-black tabular-nums text-white drop-shadow-md">{timeLeft}</div>
                <div className="text-[10px] sm:text-xs uppercase font-black tracking-widest text-white/40 mt-1">saniye</div>
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
    
    // Folder Hierarchy State
    const [categoriesTree, setCategoriesTree] = useState<CategoryNode[]>([]);
    const [currentPath, setCurrentPath] = useState<CategoryNode[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');

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
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isBlurred, setIsBlurred] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [error, setError] = useState('');
    const [feedbackColor, setFeedbackColor] = useState<'none' | 'success' | 'danger'>('none');
    const [practiceMode, setPracticeMode] = useState<'EN' | 'UZ'>('EN'); // EN -> UZ or UZ -> EN
    const [wordServedAt, setWordServedAt] = useState<number>(Date.now());

    useEffect(() => {
        if (loading || !user) return;
        loadInitialData();

        // Load voices and listen for changes (important for some browsers)
        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                const v = window.speechSynthesis.getVoices();
                if (v.length > 0) setVoices(v);
            }
        };
        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        return () => { 
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null; 
            }
        };
    }, [user, loading]);

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
        const nav = document.getElementById('teacher-nav');
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

            let tree: CategoryNode[] = [];
            if (treeRes && treeRes.ok) {
                tree = await treeRes.json();
            }
            setCategoriesTree(tree || []);

            const catIdToPathName: Record<string, string> = {};
            const buildPath = (nodes: CategoryNode[], depthStr: string) => {
                nodes.forEach(n => {
                    catIdToPathName[n._id] = depthStr ? `${depthStr} / ${n.name}` : n.name;
                    if (n.children && n.children.length > 0) {
                        buildPath(n.children, depthStr ? `${depthStr} / ${n.name}` : n.name);
                    }
                });
            };
            buildPath(tree, '');

            const unitsWithPath = (unitsRes || []).map((u: any) => ({
                ...u,
                id: u._id || u.id,
                category: (u.categoryId && catIdToPathName[u.categoryId]) ? catIdToPathName[u.categoryId] : (u.category || 'Kategoriyasiz')
            }));

            setAvailableUnits(unitsWithPath); setAllWords([]);
            const settings = await getRandomTeacherSettings(user.role === 'teacher' ? user.id : undefined);
            setTimerDuration(settings?.timerDuration || 10);
            const sel = settings?.selectedUnits;
            setSelectedUnitIds(sel?.length ? sel : []);
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
        if (!currentWord || typeof window === 'undefined' || !window.speechSynthesis) return;

        // Cancel existing speech
        window.speechSynthesis.cancel();

        // Small delay to ensure cancel clears properly before speaking again
        setTimeout(() => {
            const u = new SpeechSynthesisUtterance(currentWord.englishWord.toLowerCase());
            u.lang = lang;
            u.rate = speechRate;

            // Find best matching voice from available voices
            const availableVoices = window.speechSynthesis.getVoices();
            const v = availableVoices.find(voice => voice.lang === lang || voice.lang.startsWith(lang))
                || availableVoices.find(voice => voice.lang.startsWith('en'))
                || availableVoices[0];

            if (v) u.voice = v;
            window.speechSynthesis.speak(u);
        }, 50);
    };

    useEffect(() => {
        if (currentWord && !isSelectionMode) {
            // Case 1: EN mode - speak when word appears
            if (practiceMode === 'EN' && !showTranslation) {
                const t = setTimeout(() => handleSpeak(null, 'en-GB'), 500);
                return () => clearTimeout(t);
            }
            // Case 2: UZ mode - speak when translation (EN word) is revealed
            if (practiceMode === 'UZ' && showTranslation) {
                const t = setTimeout(() => handleSpeak(null, 'en-GB'), 300);
                return () => clearTimeout(t);
            }
        }
    }, [currentWord?.id, isSelectionMode, practiceMode, showTranslation]);

    const handleNext = async () => {
        if (!sessionId || !currentWord || !user) return;

        const seen = [...wordsSeen, currentWord.id];
        setWordsSeen(seen);
        const timeSpent = Math.floor((Date.now() - wordServedAt) / 1000);
        updateSession(sessionId, seen, timeSpent).catch(console.error);
        updateUserWordCount(user.id, user.totalWordsSeen + 1).catch(console.error);
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

    // ── Hierarchy Helpers ──
    const currentCatId = currentPath.length > 0 ? currentPath[currentPath.length - 1]._id : null;
    const currentCatNode = currentCatId ? findNodeInTree(categoriesTree, currentCatId) : null;
    
    // Folders at this level
    const currentFolders: CategoryNode[] = currentCatId
        ? (currentCatNode?.children || [])
        : categoriesTree;

    // Units directly in this category / level
    const currentLevelUnits: Unit[] = currentCatId
        ? availableUnits.filter(u => u.categoryId === currentCatId || (!u.categoryId && u.category === currentCatNode?.name))
        : [];

    // All units under a given folder node (including descendants)
    const getUnitsInFolder = (node: CategoryNode): Unit[] => {
        const descIds = getAllDescendantCategoryIds(node);
        return availableUnits.filter(u => 
            (u.categoryId && descIds.includes(u.categoryId)) ||
            (u.category && u.category.includes(node.name))
        );
    };

    // Search results
    const isSearching = !!searchQuery.trim();
    const searchedUnits = isSearching
        ? availableUnits.filter(u => 
            u.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (u.category && u.category.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : [];

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
                    <Link href="/teacher/dashboard" className="block mt-8 text-[11px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors">
                        ← Dashboardga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    if (isSelectionMode) {
        return (
            <div className="w-full flex items-center justify-center p-2 sm:p-4 my-auto min-h-[calc(100vh-90px)] animate-fade-in">
                <main className="glass-card max-w-xl w-full flex flex-col max-h-[min(88dvh,820px)] text-left relative rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    {/* Header */}
                    <header className="px-5 sm:px-6 py-4 border-b border-white/5 bg-white/[0.02] shrink-0 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {currentPath.length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPath(p => p.slice(0, -1))}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 shrink-0"
                                    >
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                ) : (
                                    <Link
                                        href="/teacher/dashboard"
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 shrink-0"
                                    >
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </Link>
                                )}
                                <div className="min-w-0">
                                    <h1 className="font-black text-lg sm:text-xl tracking-tight text-white truncate">
                                        {currentPath.length > 0 ? currentPath[currentPath.length - 1].name : "Mashq Bo'limlari"}
                                    </h1>
                                    <p className="text-[11px] font-bold text-white/40 truncate">
                                        {currentPath.length > 0 ? "Papkadagi unitlarni tanlang" : "Papkani tanlang yoki qidiring"}
                                    </p>
                                </div>
                            </div>

                            {/* Badge */}
                            <div className="px-3 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold shrink-0">
                                {selectedUnitIds.length} tanlandi
                            </div>
                        </div>

                        {/* Breadcrumbs Navigation */}
                        {currentPath.length > 0 && (
                            <nav className="flex items-center gap-1.5 flex-wrap text-xs bg-black/20 p-2 rounded-xl border border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPath([])}
                                    className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                                >
                                    <FolderOpen className="w-3.5 h-3.5" /> Asosiy
                                </button>
                                {currentPath.map((p, idx) => (
                                    <div key={p._id} className="flex items-center gap-1.5">
                                        <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                                        <button
                                            type="button"
                                            onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}
                                            className={`font-bold transition-colors truncate max-w-[140px] ${
                                                idx === currentPath.length - 1 ? 'text-white' : 'text-white/50 hover:text-white'
                                            }`}
                                        >
                                            {p.name}
                                        </button>
                                    </div>
                                ))}
                            </nav>
                        )}

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Unit yoki papka qidirish..."
                                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 font-bold outline-none focus:border-indigo-500 text-xs transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Content Area - Scrollable */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-3.5 custom-scrollbar space-y-2">
                        {loadingData ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <span className="text-xs uppercase font-bold tracking-widest text-white/30">Yuklanmoqda...</span>
                            </div>
                        ) : isSearching ? (
                            /* Search Results */
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
                                    Qidiruv natijalari ({searchedUnits.length} ta unit)
                                </p>
                                {searchedUnits.length === 0 ? (
                                    <p className="text-xs text-white/30 text-center py-8">Hech narsa topilmadi</p>
                                ) : (
                                    searchedUnits.map(unit => {
                                        const sel = selectedUnitIds.includes(unit.id);
                                        return (
                                            <button
                                                key={unit.id}
                                                type="button"
                                                onClick={() => toggleUnitSelection(unit.id)}
                                                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border text-left ${
                                                    sel ? 'bg-indigo-500/20 border-indigo-500/40 text-white shadow-sm' : 'bg-white/5 border-white/5 hover:border-white/10 text-white/70'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 border ${
                                                        sel ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 bg-white/5'
                                                    }`}>
                                                        {sel && <Check className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-sm truncate">{unit.title}</p>
                                                        {unit.category && (
                                                            <p className="text-[10px] text-white/40 truncate font-mono mt-0.5">{unit.category}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {sel && <span className="text-[10px] font-bold text-indigo-400 uppercase shrink-0">Tanlangan</span>}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            /* Normal Folder / Unit Hierarchy */
                            <div className="space-y-2">
                                {/* Folders */}
                                {currentFolders.map(folder => {
                                    const unitsInF = getUnitsInFolder(folder);
                                    const selectedInF = unitsInF.filter(u => selectedUnitIds.includes(u.id)).length;
                                    const allSelected = unitsInF.length > 0 && selectedInF === unitsInF.length;

                                    return (
                                        <div
                                            key={folder._id}
                                            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-all group"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPath([...currentPath, folder])}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                                                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-black text-sm text-white block truncate">{folder.name}</span>
                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{unitsInF.length} ta bo'lim</span>
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                {unitsInF.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ids = unitsInF.map(u => u.id);
                                                            if (allSelected) {
                                                                setSelectedUnitIds(prev => prev.filter(id => !ids.includes(id)));
                                                            } else {
                                                                setSelectedUnitIds(prev => Array.from(new Set([...prev, ...ids])));
                                                            }
                                                        }}
                                                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                                            selectedInF > 0
                                                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                                                        }`}
                                                    >
                                                        {selectedInF > 0 ? `${selectedInF}/${unitsInF.length}` : 'Tanlash'}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentPath([...currentPath, folder])}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Units directly in this category */}
                                {currentLevelUnits.length > 0 && (
                                    <div className="pt-2 space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                                                Bo'limlar ({currentLevelUnits.length} ta)
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ids = currentLevelUnits.map(u => u.id);
                                                        setSelectedUnitIds(prev => Array.from(new Set([...prev, ...ids])));
                                                    }}
                                                    className="text-[10px] font-bold text-indigo-400 hover:underline"
                                                >
                                                    Hammasi
                                                </button>
                                                <span className="text-white/20">•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ids = currentLevelUnits.map(u => u.id);
                                                        setSelectedUnitIds(prev => prev.filter(id => !ids.includes(id)));
                                                    }}
                                                    className="text-[10px] font-bold text-rose-400 hover:underline"
                                                >
                                                    Bekor
                                                </button>
                                            </div>
                                        </div>

                                        {currentLevelUnits.map(unit => {
                                            const sel = selectedUnitIds.includes(unit.id);
                                            return (
                                                <button
                                                    key={unit.id}
                                                    type="button"
                                                    onClick={() => toggleUnitSelection(unit.id)}
                                                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border text-left ${
                                                        sel ? 'bg-indigo-500/20 border-indigo-500/40 text-white shadow-sm' : 'bg-white/5 border-white/5 hover:border-white/10 text-white/70'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 border ${
                                                            sel ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 bg-white/5'
                                                        }`}>
                                                            {sel && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className="font-bold text-sm truncate">{unit.title}</span>
                                                    </div>
                                                    {sel && <span className="text-[10px] font-bold text-indigo-400 uppercase shrink-0">Tanlangan</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {currentFolders.length === 0 && currentLevelUnits.length === 0 && (
                                    <p className="text-xs text-white/30 text-center py-8">Ushbu papkada hech qanday bo'lim yo'q</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer - Fixed */}
                    <footer className="px-5 sm:px-6 py-4 border-t border-white/5 bg-slate-950/80 shrink-0 space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Timer Duration */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Vaqt</p>
                                    <p className="text-xs font-black text-white">{timerDuration}s</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[5, 10, 20, 30].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setTimerDuration(val)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                                                timerDuration === val ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/5 text-white/40 hover:text-white'
                                            }`}
                                        >
                                            {val}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Translation Direction */}
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-white/40">Yo'nalish</p>
                                    <p className="text-xs font-black text-white">{practiceMode === 'EN' ? 'EN → UZ' : 'UZ → EN'}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {(['EN', 'UZ'] as const).map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPracticeMode(m)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                practiceMode === m ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/5 text-white/40 hover:text-white'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={startPractice}
                            disabled={selectedUnitIds.length === 0 || loadingData}
                            className="btn-premium w-full h-12 text-sm font-black flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                            style={{ borderRadius: '5px' }}
                        >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Mashqni boshlash {selectedUnitIds.length > 0 ? `(${selectedUnitIds.length} ta unit)` : ''}</span>
                        </button>
                        {error && <p className="text-rose-400 text-[10px] font-black uppercase text-center tracking-wider">{error}</p>}
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

            <main className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center min-w-0 px-2 sm:px-4">
                {currentWord && (
                    <div className="w-full flex flex-col items-center animate-fade-in min-w-0">
                        <CircularTimer timeLeft={timeLeft} total={timerDuration} isPaused={isPaused} />

                        {/* Word Card */}
                        <section className="glass-card w-full p-8 md:p-20 text-center relative overflow-hidden group min-w-0">
                            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                <div className="absolute top-10 right-10 flex gap-4 rotate-12">
                                    <Headphones className="w-20 h-20" />
                                    <Volume2 className="w-20 h-20" />
                                </div>
                            </div>

                            {/* [0] EMOJI if available */}
                            {currentWord.emoji && (
                                <div className={`mb-3 transition-all duration-500 transform hover:scale-110 ${isBlurred ? 'blur-2xl opacity-20 scale-95' : ''}`}>
                                    <span className="text-7xl sm:text-8xl md:text-9xl filter drop-shadow-[0_10px_35px_rgba(255,255,255,0.35)] select-none">
                                        {currentWord.emoji}
                                    </span>
                                </div>
                            )}

                            {/* [1] Large English Word */}
                            <div className="relative mb-6 min-w-0 w-full px-2">
                                <h1 className={`font-black text-white tracking-tighter capitalize leading-[1.1] select-none transition-all duration-500 break-words hyphens-auto w-full ${
                                    (practiceMode === 'EN' ? currentWord.englishWord : currentWord.uzbekTranslation).length > 25
                                        ? 'text-3xl sm:text-4xl md:text-5xl'
                                        : (practiceMode === 'EN' ? currentWord.englishWord : currentWord.uzbekTranslation).length > 15
                                        ? 'text-4xl sm:text-6xl md:text-7xl'
                                        : 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl'
                                } ${isBlurred ? 'blur-2xl opacity-20 scale-95' : ''}`}>
                                    {practiceMode === 'EN' ? currentWord.englishWord : currentWord.uzbekTranslation}
                                </h1>

                                {/* [2] Phonetic transcription (Directly below English) */}
                                {practiceMode === 'EN' && currentWord.phonetic && (
                                    <div className={`mt-4 transition-all duration-500 w-full flex justify-center ${isBlurred ? 'blur-2xl opacity-20 scale-95' : ''}`}>
                                        <button
                                            onClick={() => handleSpeak(null, 'en-US')}
                                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold tracking-wider text-sm md:text-base hover:bg-indigo-500/20 transition-all active:scale-95 max-w-full"
                                        >
                                            <Volume2 className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{currentWord.phonetic}</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* [3] Example Sentence (Different color/style) */}
                            {currentWord.exampleSentence && (
                                <div className="max-w-3xl mx-auto mb-6 w-full px-2 sm:px-4">
                                    <p className="text-emerald-400/60 text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] mb-2">Context Usage</p>
                                    <p className={`text-sm sm:text-base md:text-xl text-emerald-100/40 italic leading-relaxed font-medium break-words transition-all duration-500 ${isBlurred ? 'blur-3xl opacity-0 scale-95 pointer-events-none select-none' : ''}`}>
                                        "{currentWord.exampleSentence}"
                                    </p>
                                </div>
                            )}

                            {/* [4] Uzbek Translation (Shown after time up) */}
                            <div className="mt-4 min-h-[90px] pt-4 border-t border-white/5 flex items-center justify-center w-full min-w-0 px-2 sm:px-4">
                                {showTranslation ? (
                                    <div className="animate-fade-in group/uz w-full min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-2">Ma'nosi</p>
                                        <h2 className={`font-black text-emerald-400 tracking-tight drop-shadow-[0_0_30px_rgba(16,185,129,0.5)] capitalize break-words hyphens-auto w-full leading-[1.1] ${
                                            (practiceMode === 'EN' ? currentWord.uzbekTranslation : currentWord.englishWord).length > 35
                                                ? 'text-xl sm:text-2xl md:text-3xl'
                                                : (practiceMode === 'EN' ? currentWord.uzbekTranslation : currentWord.englishWord).length > 18
                                                ? 'text-2xl sm:text-4xl md:text-5xl'
                                                : 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl'
                                        }`}>
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
