'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserPlus, AlertCircle, ShieldCheck, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

const checkPassword = (pw: string) => ({
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
});
const isPasswordStrong = (pw: string) => Object.values(checkPassword(pw)).every(Boolean);

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'mail.ru', 'yandex.ru', 'yandex.com', 'protonmail.com', 'live.com', 'umail.uz', 'mail.uz'];

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[m][n];
}

function suggestDomain(email: string): string | null {
    const at = email.lastIndexOf('@');
    if (at < 0) return null;
    const typed = email.slice(at + 1).toLowerCase();
    let best: string | null = null, bestD = Infinity;
    for (const d of COMMON_DOMAINS) { const dist = levenshtein(typed, d); if (dist < bestD && dist <= 2 && dist > 0) { bestD = dist; best = d; } }
    return best ? email.slice(0, at + 1) + best : null;
}

function RegisterForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [suggestion, setSuggestion] = useState<string | null>(null);

    const [step, setStep] = useState<'register' | 'verify'>('register');
    const [otp, setOtp] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);

    const { signUp, signIn, user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const urlEmail = searchParams.get('email');
        const urlVerify = searchParams.get('verify');
        if (urlEmail) setEmail(urlEmail);
        if (urlVerify === 'true') setStep('verify');
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'teacher') router.push('/teacher/dashboard');
            else router.push('/student/dashboard');
        }
    }, [user, router]);

    if (user) return null;

    const handleEmailChange = (val: string) => {
        setEmail(val); setEmailError(''); setSuggestion(null);
        if (!val) return;
        if (!EMAIL_REGEX.test(val)) { setEmailError("Email formati noto'g'ri"); return; }
        const sug = suggestDomain(val);
        if (sug) setSuggestion(sug);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!EMAIL_REGEX.test(email)) { setError("To'g'ri email kiriting."); return; }
        if (!isPasswordStrong(password)) { setError("Parol barcha talablarga javob berishi kerak."); return; }
        setError(''); setLoading(true);
        try {
            await signUp(email, password, name, 'student');
        } catch (err: any) {
            if (err.message === 'EMAIL_NOT_VERIFIED' || err.message.includes('OTP')) {
                setStep('verify');
                setError('');
            } else {
                setError(err.message || 'Xato yuz berdi');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setVerifyLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Kod noto'g'ri");
            }
        } catch (err: any) {
            setError(err.message || "Xato yuz berdi");
            setVerifyLoading(false);
            return;
        }

        try {
            await signIn(email, password);
        } catch (err: any) {
            setError(err.message);
            setVerifyLoading(false);
        }
    };

    const handleGoogleRegister = () => {
        setGoogleLoading(true);
        setTimeout(() => {
            alert('Google registration simulation...');
            setGoogleLoading(false);
        }, 1000);
    };

    const MeshBackground = () => (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[10%] left-[-5%] w-[35%] h-[35%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center relative p-6 bg-[#0a0a0f]">
            <MeshBackground />

            <div className="glass-card max-w-lg w-full p-8 md:p-16 relative z-10 overflow-hidden animate-fade-in">
                <header className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-[2rem] mb-6 shadow-[0_20px_40px_-10px_rgba(236,72,153,0.5)]">
                        <UserPlus className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Ro'yxatdan o'tish</h1>
                    <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed">
                        Yangi bilimlar sari ilk qadamni qo'ying
                    </p>
                </header>

                {step === 'register' ? (
                    <div className="space-y-6">
                        <button
                            onClick={handleGoogleRegister}
                            disabled={googleLoading || loading}
                            className="w-full h-16 bg-white text-[#0a0a0f] rounded-2xl flex items-center justify-center gap-4 font-black transition-all hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50"
                        >
                            {googleLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <svg className="w-6 h-6" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                            )}
                            <span>Google orqali boshlash</span>
                        </button>

                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5"></div>
                            </div>
                            <span className="relative px-4 bg-[#1a1a25] text-white/20 text-[10px] font-black uppercase tracking-widest">yoki email orqali</span>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-fade-in flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">To'liq ismingiz</label>
                                <input
                                    type="text" value={name} onChange={e => setName(e.target.value)}
                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-purple-500/30 transition-all"
                                    placeholder="Ismingizni kiriting" required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Email</label>
                                <input
                                    type="email" value={email} onChange={e => handleEmailChange(e.target.value)}
                                    className={`w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-purple-500/30 transition-all ${emailError ? 'border-red-500/50' : ''}`}
                                    placeholder="nom@email.com" required
                                />
                                {emailError && <p className="text-[10px] text-red-400 font-bold ml-1">{emailError}</p>}
                                {suggestion && <p className="text-[10px] text-yellow-400/60 font-bold ml-1">💡 Balki <button type="button" onClick={() => setEmail(suggestion)} className="underline">{suggestion}</button> bo'lishi mumkindir?</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Maxfiy parol</label>
                                <input
                                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-purple-500/30 transition-all"
                                    placeholder="••••••••" required
                                />
                                {password && (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {[
                                            { key: 'length', label: '8 belgi' },
                                            { key: 'uppercase', label: 'Katta harf' },
                                            { key: 'lowercase', label: 'Kichik harf' },
                                            { key: 'number', label: 'Raqam' },
                                        ].map(({ key, label }) => {
                                            const ok = checkPassword(password)[key as keyof ReturnType<typeof checkPassword>];
                                            return (
                                                <div key={key} className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${ok ? 'text-emerald-400' : 'text-white/10'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'bg-white/10'}`} />
                                                    {label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit" disabled={loading || googleLoading || !!emailError}
                                className="btn-premium w-full h-16 text-lg mt-4"
                                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
                                <span>Hisob yaratish</span>
                            </button>
                        </form>

                        <div className="pt-8 border-t border-white/5 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
                            Akkauntingiz bormi? <Link href="/login" className="text-white hover:text-purple-400 transition-colors ml-2">KIRISH</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 text-center">
                            <h3 className="text-white font-bold mb-2">Email tasdiqlash</h3>
                            <p className="text-sm text-indigo-300/80 leading-relaxed">
                                <span className="font-bold text-white">{email}</span> manziliga 6 xonali tasdiqlash kodi yuborildi. Iltimos kodni kiriting:
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest mx-auto flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1 text-center block">Tasdiqlash kodi</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                    className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl text-center text-2xl tracking-[0.5em] font-black text-white outline-none focus:border-indigo-500/50 transition-all font-mono"
                                    placeholder="000000"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={verifyLoading || otp.length !== 6}
                                    className="btn-premium w-full h-16 text-lg disabled:opacity-50"
                                >
                                    {verifyLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                    <span>Tasdiqlash</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep('register')}
                                    className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-white/5"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Orqaga
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
