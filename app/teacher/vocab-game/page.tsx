'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, CheckCircle2, XCircle, Loader2, Trophy, Users,
    BookOpen, ChevronRight, BarChart3, Send, Copy, Check,
    AlertTriangle, Star, RefreshCw, ArrowLeft, Zap, Target,
    Medal, TrendingUp, PieChart as PieIcon, Download, Volume2, VolumeX,
    Eye, EyeOff, Square, UserPlus, Flame, Sparkles, FolderOpen, ChevronDown, CheckCheck, Search, X,
    Camera, Edit2, Save
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { announcer } from '@/lib/announcerSound';
import VocabularyUnitSelector from '@/components/teacher/VocabularyUnitSelector';

// ─── Sound Effects (Web Audio API) ────────────────────────────────────────────
const playSuccessSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch {}
};

const playWrongSound = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch {}
};

// ─── Compact Circular Timer ──────────────────────────────────────────────────
function CircularTimer({
    timeLeft,
    total,
    isPaused,
    onTogglePause
}: {
    timeLeft: number;
    total: number;
    isPaused: boolean;
    onTogglePause: () => void;
}) {
    const R = 44, C = 2 * Math.PI * R;
    const progress = total > 0 ? timeLeft / total : 0;
    const color = isPaused
        ? '#f59e0b'
        : progress > 0.5
        ? '#6366f1'
        : progress > 0.25
        ? '#f59e0b'
        : '#ef4444';

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative flex items-center justify-center mx-auto drop-shadow-[0_0_20px_rgba(99,102,241,0.35)] w-[90px] h-[90px] sm:w-[120px] sm:h-[120px]">
                <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="6"
                        strokeDasharray={`${C * progress} ${C}`} strokeLinecap="round"
                        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }} />
                </svg>
                <div className="text-center z-10 flex flex-col items-center justify-center">
                    <div className="text-2xl sm:text-4xl font-black tabular-nums text-white tracking-tight leading-none drop-shadow-md">
                        {timeLeft}
                    </div>
                    <div className="text-[8px] sm:text-[10px] uppercase font-black tracking-[0.15em] text-white/50 mt-0.5">
                        {isPaused ? 'PAUZADA' : 'SEC'}
                    </div>
                </div>
            </div>

            {/* Time Stop / Resume Button */}
            <button
                type="button"
                onClick={onTogglePause}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all active:scale-95 border shadow-sm ${
                    isPaused
                        ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/40 animate-pulse'
                        : 'bg-white/10 text-white/90 hover:text-white hover:bg-white/20 border-white/20'
                }`}
            >
                {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
                <span>{isPaused ? 'Davom ettirish' : 'Vaqtni to\'xtatish'}</span>
            </button>
        </div>
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Group { _id: string; id?: string; name: string; vocabularyMode?: boolean; memberCount?: number; telegramChatId?: string; }
interface Unit { id: string; title: string; category?: string; categoryId?: string | null; wordCount?: number; }
interface Word { _id: string; englishWord: string; uzbekTranslation: string; phonetic?: string; emoji?: string; }
interface Student { _id: string; id?: string; name: string; studentId?: string; email?: string; warningCard?: boolean; }
interface Participant {
    studentId: string;
    customStudentId?: string;
    studentNameSnapshot: string;
    isLate?: boolean;
    status: string;
    questionsAsked: number;
    correctAnswers: number;
    wrongAnswers: number;
    accuracy: number;
}
interface DifficultWord {
    englishWord: string;
    uzbekTranslation: string;
    totalAsked: number;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
}
interface GameResult {
    _id?: string;
    studentId: { _id: string; name: string; studentId?: string; warningCard?: boolean };
    correctCount: number;
    wrongCount: number;
    accuracy: number;
    rank: number;
    warningCard: boolean;
    questionsAsked: number;
    correctWords?: { englishWord: string; uzbekTranslation: string; phonetic?: string }[];
    wrongWords?: { englishWord: string; uzbekTranslation: string; phonetic?: string }[];
}

type Phase = 'setup' | 'game' | 'ceremony' | 'summary' | 'history';

// ─── Confetti Effect ─────────────────────────────────────────────────────────
function Confetti({ trigger }: { trigger: boolean }) {
    if (!trigger) return null;
    const emojis = ['🎉', '✨', '🎊', '⭐', '🔥', '👏', '🥳', '🌟'];
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 16 }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [0, -45, 25], scale: [0.5, 1.2, 1, 0.8] }}
                    transition={{ duration: 1.2, delay: i * 0.04, ease: 'easeOut' }}
                    className="absolute text-2xl select-none"
                    style={{
                        left: `${(i * 6.2) % 90 + 5}%`,
                        top: `${(i * 7.1) % 60 + 15}%`,
                    }}
                >
                    {emojis[i % emojis.length]}
                </motion.div>
            ))}
        </div>
    );
}

function WrongAnim({ trigger }: { trigger: boolean }) {
    if (!trigger) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center animate-ping">
            <div className="text-7xl font-black text-rose-500 drop-shadow-[0_0_35px_rgba(244,63,94,0.8)]">
                ✕
            </div>
        </div>
    );
}

export default function VocabGamePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [phase, setPhase] = useState<Phase>('setup');
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Setup state
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>('');
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [groupMembers, setGroupMembers] = useState<Student[]>([]);
    const [absentStudentIds, setAbsentStudentIds] = useState<string[]>([]);
    const [questionsPerStudent, setQuestionsPerStudent] = useState<number>(6);
    const [timerDuration, setTimerDuration] = useState<number>(10);
    const [noSave, setNoSave] = useState<boolean>(false);
    const [loadingSetup, setLoadingSetup] = useState<boolean>(true);
    const [starting, setStarting] = useState<boolean>(false);

    // Live Game state
    const [sessionId, setSessionId] = useState<string>('');
    const [sessionParticipants, setSessionParticipants] = useState<Participant[]>([]);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [currentWords, setCurrentWords] = useState<Word[]>([]);
    const [currentWordIdx, setCurrentWordIdx] = useState<number>(0);
    const [correctCount, setCorrectCount] = useState<number>(0);
    const [wrongCount, setWrongCount] = useState<number>(0);
    const [studentQuestionAnswers, setStudentQuestionAnswers] = useState<any[]>([]);
    const [studentTotalTimeMs, setStudentTotalTimeMs] = useState<number>(0);
    const [wordStartTime, setWordStartTime] = useState<number>(Date.now());
    const [currentStudentIndex, setCurrentStudentIndex] = useState<number>(0);
    const [totalStudents, setTotalStudents] = useState<number>(0);

    // Announcer turn banner state
    const [showTurnBanner, setShowTurnBanner] = useState<boolean>(false);
    const [turnBannerStudent, setTurnBannerStudent] = useState<Student | null>(null);

    // Add Student during active session modal
    const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
    const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

    // Roster Modal during live game
    const [showRosterModal, setShowRosterModal] = useState<boolean>(false);

    // Timer & Controls
    const [timeLeft, setTimeLeft] = useState<number>(10);
    const [timerActive, setTimerActive] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [showTranslation, setShowTranslation] = useState<boolean>(false);
    const [answeredChoice, setAnsweredChoice] = useState<'correct' | 'wrong' | null>(null);
    const [showCorrect, setShowCorrect] = useState<boolean>(false);
    const [showWrong, setShowWrong] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [showStopModal, setShowStopModal] = useState<boolean>(false);
    const answeringWordIdxRef = useRef<number | null>(null);

    // Summary state
    const [summary, setSummary] = useState<any>(null);
    const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    // Categories & Filter
    const [categoriesTree, setCategoriesTree] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'category' | 'unit'>('category');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [unitSearch, setUnitSearch] = useState<string>('');
    const [unitCategoryFilter, setUnitCategoryFilter] = useState<string>('all');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categoryMap = useMemo(() => {
        const map: Record<string, Unit[]> = {};
        for (const u of units) {
            const cat = u.category || 'Kategoriyasiz';
            if (!map[cat]) map[cat] = [];
            map[cat].push(u);
        }
        return map;
    }, [units]);

    const categoryNames = useMemo(() => {
        return Object.keys(categoryMap).sort((a, b) => {
            if (a === 'Kategoriyasiz') return 1;
            if (b === 'Kategoriyasiz') return -1;
            return a.localeCompare(b);
        });
    }, [categoryMap]);

    useEffect(() => {
        setSoundEnabled(announcer.isEnabled());
    }, []);

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        announcer.setEnabled(next);
        toast.success(next ? 'Ovoz yoqildi 🔊' : 'Ovoz o\'chirildi 🔇');
    };

    const speakWord = useCallback((text: string) => {
        if (!text || !soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text.trim());
            u.lang = 'en-US';
            u.rate = 0.85;
            u.pitch = 1.0;
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const enVoice = voices.find(v => v.lang.startsWith('en') && (!v.name.includes('Google') || v.default));
                if (enVoice) u.voice = enVoice;
            }
            window.speechSynthesis.speak(u);
        } catch {}
    }, [soundEnabled]);

    // Auto-read English word when next words appear (word index > 0)
    useEffect(() => {
        if (phase !== 'game' || !soundEnabled) return;
        // Word index 0 is pronounced automatically immediately after student name finishes!
        if (currentWordIdx === 0) return;

        const activeWord = currentWords[currentWordIdx];
        if (!activeWord?.englishWord) return;

        const timer = setTimeout(() => {
            speakWord(activeWord.englishWord);
        }, 150);

        return () => clearTimeout(timer);
    }, [phase, currentWordIdx, soundEnabled, currentWords, speakWord]);

    // Load initial setup data
    useEffect(() => {
        if (!loading && (!user || (user.role !== 'teacher' && user.role !== 'admin'))) {
            router.push('/login');
            return;
        }
        if (user) loadSetupData();
    }, [user, loading, router]);

    const loadSetupData = async () => {
        setLoadingSetup(true);
        try {
            const [gRes, catRes, uRes] = await Promise.all([
                apiFetch('/api/teacher/groups').catch(() => []),
                apiFetch('/api/teacher/categories/tree').catch(() => []),
                apiFetch('/api/teacher/units').catch(() => apiFetch('/api/units')).catch(() => []),
            ]);

            setCategoriesTree(catRes || []);
            setGroups((gRes || []).filter((g: Group) => g.vocabularyMode !== false));

            const catIdToPathName: Record<string, string> = {};
            function traverse(nodes: any[]) {
                for (const n of nodes) {
                    catIdToPathName[n._id] = n.path || n.name;
                    if (n.children && n.children.length > 0) traverse(n.children);
                }
            }
            if (catRes) traverse(catRes);

            const loadedUnits = (uRes || []).map((u: any) => ({
                id: u._id || u.id,
                title: u.title,
                category: (u.categoryId && catIdToPathName[u.categoryId]) ? catIdToPathName[u.categoryId] : (u.category || 'Kategoriyasiz'),
                categoryId: u.categoryId ?? null,
                wordCount: u.wordCount !== undefined ? u.wordCount : undefined,
            }));
            setUnits(loadedUnits);
        } catch {
            toast.error('Ma\'lumotlarni yuklashda xatolik');
        } finally {
            setLoadingSetup(false);
        }
    };

    // Load group members when selected
    useEffect(() => {
        if (!selectedGroup) {
            setGroupMembers([]);
            setAbsentStudentIds([]);
            return;
        }
        apiFetch(`/api/teacher/groups/${selectedGroup}/members`)
            .then(data => {
                const members = (data || []).map((m: any) => ({
                    _id: m._id || m.id,
                    name: m.name,
                    studentId: m.studentId,
                    email: m.email,
                    warningCard: m.warningCard,
                }));
                setGroupMembers(members);
                setAbsentStudentIds([]);
            })
            .catch(() => {});
    }, [selectedGroup]);

    // Turn Announcement Trigger Helper: first announces student name, then immediately speaks the first word!
    const triggerTurnAnnouncement = useCallback((student: Student, firstWord?: string) => {
        if (announcer.isEnabled()) {
            announcer.announceStudentTurn(student.name, () => {
                if (firstWord) {
                    speakWord(firstWord);
                }
            });
        }
    }, [speakWord]);

    // Start live session
    const handleStartSession = async () => {
        if (!selectedGroup || selectedUnitIds.length === 0) {
            toast.error('Guruh va kamida bitta bo\'lim (unit) tanlang');
            return;
        }
        setStarting(true);
        try {
            const data = await apiFetch('/api/teacher/vocab-game/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    groupId: selectedGroup,
                    unitIds: selectedUnitIds,
                    questionsPerStudent,
                    timerDuration,
                    noSave,
                    absentStudentIds,
                }),
            });

            setSessionId(data.session._id);
            setSessionParticipants(data.session.participants || []);
            setCurrentStudent(data.currentStudent);
            setCurrentWords(data.words || []);
            answeringWordIdxRef.current = null;
            setCurrentWordIdx(0);
            setCorrectCount(0);
            setWrongCount(0);
            setStudentQuestionAnswers([]);
            setStudentTotalTimeMs(0);
            setTotalStudents(data.session.totalStudents);
            setCurrentStudentIndex(0);
            setTimeLeft(timerDuration);
            setTimerActive(true);
            setIsPaused(false);
            setShowTranslation(false);
            setAnsweredChoice(null);
            setWordStartTime(Date.now());
            setPhase('game');

            if (data.currentStudent) {
                const firstWord = (data.words || [])[0]?.englishWord;
                triggerTurnAnnouncement(data.currentStudent, firstWord);
            }
        } catch (err: any) {
            toast.error(err.message || 'Sessiyani boshlashda xatolik');
        } finally {
            setStarting(false);
        }
    };

    // Add student during active session
    const handleAddLateStudent = async (student: Student) => {
        if (!sessionId) return;
        setAddingStudentId(student._id);
        try {
            const res = await apiFetch(`/api/teacher/vocab-game/session/${sessionId}/add-student`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentId: student._id }),
            });

            toast.success(res.message || `${student.name} sessiyaga qo'shildi!`);
            setSessionParticipants(res.session?.participants || []);
            setTotalStudents(res.session?.totalStudents || totalStudents + 1);
            setAbsentStudentIds(prev => prev.filter(id => id !== student._id));
            setShowAddStudentModal(false);
        } catch (err: any) {
            toast.error(err.message || 'O\'quvchini qo\'shishda xatolik');
        } finally {
            setAddingStudentId(null);
        }
    };

    // Timer Tick
    useEffect(() => {
        let interval: any = null;
        if (timerActive && !isPaused && phase === 'game') {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        // Vaqt tugaganda avtomatik xatoga olinmaydi!
                        // Taymer to'xtatiladi va javob tarjimasi ko'rsatiladi.
                        setTimerActive(false);
                        setShowTranslation(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerActive, isPaused, phase]);

    // Handle single question result
    const handleAnswer = (isCorrect: boolean) => {
        if (answeredChoice !== null) return;
        if (answeringWordIdxRef.current === currentWordIdx) return;
        if (currentWordIdx >= questionsPerStudent) return;
        if ((correctCount + wrongCount) >= questionsPerStudent) return;

        answeringWordIdxRef.current = currentWordIdx;
        const choice = isCorrect ? 'correct' : 'wrong';
        setAnsweredChoice(choice);
        setShowTranslation(true);
        setTimerActive(false);
        setIsPaused(false);

        const timeTaken = Date.now() - wordStartTime;
        setStudentTotalTimeMs(prev => prev + timeTaken);

        const activeWord = currentWords[currentWordIdx];
        if (activeWord) {
            setStudentQuestionAnswers(prev => {
                const filtered = prev.filter(qa => qa.wordId !== activeWord._id);
                return [
                    ...filtered,
                    {
                        wordId: activeWord._id,
                        englishWord: activeWord.englishWord,
                        uzbekTranslation: activeWord.uzbekTranslation,
                        phonetic: activeWord.phonetic,
                        emoji: activeWord.emoji,
                        result: choice,
                        responseTimeMs: timeTaken,
                    }
                ];
            });
        }

        if (isCorrect) {
            setShowCorrect(true);
            setCorrectCount(c => Math.min(questionsPerStudent, c + 1));
            playSuccessSound();
            setTimeout(() => setShowCorrect(false), 1200);
        } else {
            setShowWrong(true);
            setWrongCount(w => Math.min(questionsPerStudent, w + 1));
            playWrongSound();
            setTimeout(() => setShowWrong(false), 1200);
        }
    };

    // Next word or finish student
    const handleNextWord = () => {
        answeringWordIdxRef.current = null;
        const next = currentWordIdx + 1;
        if (next >= questionsPerStudent || next >= currentWords.length) {
            finishCurrentStudent(correctCount, wrongCount);
        } else {
            setCurrentWordIdx(next);
            setAnsweredChoice(null);
            setShowTranslation(false);
            setTimeLeft(timerDuration);
            setTimerActive(true);
            setIsPaused(false);
            setWordStartTime(Date.now());
        }
    };

    // Submit finished student
    const finishCurrentStudent = async (finalCorrect: number, finalWrong: number) => {
        const safeCorrect = Math.min(questionsPerStudent, Math.max(0, finalCorrect));
        const safeWrong = Math.min(questionsPerStudent - safeCorrect, Math.max(0, finalWrong));
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/teacher/vocab-game/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    studentId: currentStudent?._id,
                    correctCount: safeCorrect,
                    wrongCount: safeWrong,
                    wordIds: currentWords.map(w => w._id),
                    questionAnswers: studentQuestionAnswers,
                    totalTimeMs: studentTotalTimeMs,
                }),
            });

            if (res.session?.participants) {
                setSessionParticipants(res.session.participants);
            }

            if (res.isFinished) {
                loadSummary(sessionId);
                setPhase('ceremony');
            } else {
                answeringWordIdxRef.current = null;
                setCurrentStudent(res.nextStudent);
                setCurrentWords(res.nextWords || []);
                setCurrentWordIdx(0);
                setCorrectCount(0);
                setWrongCount(0);
                setStudentQuestionAnswers([]);
                setStudentTotalTimeMs(0);
                setCurrentStudentIndex(res.session.currentStudentIndex);
                setTimeLeft(timerDuration);
                setTimerActive(true);
                setIsPaused(false);
                setShowTranslation(false);
                setAnsweredChoice(null);
                setWordStartTime(Date.now());

                if (res.nextStudent) {
                    const firstWord = (res.nextWords || [])[0]?.englishWord;
                    triggerTurnAnnouncement(res.nextStudent, firstWord);
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    const loadSummary = async (sid: string) => {
        setLoadingSummary(true);
        try {
            const data = await apiFetch(`/api/teacher/vocab-game/summary/${sid}`);
            setSummary(data);
            if (data?.session?.groupId?.telegramChatId) {
                setTelegramChatId(data.session.groupId.telegramChatId);
            }
            if (data?.telegramMessage) {
                setTelegramEditableText(data.telegramMessage);
            }
        } catch {
            toast.error('Xulosa yuklanmadi');
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleSendTelegram = async () => {
        if (!summary) return;
        if (!telegramChatId.trim()) {
            toast.error('Iltimos, Telegram guruh ID raqamini kiriting');
            return;
        }

        const raw = telegramChatId.trim();
        let normalized = raw;
        if (raw && !raw.startsWith('@')) {
            const cleaned = raw.replace(/\s+/g, '');
            if (cleaned.startsWith('100') && cleaned.length >= 12) normalized = '-' + cleaned;
            else if (/^\d{9,13}$/.test(cleaned)) normalized = `-100${cleaned}`;
            else if (/^-\d{9,13}$/.test(cleaned) && !cleaned.startsWith('-100')) normalized = `-100${cleaned.slice(1)}`;
            else normalized = cleaned;
        }

        setSendingTelegram(true);
        const toastId = toast.loading('Telegramga yuborilmoqda...');

        try {
            let imageBase64: string | undefined = undefined;

            if (telegramSendType === 'image' || telegramSendType === 'both') {
                const canvas = generateSummaryCanvas();
                if (canvas) {
                    imageBase64 = canvas.toDataURL('image/png');
                }
            }

            const payload: any = {
                sessionId: summary.session?._id,
                groupId: summary.session?.groupId?._id || summary.session?.groupId?.id,
                overrideChatId: normalized,
                sendType: telegramSendType,
                text: telegramEditableText,
            };

            if (imageBase64) {
                payload.imageBase64 = imageBase64;
            }

            const res = await apiFetch('/api/telegram/send-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res?.success) {
                toast.success('Telegramga muvaffaqiyatli yuborildi!', { id: toastId });
                setShowTelegramModal(false);
            } else {
                toast.error(res?.message || 'Telegramga yuborishda xatolik', { id: toastId });
            }
        } catch (err: any) {
            console.error('Telegram send error:', err);
            toast.error(err.message || 'Telegramga yuborishda xatolik', { id: toastId });
        } finally {
            setSendingTelegram(false);
        }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await apiFetch('/api/teacher/vocab-game/session');
            setHistory(data || []);
        } catch {
            toast.error('Tarix yuklanmadi');
        } finally {
            setLoadingHistory(false);
        }
    };

    const [editingResultId, setEditingResultId] = useState<string | null>(null);
    const [editCorrect, setEditCorrect] = useState<number>(0);
    const [editTotal, setEditTotal] = useState<number>(6);
    const [savingEdit, setSavingEdit] = useState<boolean>(false);
    const [exportingImage, setExportingImage] = useState<boolean>(false);
    const summaryRef = useRef<HTMLDivElement>(null);

    // Telegram Modal State
    const [showTelegramModal, setShowTelegramModal] = useState<boolean>(false);
    const [telegramChatId, setTelegramChatId] = useState<string>('');
    const [telegramSendType, setTelegramSendType] = useState<'both' | 'image' | 'text'>('both');
    const [telegramEditableText, setTelegramEditableText] = useState<string>('');
    const [sendingTelegram, setSendingTelegram] = useState<boolean>(false);

    const handleSaveStudentScore = async (resultId: string) => {
        setSavingEdit(true);
        try {
            const res = await apiFetch(`/api/teacher/vocab-game/result/${resultId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    correctCount: editCorrect,
                    questionsAsked: editTotal,
                }),
            });

            if (res?.success) {
                toast.success('Natija muvaffaqiyatli yangilandi!');
                setEditingResultId(null);
                // Reload summary to recalculate all stats live
                if (sessionId) {
                    await loadSummary(sessionId);
                }
            } else {
                toast.error(res?.message || 'Saqlashda xatolik');
            }
        } catch (err: any) {
            toast.error(err.message || 'Xatolik yuz berdi');
        } finally {
            setSavingEdit(false);
        }
    };

    const [togglingWordKey, setTogglingWordKey] = useState<string | null>(null);

    const handleToggleWord = async (resultId: string, englishWord: string, currentStatus: 'correct' | 'wrong') => {
        const key = `${resultId}_${englishWord}`;
        setTogglingWordKey(key);
        const newStatus = currentStatus === 'correct' ? 'wrong' : 'correct';
        try {
            const res = await apiFetch(`/api/teacher/vocab-game/result/${resultId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    toggleWord: englishWord,
                    newResult: newStatus,
                }),
            });

            if (res?.success) {
                toast.success(`"${englishWord}" ${newStatus === 'correct' ? "TO'G'RI" : "NOTO'G'RI"} ga o'zgartirildi!`);
                if (sessionId) {
                    await loadSummary(sessionId);
                }
            } else {
                toast.error(res?.message || 'Xatolik yuz berdi');
            }
        } catch (err: any) {
            toast.error(err.message || 'Xatolik yuz berdi');
        } finally {
            setTogglingWordKey(null);
        }
    };

    // Helper to generate the native 2D canvas for the summary
    const generateSummaryCanvas = (): HTMLCanvasElement | null => {
        if (!summary) return null;
        const results: GameResult[] = summary.results || [];
        const stats = summary.stats;
        const groupName = summary.session?.groupId?.name || 'Guruh';
        const dateStr = new Date(summary.session?.createdAt || Date.now()).toLocaleDateString('uz-UZ');

        const width = 1200;
        const colW = 525; // (1100 - 50) / 2
        const maxInnerW = colW - 28; // padding inside sub-card

        // Helper interface and layout measuring function
        interface CanvasChip {
            text: string;
            w: number;
            type: 'correct' | 'wrong' | 'empty';
        }

        const measureCanvasChips = (
            words: string[],
            type: 'correct' | 'wrong',
            maxW: number
        ): { rows: CanvasChip[][]; height: number } => {
            const prefix = type === 'correct' ? '✓' : '✕';
            if (!words || words.length === 0) {
                const emptyText = type === 'correct' ? "To'g'ri so'z yo'q" : "🎉 Barcha so'zlar to'g'ri (A'lo!)";
                const estW = Math.round(emptyText.length * 7.5) + 24;
                return {
                    rows: [[{ text: emptyText, w: estW, type: 'empty' }]],
                    height: 30,
                };
            }

            const rows: CanvasChip[][] = [];
            let currentRow: CanvasChip[] = [];
            let currentX = 0;

            words.forEach(word => {
                const displayText = `${prefix}  ${word}`;
                const chipW = Math.max(68, Math.round(displayText.length * 7.5) + 24);
                if (currentRow.length > 0 && currentX + chipW > maxW) {
                    rows.push(currentRow);
                    currentRow = [];
                    currentX = 0;
                }
                currentRow.push({ text: displayText, w: chipW, type });
                currentX += chipW + 8;
            });

            if (currentRow.length > 0) {
                rows.push(currentRow);
            }

            const chipH = 28;
            const gapY = 8;
            const totalHeight = rows.length * chipH + Math.max(0, rows.length - 1) * gapY;
            return { rows, height: totalHeight };
        };

        // 1. Calculate student card layouts & dynamic total canvas height
        const studentLayouts = results.map(r => {
            const cWords = (r.correctWords || []).map(w => w.englishWord);
            const wWords = (r.wrongWords || []).map(w => w.englishWord);
            const cLayout = measureCanvasChips(cWords, 'correct', maxInnerW);
            const wLayout = measureCanvasChips(wWords, 'wrong', maxInnerW);
            const contentBoxH = Math.max(cLayout.height, wLayout.height) + 24; // 12px top/bottom padding
            const cardH = 62 + 24 + contentBoxH + 16; // Header (62px) + Labels (24px) + Boxes + Bottom padding
            return { r, cWords, wWords, cLayout, wLayout, contentBoxH, cardH };
        });

        let calculatedHeight = 180; // Header
        if (stats) calculatedHeight += 95; // Stats cards
        if (summary.difficultWords && summary.difficultWords.length > 0) {
            calculatedHeight += 160;
        }
        calculatedHeight += 35; // Section title

        studentLayouts.forEach(sl => {
            calculatedHeight += sl.cardH + 16; // Card + gap
        });
        calculatedHeight += 70; // Footer

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.max(800, calculatedHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. Background Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, width, canvas.height);
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(0.5, '#0d1322');
        bgGrad.addColorStop(1, '#06080e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, canvas.height);

        // Subtle outer border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, canvas.height - 20);

        let y = 50;

        // 2. Header
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('MT-VOCAB LIVE VOCABULARY REPORT', 50, y);

        y += 36;
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 32px sans-serif';
        ctx.fillText(`🏆 ${groupName} — Lug'at Sessiyasi Natijalari`, 50, y);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Sana: ${dateStr}   •   Qatnashuvchilar: ${results.length} ta o'quvchi`, 50, y + 25);

        y += 65;

        // 3. Stats Bar
        if (stats) {
            const statBoxes = [
                { label: "O'QUVCHILAR", val: `${stats.totalStudents}`, color: '#ffffff' },
                { label: "JAMI SAVOLLAR", val: `${stats.totalQuestions}`, color: '#ffffff' },
                { label: "TO'G'RI / XATO", val: `${stats.totalCorrect} / ${stats.totalWrong}`, color: '#10b981' },
                { label: "UMUMIY ANIKLIK", val: `${stats.avgAccuracy}%`, color: '#818cf8' },
            ];
            const boxW = (width - 100 - (statBoxes.length - 1) * 16) / statBoxes.length;

            statBoxes.forEach((sb, idx) => {
                const bx = 50 + idx * (boxW + 16);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.beginPath();
                ctx.roundRect(bx, y, boxW, 70, 12);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.stroke();

                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(sb.label, bx + 16, y + 25);

                ctx.fillStyle = sb.color;
                ctx.font = 'bold 22px sans-serif';
                ctx.fillText(sb.val, bx + 16, y + 54);
            });

            y += 95;
        }

        // 4. Difficult Words Section
        if (summary.difficultWords && summary.difficultWords.length > 0) {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
            ctx.beginPath();
            ctx.roundRect(50, y, width - 100, 120, 14);
            ctx.fill();
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.2)';
            ctx.stroke();

            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('⚠ ENG KO\'P QIYINCHILIK TUG\'DIRGAN SO\'ZLAR', 70, y + 30);

            const wordsToDraw = summary.difficultWords.slice(0, 6);
            let chipX = 70;
            const chipY = y + 50;

            wordsToDraw.forEach((dw: any) => {
                const text = `${dw.englishWord} (${dw.failCount}x xato)`;
                ctx.font = 'bold 12px sans-serif';
                const chipW = ctx.measureText(text).width + 24;

                ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
                ctx.beginPath();
                ctx.roundRect(chipX, chipY, chipW, 32, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
                ctx.stroke();

                ctx.fillStyle = '#fda4af';
                ctx.fillText(text, chipX + 12, chipY + 20);

                chipX += chipW + 12;
            });

            y += 145;
        }

        // 5. Students Section Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText("O'quvchilar Ko'rsatkichi va Lug'at Tahlili", 50, y);
        y += 32;

        // 6. Draw each student card
        studentLayouts.forEach((sl, idx) => {
            const { r, cWords, wWords, cLayout, wLayout, contentBoxH, cardH } = sl;
            const stName = r.studentId?.name || "Noma'lum";
            const stCode = r.studentId?.studentId || "";
            const correct = r.correctCount || 0;
            const asked = r.questionsAsked || 0;
            const acc = r.accuracy || 0;

            // Outer Student Card Container
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.beginPath();
            ctx.roundRect(50, y, width - 100, cardH, 16);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Rank Badge (Left)
            const isTop3 = idx < 3;
            ctx.fillStyle = isTop3 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(99, 102, 241, 0.15)';
            ctx.beginPath();
            ctx.roundRect(65, y + 14, 34, 34, 9);
            ctx.fill();
            ctx.strokeStyle = isTop3 ? 'rgba(234, 179, 8, 0.35)' : 'rgba(99, 102, 241, 0.3)';
            ctx.stroke();

            ctx.fillStyle = isTop3 ? '#fde047' : '#a5b4fc';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`${idx + 1}`, idx + 1 < 10 ? 77 : 72, y + 36);

            // Student Name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 17px sans-serif';
            ctx.fillText(stName, 112, y + 37);

            // Student ID Tag
            let nameEnd = 112 + ctx.measureText(stName).width;
            if (stCode) {
                const nameW = ctx.measureText(stName).width;
                const idText = `ID: ${stCode}`;
                ctx.font = 'bold 11px monospace';
                const idW = ctx.measureText(idText).width + 16;
                const idX = 112 + nameW + 12;

                ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
                ctx.beginPath();
                ctx.roundRect(idX, y + 20, idW, 22, 6);
                ctx.fill();
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
                ctx.stroke();

                ctx.fillStyle = '#818cf8';
                ctx.fillText(idText, idX + 8, y + 35);
                nameEnd = idX + idW;
            }

            // Accuracy Pill Badge & Analytic Progress Bar (Right)
            // Color tiers: 80%+ Green (Yashil), 50-79% Yellow (Sariq), <50% Red (Qizil)
            const isHigh = acc >= 80;
            const isMid = acc >= 50;
            const badgeBg = isHigh ? 'rgba(16, 185, 129, 0.16)' : isMid ? 'rgba(234, 179, 8, 0.16)' : 'rgba(239, 68, 68, 0.16)';
            const badgeBorder = isHigh ? 'rgba(16, 185, 129, 0.45)' : isMid ? 'rgba(234, 179, 8, 0.45)' : 'rgba(239, 68, 68, 0.45)';
            const badgeTextCol = isHigh ? '#34d399' : isMid ? '#fde047' : '#fca5a5';

            const scoreBadgeText = `${correct}/${asked}  •  ${acc}%`;
            ctx.font = 'bold 13px sans-serif';
            const scoreBadgeW = ctx.measureText(scoreBadgeText).width + 24;
            const scoreBadgeX = width - 65 - scoreBadgeW;

            // Score Pill Badge
            ctx.fillStyle = badgeBg;
            ctx.beginPath();
            ctx.roundRect(scoreBadgeX, y + 15, scoreBadgeW, 30, 8);
            ctx.fill();
            ctx.strokeStyle = badgeBorder;
            ctx.stroke();

            ctx.fillStyle = badgeTextCol;
            ctx.fillText(scoreBadgeText, scoreBadgeX + 12, y + 35);

            // Analytic Progress Bar (between student name/ID and score badge)
            const availableBarSpace = scoreBadgeX - nameEnd - 30;
            if (availableBarSpace >= 60) {
                const barW = Math.max(80, Math.min(260, availableBarSpace));
                const barX = scoreBadgeX - 18 - barW;
                const barY = y + 26;
                const barH = 8;

                // Track (dark sleek background with rounded corners)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barW, barH, 4);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
                ctx.stroke();

                // Filled analytic progress
                const fillW = Math.max(0, Math.min(barW, Math.round((barW * acc) / 100)));
                if (fillW > 0) {
                    const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
                    if (isHigh) {
                        barGrad.addColorStop(0, '#059669');
                        barGrad.addColorStop(1, '#34d399');
                    } else if (isMid) {
                        barGrad.addColorStop(0, '#d97706');
                        barGrad.addColorStop(1, '#fde047');
                    } else {
                        barGrad.addColorStop(0, '#b91c1c');
                        barGrad.addColorStop(1, '#f87171');
                    }
                    ctx.fillStyle = barGrad;
                    ctx.beginPath();
                    ctx.roundRect(barX, barY, fillW, barH, 4);
                    ctx.fill();
                }
            }

            // Divider inside card
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.beginPath();
            ctx.moveTo(65, y + 58);
            ctx.lineTo(width - 65, y + 58);
            ctx.stroke();

            // ── Two Columns (Left: To'g'ri, Right: Xatolar) ──
            const col1X = 65;
            const col2X = 65 + colW + 20; // 610
            const labelsY = y + 78;
            const boxesY = y + 88;

            // Column 1 Label: Correct Words
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`✓ TO'G'RI TOPILGAN SO'ZLAR (${cWords.length})`, col1X, labelsY);

            // Column 2 Label: Wrong Words
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`✕ MASHQ QILISH KERAK / XATOLAR (${wWords.length})`, col2X, labelsY);

            // Box 1 (Correct) Container
            ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
            ctx.beginPath();
            ctx.roundRect(col1X, boxesY, colW, contentBoxH, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.18)';
            ctx.stroke();

            // Box 2 (Wrong) Container
            ctx.fillStyle = 'rgba(244, 63, 94, 0.04)';
            ctx.beginPath();
            ctx.roundRect(col2X, boxesY, colW, contentBoxH, 10);
            ctx.fill();
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.18)';
            ctx.stroke();

            // Render Correct Chips
            let curChipY = boxesY + 12;
            ctx.font = 'bold 12px sans-serif';
            cLayout.rows.forEach(row => {
                let curChipX = col1X + 12;
                row.forEach(chip => {
                    const textW = ctx.measureText(chip.text).width;
                    const finalChipW = Math.max(chip.w, textW + 20);

                    if (chip.type === 'empty') {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                        ctx.beginPath();
                        ctx.roundRect(curChipX, curChipY, finalChipW, 28, 7);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                        ctx.stroke();

                        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                        ctx.fillText(chip.text, curChipX + 10, curChipY + 18);
                    } else {
                        // High-style Emerald Pill Badge
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                        ctx.beginPath();
                        ctx.roundRect(curChipX, curChipY, finalChipW, 28, 7);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
                        ctx.stroke();

                        ctx.fillStyle = '#6ee7b7';
                        ctx.fillText(chip.text, curChipX + 10, curChipY + 18);
                    }
                    curChipX += finalChipW + 8;
                });
                curChipY += 28 + 8;
            });

            // Render Wrong Chips
            curChipY = boxesY + 12;
            wLayout.rows.forEach(row => {
                let curChipX = col2X + 12;
                row.forEach(chip => {
                    const textW = ctx.measureText(chip.text).width;
                    const finalChipW = Math.max(chip.w, textW + 20);

                    if (chip.type === 'empty') {
                        // All correct celebration pill
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                        ctx.beginPath();
                        ctx.roundRect(curChipX, curChipY, finalChipW, 28, 7);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
                        ctx.stroke();

                        ctx.fillStyle = '#34d399';
                        ctx.fillText(chip.text, curChipX + 10, curChipY + 18);
                    } else {
                        // High-style Rose/Coral Pill Badge
                        ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
                        ctx.beginPath();
                        ctx.roundRect(curChipX, curChipY, finalChipW, 28, 7);
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
                        ctx.stroke();

                        ctx.fillStyle = '#fda4af';
                        ctx.fillText(chip.text, curChipX + 10, curChipY + 18);
                    }
                    curChipX += finalChipW + 8;
                });
                curChipY += 28 + 8;
            });

            y += cardH + 16;
        });

        // 7. Footer brand mark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '12px sans-serif';
        ctx.fillText('MT-Vocab Learning System • Avtomatik Hisobot', 50, y + 25);

        return canvas;
    };

    const exportSummaryImage = async () => {
        if (!summary) {
            toast.error('Hisobot topilmadi');
            return;
        }
        setExportingImage(true);
        const toastId = toast.loading('Rasm tayyorlanmoqda...');

        try {
            const canvas = generateSummaryCanvas();
            if (!canvas) throw new Error('Canvas context not supported');

            const groupName = summary.session?.groupId?.name || 'Guruh';
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const dateFileStr = new Date().toISOString().slice(0, 10);
            link.download = `lugat-natijalari-${groupName}-${dateFileStr}.png`;
            link.href = imgData;
            link.click();

            toast.success('Rasm muvaffaqiyatli saqlandi!', { id: toastId });
        } catch (err: any) {
            console.error('Canvas export error:', err);
            toast.error('Rasmni saqlashda xatolik: ' + (err.message || ''), { id: toastId });
        } finally {
            setExportingImage(false);
        }
    };

    const copyTelegram = () => {
        if (!summary?.telegramMessage) return;
        navigator.clipboard.writeText(summary.telegramMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Telegram hisoboti nusxalandi!');
    };

    // Keyboard shortcuts for live game:
    // > or ArrowRight: True (or Next if already answered)
    // < or ArrowLeft: False (Wrong)
    // ArrowUp: Stop time (Pause)
    // ArrowDown: Start time (Resume)
    // Space / Enter: Next or toggle pause
    useEffect(() => {
        if (phase !== 'game') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            if (showRosterModal || showAddStudentModal || showStopModal) return;
            const target = e.target as HTMLElement;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            if (e.key === 'ArrowRight' || e.key === '>' || e.key === '.') {
                e.preventDefault();
                if (answeredChoice === null) {
                    handleAnswer(true);
                } else {
                    handleNextWord();
                }
            } else if (e.key === 'ArrowLeft' || e.key === '<' || e.key === ',') {
                e.preventDefault();
                if (answeredChoice === null) {
                    handleAnswer(false);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIsPaused(true);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIsPaused(false);
            } else if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                if (answeredChoice !== null) {
                    handleNextWord();
                } else {
                    setIsPaused(p => !p);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        phase,
        answeredChoice,
        showRosterModal,
        showAddStudentModal,
        showStopModal,
        currentWordIdx,
        questionsPerStudent,
        currentWords,
        correctCount,
        wrongCount,
        timerDuration
    ]);

    // ─── SETUP PHASE (MATCHING IMAGE 1) ──────────────────────────────────────
    if (phase === 'setup') {
        const canStart = selectedGroup && selectedUnitIds.length > 0 && !starting;

        return (
            <div className="w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-6 px-3 animate-fade-in">
                <div className="w-full max-w-2xl mx-auto self-center flex flex-col gap-4 my-auto">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">🎯</div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                                    Lug'at O'yini
                                </h1>
                                <p className="text-xs text-white/50 font-medium">
                                    O'qituvchi boshqaradigan live lug'at sessiyasi
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => { setPhase('history'); loadHistory(); }}
                            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                            <BarChart3 className="w-3.5 h-3.5 text-white/60" />
                            <span>Tarix</span>
                        </button>
                    </div>

                    {/* ── Main Settings Card (Sessiyani sozlash) ── */}
                    <div className="p-6 sm:p-7 rounded-3xl border border-white/10 bg-[#0c1220]/90 backdrop-blur-xl shadow-2xl flex flex-col gap-5">
                        <h2 className="text-lg font-black text-white">
                            Sessiyani sozlash
                        </h2>

                        {/* Guruh Tanlash */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
                                GURUH
                            </label>
                            <select
                                value={selectedGroup}
                                onChange={e => setSelectedGroup(e.target.value)}
                                className="w-full rounded-2xl px-4 py-3.5 bg-white/5 border border-white/10 text-white font-bold outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                            >
                                <option value="" className="bg-gray-900">— Guruh tanlang —</option>
                                {groups.map(g => (
                                    <option key={g._id || g.id} value={g._id || g.id} className="bg-gray-900">
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* O'quvchilar Davomati (Keldi / Kelmadi) */}
                        {selectedGroup && groupMembers.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-white/40">
                                        O'QUVCHILAR DAVOMATI ({groupMembers.length - absentStudentIds.length} / {groupMembers.length} TA QATNASHADI)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAbsentStudentIds([])}
                                            className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                                        >
                                            Hammasi keldi
                                        </button>
                                        <span className="text-white/20">•</span>
                                        <button
                                            type="button"
                                            onClick={() => setAbsentStudentIds(groupMembers.map(m => m._id))}
                                            className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                                        >
                                            Hech kim kelmadi
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 max-h-52 overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {groupMembers.map((st, idx) => {
                                            const isAbsent = absentStudentIds.includes(st._id);
                                            return (
                                                <button
                                                    key={st._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setAbsentStudentIds(prev =>
                                                            prev.includes(st._id)
                                                                ? prev.filter(id => id !== st._id)
                                                                : [...prev, st._id]
                                                        );
                                                    }}
                                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                        isAbsent
                                                            ? 'bg-rose-500/10 border-rose-500/25 text-rose-300 opacity-60'
                                                            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0 pr-1">
                                                        <span className="text-[10px] font-mono opacity-50">{idx + 1}.</span>
                                                        <span className="text-xs font-bold truncate">{st.name}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                                                        isAbsent
                                                            ? 'bg-rose-500/20 text-rose-400'
                                                            : 'bg-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                        {isAbsent ? '✕ Kelmadi' : '✓ Keldi'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Lug'at Bo'limlari */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/40">
                                LUG'AT BO'LIMLARI ({selectedUnitIds.length} TA TANLANDI)
                            </label>
                            {activeCategory && (
                                <button
                                    type="button"
                                    onClick={() => setActiveCategory(null)}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-3 h-3" /> Orqaga
                                </button>
                            )}
                        </div>

                        {/* Category & Unit Browser Container */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                            {!activeCategory ? (
                                /* Categories List View (Image 1) */
                                <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-white/5">
                                    {categoryNames.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-white/40 font-bold">
                                            Bo'limlar mavjud emas
                                        </div>
                                    ) : (
                                        categoryNames.map(cat => {
                                            const catUnits = categoryMap[cat] || [];
                                            const selectedInCat = catUnits.filter(u => selectedUnitIds.includes(u.id)).length;

                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setActiveCategory(cat)}
                                                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/[0.04] transition-all text-left group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <div className="w-9 h-9 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center shrink-0">
                                                            <BookOpen className="w-4 h-4 text-indigo-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
                                                                {cat}
                                                            </p>
                                                            <p className="text-[11px] font-medium text-white/40">
                                                                {catUnits.length} bo'lim
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {selectedInCat > 0 && (
                                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono">
                                                                {selectedInCat} tanlandi
                                                            </span>
                                                        )}
                                                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                /* Units List Inside Category */
                                <div className="p-3 space-y-2">
                                    <div className="flex items-center justify-between pb-2 border-b border-white/5 px-1">
                                        <span className="text-xs font-black text-white truncate">
                                            {activeCategory}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const catUnits = categoryMap[activeCategory] || [];
                                                    const ids = catUnits.map(u => u.id);
                                                    setSelectedUnitIds(prev => Array.from(new Set([...prev, ...ids])));
                                                }}
                                                className="text-[11px] font-bold text-indigo-400 hover:underline"
                                            >
                                                Hammasi
                                            </button>
                                            <span className="text-white/20">•</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const catUnits = categoryMap[activeCategory] || [];
                                                    const ids = catUnits.map(u => u.id);
                                                    setSelectedUnitIds(prev => prev.filter(id => !ids.includes(id)));
                                                }}
                                                className="text-[11px] font-bold text-rose-400 hover:underline"
                                            >
                                                Bekor
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                        {(categoryMap[activeCategory] || []).map(u => {
                                            const isSelected = selectedUnitIds.includes(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedUnitIds(prev =>
                                                            isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                        );
                                                    }}
                                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left border ${
                                                        isSelected
                                                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                                                            : 'bg-white/5 border-white/5 hover:border-white/10 text-white/70 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 border ${
                                                            isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 bg-white/5'
                                                        }`}>
                                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <span className="text-xs font-bold truncate">{u.title}</span>
                                                    </div>
                                                    {u.wordCount !== undefined && (
                                                        <span className="text-[10px] font-mono text-white/40 shrink-0">
                                                            {u.wordCount} ta so'z
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Har bir o'quvchiga savol soni */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
                            HAR BIR O'QUVCHIGA SAVOL SONI: <span className="text-indigo-400 font-mono font-bold">{questionsPerStudent}</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                            {[3, 5, 6, 8, 10, 12].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setQuestionsPerStudent(n)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                                        questionsPerStudent === n
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Har bir so'z uchun vaqt */}
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-white/40 mb-2">
                            HAR BIR SO'Z UCHUN VAQT: <span className="text-indigo-400 font-mono font-bold">{timerDuration} SEK</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                            {[5, 10, 15, 20, 25].map(sec => (
                                <button
                                    key={sec}
                                    type="button"
                                    onClick={() => setTimerDuration(sec)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                                        timerDuration === sec
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {sec}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tarix saqlanmasin (No-Save Rejimi) */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🚫</span>
                            <div>
                                <p className="text-xs font-bold text-white">Tarix saqlanmasin (No-Save Rejimi)</p>
                                <p className="text-[10px] text-white/40 font-medium">Natijalar saqlanmaydi va reyting o'zgarmaydi</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNoSave(!noSave)}
                            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                noSave ? 'bg-indigo-600' : 'bg-white/10'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                noSave ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    {/* Start Button (Golden / Amber gradient as in Image 1) */}
                    <button
                        type="button"
                        onClick={handleStartSession}
                        disabled={starting || !selectedGroup || selectedUnitIds.length === 0}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-950 font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer mt-1"
                    >
                        {starting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Yuklanmoqda...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Sessiyani Boshlash</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

    // ─── GAME PHASE (MATCHING IMAGE 2) ────────────────────────────────────────
    if (phase === 'game') {
        const activeWord = currentWords[currentWordIdx];
        const activeStudentsCount = sessionParticipants.filter(p => p.status !== 'absent').length || totalStudents || 1;
        const currentStudentProgressNumber = Math.min(currentStudentIndex + 1, activeStudentsCount);

        // Session-wide totals
        const totalCorrectSession = sessionParticipants.reduce(
            (sum, p) => (p.studentId === currentStudent?._id ? sum : sum + (p.correctAnswers || 0)),
            0
        ) + correctCount;
        const totalWrongSession = sessionParticipants.reduce(
            (sum, p) => (p.studentId === currentStudent?._id ? sum : sum + (p.wrongAnswers || 0)),
            0
        ) + wrongCount;
        const totalAnswered = totalCorrectSession + totalWrongSession;
        const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrectSession / totalAnswered) * 100) : 0;

        // Current student specific totals
        const studentAnswered = correctCount + wrongCount;
        const studentAccuracy = studentAnswered > 0 ? Math.round((correctCount / studentAnswered) * 100) : 0;

        const unjoinedMembers = groupMembers.filter(
            m => !sessionParticipants.some(p => p.studentId === m._id)
        );

        return (
            <div className="w-full min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-4 px-2 sm:px-4 animate-fade-in relative">
                <div className="w-full max-w-5xl mx-auto self-center flex flex-col gap-4 my-auto">
                    <Confetti trigger={showCorrect} />
                    <WrongAnim trigger={showWrong} />

                {/* ── Top Bar: Orqaga + Sinf Ro'yxati + Kelgan O'quvchini Qo'shish ── */}
                <div className="flex items-center justify-between gap-2 px-1">
                    <button
                        type="button"
                        onClick={() => { setIsPaused(true); setShowStopModal(true); }}
                        className="text-xs sm:text-sm font-bold text-white/70 hover:text-white flex items-center gap-1.5 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Orqaga (Sessiyani yakunlash)</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowRosterModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                            <Users className="w-4 h-4 text-indigo-400" />
                            <span>Sinf Ro'yxati</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAddStudentModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Kelgan o'quvchini qo'shish</span>
                        </button>

                        <button
                            type="button"
                            onClick={toggleSound}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                            title={soundEnabled ? 'Ovozni o\'chirish' : 'Ovozni yoqish'}
                        >
                            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
                        </button>
                    </div>
                </div>

                {/* ── Main Game Card (Matching media_1789147643551.png) ── */}
                <div className="w-full rounded-3xl border border-white/10 bg-[#070b16] relative overflow-hidden shadow-2xl p-6 sm:p-10 flex flex-col justify-between min-h-[460px]">
                    {/* Geometric Golden Watermark Background */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 select-none overflow-hidden">
                        <svg className="w-[520px] h-[520px] text-amber-500/30" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <polygon points="60,20 140,20 180,60 180,140 140,180 60,180 20,140 20,60" />
                            <polygon points="70,30 130,30 170,70 170,130 130,170 70,170 30,130 30,70" strokeWidth="1" strokeDasharray="3 3" />
                            <rect x="55" y="55" width="90" height="90" rx="10" strokeWidth="1.2" />
                            <circle cx="100" cy="100" r="35" strokeWidth="1" />
                            <circle cx="100" cy="100" r="15" strokeWidth="0.8" />
                            <line x1="20" y1="20" x2="180" y2="180" strokeWidth="0.7" opacity="0.6" />
                            <line x1="180" y1="20" x2="20" y2="180" strokeWidth="0.7" opacity="0.6" />
                        </svg>
                    </div>

                    {/* Top Row: Current Student (Left) & Live Scores (Right) */}
                    <div className="flex items-start justify-between w-full z-10">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40 border border-indigo-400/30 shrink-0">
                                {currentStudent?.name?.charAt(0).toUpperCase() || 'M'}
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    {currentStudent?.name || 'O\'quvchi'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 font-black text-[10px] tracking-wider uppercase">
                                        O'QUVCHI
                                    </span>
                                    {currentStudent?.warningCard && (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                            <span>⚠️</span> Ogohlantirish bor
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-black text-xs sm:text-sm">
                                <Check className="w-4 h-4" />
                                <span>{correctCount} TO'G'RI</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-400 font-black text-xs sm:text-sm">
                                <X className="w-4 h-4" />
                                <span>{wrongCount} NOTO'G'RI</span>
                            </div>
                        </div>
                    </div>

                    {/* Center: Timer + Word + Phonetic + Reveal Button */}
                    <div className="flex flex-col items-center justify-center text-center my-6 z-10 w-full">
                        {/* Circular Timer with Vaqtni to'xtatish below */}
                        <div className="flex flex-col items-center">
                            <div className="relative flex items-center justify-center w-[90px] h-[90px] sm:w-[110px] sm:h-[110px]">
                                <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="42"
                                        fill="none"
                                        stroke={isPaused ? '#f59e0b' : timeLeft <= 3 ? '#ef4444' : '#6366f1'}
                                        strokeWidth="6"
                                        strokeDasharray={`${2 * Math.PI * 42 * (timerDuration > 0 ? timeLeft / timerDuration : 0)} ${2 * Math.PI * 42}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
                                    />
                                </svg>
                                <div className="text-center z-10 flex flex-col items-center justify-center">
                                    <span className="text-3xl sm:text-4xl font-black text-white leading-none tabular-nums">
                                        {timeLeft}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-white/50 mt-0.5">
                                        {isPaused ? 'PAUZA' : 'SEC'}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (timeLeft === 0) {
                                        setTimeLeft(timerDuration);
                                        setTimerActive(true);
                                        setIsPaused(false);
                                    } else {
                                        setIsPaused(p => !p);
                                    }
                                }}
                                className="text-[11px] font-bold text-white/60 hover:text-white flex items-center gap-1 mt-1 cursor-pointer transition-colors"
                            >
                                {timeLeft === 0 ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 text-amber-400" />
                                        <span>+Vaqt berish</span>
                                    </>
                                ) : isPaused ? (
                                    <>
                                        <Play className="w-3 h-3 text-amber-400 fill-current" />
                                        <span>Davom ettirish</span>
                                    </>
                                ) : (
                                    <>
                                        <Pause className="w-3 h-3 fill-current" />
                                        <span>Vaqtni to'xtatish</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Large English Word + Speaker Pronounce */}
                        <div className="mt-5 flex items-center justify-center gap-3">
                            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tight uppercase drop-shadow-2xl">
                                {activeWord?.englishWord || '...'}
                            </h1>
                            {activeWord?.englishWord && (
                                <button
                                    type="button"
                                    onClick={() => speakWord(activeWord.englishWord)}
                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
                                    title="Talaffuzni eshitish"
                                >
                                    <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
                                </button>
                            )}
                        </div>

                        {/* Phonetic / Subtitle */}
                        <p className="text-sm sm:text-base font-mono text-white/40 mt-1">
                            {activeWord?.phonetic ? `[${activeWord.phonetic}]` : activeWord?.englishWord?.toLowerCase()}
                        </p>

                        {/* Javobni ko'rsatish toggle */}
                        <div className="mt-3 min-h-[40px] flex items-center justify-center">
                            {showTranslation ? (
                                <p className="text-xl sm:text-3xl font-black text-amber-300 animate-fade-in tracking-wide">
                                    {activeWord?.uzbekTranslation}
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowTranslation(true)}
                                    className="text-xs font-bold text-white/50 hover:text-white/90 flex items-center gap-1.5 py-1.5 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Javobni ko'rsatish</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Action Controls: 3 Buttons (Noto'g'ri | Vaqtni to'xtatish | To'g'ri) */}
                    <div className="w-full z-10 pt-2">
                        {answeredChoice === null ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={() => handleAnswer(false)}
                                    disabled={submitting}
                                    className="py-3.5 sm:py-4 px-4 rounded-2xl font-black text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/60 shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer active:scale-95"
                                >
                                    <X className="w-5 h-5 text-rose-400" />
                                    <span>Noto'g'ri</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (timeLeft === 0) {
                                            setTimeLeft(timerDuration);
                                            setTimerActive(true);
                                            setIsPaused(false);
                                        } else {
                                            setIsPaused(p => !p);
                                        }
                                    }}
                                    className="py-3.5 sm:py-4 px-4 rounded-2xl font-black text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/60 shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer active:scale-95"
                                >
                                    {timeLeft === 0 ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 text-amber-400" />
                                            <span>+Vaqt berish ({timerDuration}s)</span>
                                        </>
                                    ) : isPaused ? (
                                        <>
                                            <Play className="w-5 h-5 text-amber-400 fill-current" />
                                            <span>Davom ettirish</span>
                                        </>
                                    ) : (
                                        <>
                                            <Pause className="w-5 h-5 text-amber-400 fill-current" />
                                            <span>Vaqtni to'xtatish</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleAnswer(true)}
                                    disabled={submitting}
                                    className="py-3.5 sm:py-4 px-4 rounded-2xl font-black text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/60 shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer active:scale-95"
                                >
                                    <Check className="w-5 h-5 text-emerald-400" />
                                    <span>To'g'ri</span>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleNextWord}
                                disabled={submitting}
                                className="w-full py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/40 text-base sm:text-lg flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Keyingi so'z ➔ (Enter / Bo'sh joy)</span>}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 5 Stat Cards (Bottom Row - Matching media_1789147643551.png) ── */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
                    {/* 1. JORIY SO'Z */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1222] border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-1">
                            JORIY SO'Z
                        </span>
                        <span className="text-lg sm:text-xl font-black text-white">
                            {currentWordIdx + 1} / {questionsPerStudent}
                        </span>
                    </div>

                    {/* 2. TO'G'RI */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1222] border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/60 mb-1">
                            TO'G'RI
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 flex items-center justify-center gap-1">
                            <span>✅</span> {correctCount}
                        </span>
                    </div>

                    {/* 3. NOTO'G'RI */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1222] border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-400/60 mb-1">
                            NOTO'G'RI
                        </span>
                        <span className="text-lg sm:text-xl font-black text-rose-400 flex items-center justify-center gap-1">
                            <span>❌</span> {wrongCount}
                        </span>
                    </div>

                    {/* 4. ANIQLIK */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1222] border border-white/5 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400/60 mb-1">
                            ANIQLIK
                        </span>
                        <span className="text-lg sm:text-xl font-black text-indigo-300 flex items-center justify-center gap-1">
                            <span>🎯</span> {studentAccuracy}%
                        </span>
                    </div>

                    {/* 5. O'QUVCHI PROGRESS */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0b1222] border border-white/5 flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-400/60 mb-1">
                            O'QUVCHI PROGRESS
                        </span>
                        <span className="text-lg sm:text-xl font-black text-purple-300 flex items-center justify-center gap-1">
                            <span>👥</span> {currentStudentProgressNumber} / {activeStudentsCount}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── SINF RO'YXATI (ROSTER ORDER) MODAL ── */}
                {showRosterModal && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                        <div className="max-w-xl w-full p-6 rounded-3xl bg-[#0c1220] border border-white/10 shadow-2xl flex flex-col gap-4 max-h-[85vh] text-white">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-black text-white">
                                            Sinf Ro'yxati (Roster Order)
                                        </h3>
                                        <p className="text-xs text-white/40">
                                            {activeStudentsCount} ta o'quvchi • Tartib qat'iy saqlanadi
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRosterModal(false)}
                                    className="p-1.5 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[55vh] pr-1">
                                {sessionParticipants.map((p, idx) => {
                                    const isCurrent = currentStudent?._id === p.studentId;
                                    return (
                                        <div
                                            key={p.studentId}
                                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                                                isCurrent
                                                    ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-600/20'
                                                    : p.status === 'completed'
                                                    ? 'bg-white/[0.03] border-white/10 opacity-75'
                                                    : 'bg-white/[0.01] border-white/5'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                                <span className="w-6 text-center text-white/40 font-mono text-xs font-bold">
                                                    {idx + 1}.
                                                </span>
                                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-sm text-white shrink-0">
                                                    {p.studentNameSnapshot?.charAt(0) || '?'}
                                                </div>
                                                <p className="font-bold text-sm text-white truncate">
                                                    {p.studentNameSnapshot}
                                                </p>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-2">
                                                {isCurrent ? (
                                                    <span className="px-2.5 py-1 rounded-lg bg-indigo-500 text-white font-black text-xs animate-pulse">
                                                        Hozir Navbatda
                                                    </span>
                                                ) : p.status === 'completed' ? (
                                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                                                        {p.correctAnswers}/{p.questionsAsked} ({p.accuracy}%)
                                                    </span>
                                                ) : (
                                                    <span className="text-white/30 text-xs font-medium">
                                                        Kutilmoqda
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setShowRosterModal(false)}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors border border-white/5 cursor-pointer"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                )}

                {/* ── QUICK ADD STUDENT MODAL (DURING ACTIVE GAME) ── */}
                {showAddStudentModal && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                        <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-4 max-h-[85dvh] overflow-y-auto text-white">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        <UserPlus className="w-5 h-5 text-indigo-400" />
                                        O'quvchi Qo'shish
                                    </h3>
                                    <p className="text-xs text-slate-400">Sessiya to'xtatilmasdan o'quvchi qo'shiladi</p>
                                </div>
                                <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-white p-1">
                                    ✕
                                </button>
                            </div>

                            {unjoinedMembers.length === 0 ? (
                                <p className="text-xs text-center py-6 text-slate-400">
                                    Guruhdagi barcha o'quvchilar allaqachon sessiyada qatnashmoqda!
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {unjoinedMembers.map(st => (
                                        <div key={st._id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800 border border-slate-700">
                                            <div>
                                                <p className="font-bold text-sm text-white">{st.name}</p>
                                                {st.studentId && <span className="text-xs text-indigo-400 font-mono font-bold">{st.studentId}</span>}
                                            </div>
                                            <button
                                                onClick={() => handleAddLateStudent(st)}
                                                disabled={addingStudentId === st._id}
                                                className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs transition-all cursor-pointer"
                                            >
                                                {addingStudentId === st._id ? <Loader2 className="w-4 h-4 animate-spin" /> : '+ Qo\'shish'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => setShowAddStudentModal(false)}
                                className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all mt-2"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                )}

                {/* Stop / Confirm Modal */}
                {showStopModal && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                        <div className="max-w-sm w-full p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-4 text-center">
                            <h3 className="text-lg font-black text-white">Sessiyani yakunlamoqchimisiz?</h3>
                            <p className="text-xs text-slate-300">
                                Hozirgi o'quvchilar natijalari saqlanadi va xulosa sahifasiga o'tiladi.
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => { setShowStopModal(false); setIsPaused(false); }}
                                    className="py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                                >
                                    Bekor
                                </button>
                                <button
                                    onClick={() => {
                                        setShowStopModal(false);
                                        loadSummary(sessionId);
                                        setPhase('ceremony');
                                    }}
                                    className="py-3 rounded-xl bg-rose-600 text-white font-black text-xs"
                                >
                                    Ha, yakunlash
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── CEREMONY & SUMMARY PHASE (PART 14, 15, 16) ───────────────────────────
    if (phase === 'ceremony' || phase === 'summary') {
        const stats = summary?.stats;
        const results: GameResult[] = summary?.results || [];
        const difficultWords: DifficultWord[] = summary?.difficultWords || [];

        return (
            <div ref={summaryRef} className="page-container flex flex-col gap-6 max-w-5xl mx-auto py-4 animate-fade-in">
                {/* Summary Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-3xl border border-white/10">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
                            <Trophy className="w-7 h-7 text-amber-400" />
                            Sessiya Yakunlandi!
                        </h1>
                        <p className="text-xs sm:text-sm text-white/50 font-medium mt-1">
                            {summary?.session?.groupId?.name || 'Guruh'} • {new Date().toLocaleDateString('uz-UZ')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap no-export">
                        <button
                            onClick={exportSummaryImage}
                            disabled={exportingImage}
                            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                            {exportingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            <span>Rasmni saqlash</span>
                        </button>
                        <button
                            onClick={() => {
                                if (summary?.session?.groupId?.telegramChatId && !telegramChatId) {
                                    setTelegramChatId(summary.session.groupId.telegramChatId);
                                }
                                if (summary?.telegramMessage && !telegramEditableText) {
                                    setTelegramEditableText(summary.telegramMessage);
                                }
                                setShowTelegramModal(true);
                            }}
                            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                        >
                            <Send className="w-4 h-4" />
                            <span>Telegramga Jo'natish</span>
                        </button>
                        <button
                            onClick={copyTelegram}
                            className="px-3 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                            title="Matnni nusxalash"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/60" />}
                            <span>{copied ? 'Nusxalandi' : 'Matn'}</span>
                        </button>
                        <button
                            onClick={() => { setPhase('setup'); setSelectedGroup(''); setSelectedUnitIds([]); }}
                            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all cursor-pointer"
                        >
                            Yangi Sessiya
                        </button>
                    </div>
                </div>

                {/* Overall Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/10 text-center">
                            <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">O'quvchilar</p>
                            <p className="text-2xl sm:text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
                        </div>
                        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/10 text-center">
                            <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Jami Savollar</p>
                            <p className="text-2xl sm:text-3xl font-black text-white mt-1">{stats.totalQuestions}</p>
                        </div>
                        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/10 text-center">
                            <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">To'g'ri / Noto'g'ri</p>
                            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                                {stats.totalCorrect} <span className="text-white/30 text-sm">/</span> <span className="text-rose-400 text-xl sm:text-2xl">{stats.totalWrong}</span>
                            </p>
                        </div>
                        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/10 text-center">
                            <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Umumiy Aniqlik</p>
                            <p className="text-2xl sm:text-3xl font-black text-indigo-400 mt-1">{stats.avgAccuracy}%</p>
                        </div>
                    </div>
                )}

                {/* ── MOST DIFFICULT WORDS (PART 15) ── */}
                {difficultWords.length > 0 && (
                    <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                Eng Ko'p Xato Qilingan So'zlar (Most Difficult Words)
                            </h3>
                            <span className="text-xs text-white/40">Qayta takrorlash tavsiya etiladi</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {difficultWords.slice(0, 6).map((dw, i) => (
                                <div key={i} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between gap-2">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-black text-white">{dw.englishWord}</span>
                                            <span className="text-xs font-black text-rose-400 font-mono">{dw.accuracy}% to'g'ri</span>
                                        </div>
                                        <p className="text-xs text-white/60 font-medium mt-0.5">{dw.uzbekTranslation}</p>
                                    </div>
                                    <div className="text-[11px] text-white/40 font-bold">
                                        {dw.wrongCount} ta xato / {dw.totalAsked} ta so'ralgan
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── INDIVIDUAL STUDENT DETAILED RESULTS (PART 13, 14, 16) ── */}
                <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            O'quvchilar Natijalari (Roster Order)
                        </h3>
                        <span className="text-xs text-white/40">O'quvchilar ballini to'g'irlash uchun "Tahrirlash" tugmasini bosing</span>
                    </div>

                    <div className="space-y-3">
                        {results.map((r, i) => {
                            const isEditing = editingResultId === r._id;

                            return (
                                <div key={r._id || i} className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 font-black flex items-center justify-center">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-white">{r.studentId?.name}</h4>
                                                {r.studentId?.studentId && (
                                                    <span className="text-xs font-mono font-bold text-indigo-400">{r.studentId.studentId}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-indigo-500/50">
                                                    <span className="text-xs text-white/50">To'g'ri:</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={editTotal}
                                                        value={editCorrect}
                                                        onChange={(e) => setEditCorrect(Number(e.target.value))}
                                                        className="w-12 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-mono font-bold text-xs text-center"
                                                    />
                                                    <span className="text-xs text-white/50">/ Jami:</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={50}
                                                        value={editTotal}
                                                        onChange={(e) => setEditTotal(Number(e.target.value))}
                                                        className="w-12 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-mono font-bold text-xs text-center"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (r._id) {
                                                                handleSaveStudentScore(r._id);
                                                            }
                                                        }}
                                                        disabled={savingEdit || !r._id}
                                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                    >
                                                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                        Saqlash
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingResultId(null)}
                                                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs cursor-pointer"
                                                    >
                                                        Bekor
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-black text-white">{r.correctCount} / {r.questionsAsked}</span>
                                                    <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono font-black text-xs border border-indigo-500/30">
                                                        {r.accuracy}%
                                                    </span>
                                                    {r._id && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingResultId(r._id || null);
                                                                setEditCorrect(r.correctCount || 0);
                                                                setEditTotal(r.questionsAsked || 6);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer no-export"
                                                            title="Natijani tahrirlash"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                {/* Correct vs Weak Words Breakdown */}
                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className="text-[10px] text-white/40 italic">
                                            💡 So'z ustiga bosing — uni to'g'ri yoki xatoga almashtiradi (hisobot avtomatik yangilanadi)
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        {/* Correct Words */}
                                        <div>
                                            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                                                ✓ To'g'ri topilgan so'zlar ({r.correctWords?.length || 0}):
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.correctWords && r.correctWords.length > 0 ? (
                                                    r.correctWords.map((cw, ci) => {
                                                        const isToggling = togglingWordKey === `${r._id}_${cw.englishWord}`;
                                                        return (
                                                            <button
                                                                key={ci}
                                                                type="button"
                                                                onClick={() => r._id && handleToggleWord(r._id, cw.englishWord, 'correct')}
                                                                disabled={isToggling}
                                                                title="Ustiga bosing: Xatoga o'tkazish"
                                                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/20 hover:border-rose-500/40 transition-all cursor-pointer font-medium active:scale-95 disabled:opacity-50"
                                                            >
                                                                <span>{cw.englishWord}</span>
                                                                {isToggling ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                                                                ) : (
                                                                    <span className="text-[10px] opacity-40 group-hover:opacity-100 group-hover:text-rose-400 font-bold transition-opacity">➔ ✕</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-white/30 italic">Yo'q</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Weak Words (Needs Practice) */}
                                        <div>
                                            <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1.5">
                                                ✕ Mashq qilish kerak (Xatolar) ({r.wrongWords?.length || 0}):
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {r.wrongWords && r.wrongWords.length > 0 ? (
                                                    r.wrongWords.map((ww, wi) => {
                                                        const isToggling = togglingWordKey === `${r._id}_${ww.englishWord}`;
                                                        return (
                                                            <button
                                                                key={wi}
                                                                type="button"
                                                                onClick={() => r._id && handleToggleWord(r._id, ww.englishWord, 'wrong')}
                                                                disabled={isToggling}
                                                                title="Ustiga bosing: To'g'riga o'tkazish"
                                                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-emerald-500/20 text-rose-300 hover:text-emerald-300 border border-rose-500/20 hover:border-emerald-500/40 transition-all cursor-pointer font-medium active:scale-95 disabled:opacity-50"
                                                            >
                                                                <span>{ww.englishWord}</span>
                                                                {isToggling ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                                                                ) : (
                                                                    <span className="text-[10px] opacity-40 group-hover:opacity-100 group-hover:text-emerald-400 font-bold transition-opacity">➔ ✓</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-white/30 italic">Xato yo'q (A'lo!)</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                                );
                            })}
                        </div>
                </div>

                {/* ── Telegram Send Modal ── */}
                {showTelegramModal && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
                        <div className="max-w-xl w-full p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col gap-5">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                        <Send className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">Telegram Guruhiga Jo'natish</h3>
                                        <p className="text-xs text-white/50">Hisobotni guruh o'quvchilariga yetkazish</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTelegramModal(false)}
                                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Telegram Chat ID */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                                    Telegram Guruh Chat ID (Ixtiyoriy / Almashtirish)
                                </label>
                                <input
                                    type="text"
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                    placeholder="-1001234567890 yoki @guruh_nomi"
                                    className="w-full h-12 px-4 rounded-[6px] bg-[#060a14] border-2 border-indigo-500/40 hover:border-indigo-400/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 text-white font-mono text-sm sm:text-base placeholder:text-white/30 transition-all shadow-md shadow-black/50 outline-none"
                                    style={{ borderRadius: '6px' }}
                                />
                                <p className="text-[10px] text-white/40">
                                    Ushbu sessiya guruhi uchun belgilangan ID avtomatik qo'yildi. Agar kerak bo'lsa uni o'zgartirishingiz mumkin.
                                </p>
                            </div>

                            {/* Send Type Selector */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                                    Jo'natish Turi
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'both', label: '✨ Ikkalasi ham', desc: 'Rasm + Matn' },
                                        { id: 'image', label: '🖼️ Faqat Rasm', desc: 'Infografika PNG' },
                                        { id: 'text', label: '📝 Faqat Matn', desc: 'Hisobot matni' },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setTelegramSendType(opt.id as any)}
                                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                                telegramSendType === opt.id
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                                                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                            }`}
                                        >
                                            <p className="text-xs font-black">{opt.label}</p>
                                            <p className="text-[10px] text-white/40 mt-0.5">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Editable Message Textarea */}
                            {(telegramSendType === 'text' || telegramSendType === 'both') && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                                            Xabar Matni (Tahrirlash mumkin)
                                        </label>
                                        <span className="text-[10px] text-white/40">
                                            {telegramEditableText.length} belgi
                                        </span>
                                    </div>
                                    <textarea
                                        rows={6}
                                        value={telegramEditableText}
                                        onChange={(e) => setTelegramEditableText(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 transition-all resize-y custom-scrollbar leading-relaxed"
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowTelegramModal(false)}
                                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs transition-all cursor-pointer"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendTelegram}
                                    disabled={sendingTelegram || !telegramChatId.trim()}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                                >
                                    {sendingTelegram ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span>Guruhga Jo'natish</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── HISTORY PHASE ────────────────────────────────────────────────────────
    return (
        <div className="page-container flex flex-col gap-6 max-w-5xl mx-auto py-4 animate-fade-in">
            <div className="flex items-center justify-between p-6 glass-card rounded-3xl border border-white/10">
                <div>
                    <h1 className="text-2xl font-black text-white">Sessiyalar Tarixi</h1>
                    <p className="text-xs text-white/50">Avvalgi o'tkazilgan live lug'at sessiyalari</p>
                </div>
                <button
                    onClick={() => setPhase('setup')}
                    className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs"
                >
                    Orqaga
                </button>
            </div>

            {loadingHistory ? (
                <div className="py-20 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
            ) : history.length === 0 ? (
                <div className="py-16 text-center text-white/40">
                    Hozircha hech qanday sessiya tarixi mavjud emas
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map(s => (
                        <div key={s._id} className="p-5 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-white">{s.groupId?.name || 'Guruh'}</h3>
                                <p className="text-xs text-white/50">{new Date(s.createdAt).toLocaleString('uz-UZ')}</p>
                            </div>
                            <button
                                onClick={() => { loadSummary(s._id); setPhase('summary'); }}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10"
                            >
                                Xulosani ko'rish
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
