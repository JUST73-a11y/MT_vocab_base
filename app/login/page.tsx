'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { LogIn, Mail, KeyRound, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

// Password strength check (same as register)
const checkPassword = (pw: string) => ({
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
});
const isPasswordStrong = (pw: string) => Object.values(checkPassword(pw)).every(Boolean);

type ForgotStep = 'email' | 'otp' | 'newpass' | 'done';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    const { signIn, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'teacher') router.push('/teacher/dashboard');
            else {
                // If student, check if they have a teacher
                if (!user.teacherId) {
                    router.push('/student/onboarding');
                } else {
                    router.push('/student/dashboard');
                }
            }
        }
    }, [user, router]);

    if (user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await signIn(email, password);
        } catch (err: any) {
            if (err.message === 'EMAIL_NOT_VERIFIED') {
                router.push(`/register?verify=true&email=${encodeURIComponent(email)}`);
            } else {
                setError(err.message || "Email yoki parol noto'g'ri");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setGoogleLoading(true);
        // In a real app: window.location.href = '/api/auth/google';
        setTimeout(() => {
            alert('Google login simulation: Redirecting to Google account selection...');
            setGoogleLoading(false);
        }, 1000);
    };

    // Mesh gradient background component
    const MeshBackground = () => (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
            <div className="absolute top-[20%] left-[60%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse delay-1000" />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center relative p-6 bg-[#0a0a0f]">
            <MeshBackground />

            <div className="glass-card max-w-lg w-full p-8 md:p-16 relative z-10 overflow-hidden animate-fade-in">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                    <Sparkles className="w-32 h-32 text-indigo-400" />
                </div>

                <header className="text-center mb-12 relative">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] mb-6 shadow-[0_20px_40px_-10px_rgba(99,102,241,0.5)]">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Kirish</h1>
                    <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed">
                        Lug'at o'rganishda davom etish uchun<br />hisobingizga kiring
                    </p>
                </header>

                <div className="space-y-6">
                    {/* Primary CTA: Google Login */}
                    <button
                        onClick={handleGoogleLogin}
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
                        <span>Google orqali kirish</span>
                    </button>

                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <span className="relative px-4 bg-[#1a1a25] text-white/20 text-[10px] font-black uppercase tracking-widest">yoki</span>
                    </div>

                    {/* Role Guidance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3" /> Student
                            </span>
                            <p className="text-[10px] text-white/40 leading-snug">Teacher kodingiz bo'lsa ulanasiz</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                            <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3" /> Teacher
                            </span>
                            <p className="text-[10px] text-white/40 leading-snug">Admin sizni teacher qiladi</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-fade-in flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-6 text-sm font-bold text-white outline-none focus:border-indigo-500/30 transition-all"
                                        placeholder="nom@email.com" required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Parol</label>
                                    <button
                                        type="button"
                                        onClick={() => { alert('Hozircha faqat Google login tavsiya etiladi.'); }}
                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 hover:text-indigo-400 transition-colors"
                                    >
                                        Unutdingizmi?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl pl-14 pr-14 text-sm font-bold text-white outline-none focus:border-indigo-500/30 transition-all"
                                        placeholder="••••••••" required
                                    />
                                    <button
                                        type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading || googleLoading}
                            className="btn-premium w-full h-16 text-lg group"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                            <span>{loading ? 'Kirilmoqda...' : 'Tizimga Kirish'}</span>
                        </button>
                    </form>

                    <div className="pt-8 border-t border-white/5 text-center">
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                            Akkauntingiz yo'qmi?{' '}
                            <Link href="/register" className="text-white hover:text-indigo-400 font-extrabold transition-colors ml-2">
                                RO'YXATDAN O'TISH
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
