'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { LogIn, Mail, KeyRound, Loader2, Eye, EyeOff, ShieldCheck, Sparkles, UserPlus, Check, Copy, CheckCircle2 } from 'lucide-react';

type LoginMode = 'normal' | 'gmail-check' | 'setup-password' | 'reminder';

export default function LoginPage() {
    const [mode, setMode] = useState<LoginMode>('normal');

    // Normal login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Gmail first-login
    const [gmailEmail, setGmailEmail] = useState('');
    const [foundStudentName, setFoundStudentName] = useState('');
    const [checkingGmail, setCheckingGmail] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [settingUp, setSettingUp] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);

    // Reminder
    const [reminderCopied, setReminderCopied] = useState(false);

    const { signIn, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') router.push('/admin/dashboard');
            else if (user.role === 'teacher') router.push('/teacher/dashboard');
            else {
                if (!user.teacherId) router.push('/student/onboarding');
                else router.push('/student/dashboard');
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

    const handleGmailCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setCheckingGmail(true); setError('');
        try {
            const res = await fetch(`/api/auth/setup-password?email=${encodeURIComponent(gmailEmail)}`);
            const data = await res.json();
            if (data.valid) {
                setFoundStudentName(data.name);
                setMode('setup-password');
            } else {
                setError("Bu Gmail manzili topilmadi yoki allaqachon parol o'rnatilgan");
            }
        } catch {
            setError("Xatolik yuz berdi, qayta urinib ko'ring");
        } finally {
            setCheckingGmail(false);
        }
    };

    const handleSetupPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setError('Parollar mos emas'); return; }
        if (newPassword.length < 6) { setError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
        setSettingUp(true); setError('');
        try {
            const res = await fetch('/api/auth/setup-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: gmailEmail, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMode('reminder');
        } catch (err: any) {
            setError(err.message || "Parol o'rnatishda xatolik");
        } finally {
            setSettingUp(false);
        }
    };

    const handleCopyCredentials = () => {
        const text = `📱 VocabTeacher Login\n\nEmail: ${gmailEmail}\nParol: ${newPassword}`;
        navigator.clipboard.writeText(text);
        setReminderCopied(true);
        setTimeout(() => setReminderCopied(false), 2000);
    };

    const handleContinueAfterReminder = async () => {
        try { await signIn(gmailEmail, newPassword); } catch { router.push('/login'); }
    };

    const BgDeco = () => (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[url('/themes/adult-bg.jpg')] bg-cover bg-center bg-fixed opacity-40 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>
    );

    // ── REMINDER ───────────────────────────────────────────────────────────────
    if (mode === 'reminder') {
        return (
            <div className="min-h-screen flex items-center justify-center relative p-6 bg-transparent">
                <BgDeco />
                <div className="glass-card max-w-lg w-full p-8 md:p-12 relative z-10 animate-fade-in space-y-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Hisob yaratildi! 🎉</h2>
                            <p className="text-white/40 text-sm mt-2">Hurmatli {foundStudentName}, login ma&apos;lumotlaringizni eslab qoling!</p>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Sizning ma&apos;lumotlaringiz</p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-white/50 text-sm font-bold">Email:</span>
                                <span className="text-white font-black text-sm">{gmailEmail}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/50 text-sm font-bold">Parol:</span>
                                <span className="text-white font-black text-sm">{'•'.repeat(newPassword.length)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-bold">
                        ⚠️ Keyingi safar shu Email va Parol bilan kirasiz. Screenshot olishni tavsiya qilamiz!
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleCopyCredentials}
                            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm transition-all"
                            style={{
                                background: reminderCopied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${reminderCopied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                color: reminderCopied ? '#34d399' : 'rgba(255,255,255,0.6)',
                            }}>
                            {reminderCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {reminderCopied ? 'Nusxalandi' : 'Nusxalash'}
                        </button>
                        <button onClick={handleContinueAfterReminder} className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm btn-premium">
                            Davom etish →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── SETUP PASSWORD ─────────────────────────────────────────────────────────
    if (mode === 'setup-password') {
        return (
            <div className="min-h-screen flex items-center justify-center relative p-6 bg-transparent">
                <BgDeco />
                <div className="glass-card max-w-lg w-full p-8 md:p-12 relative z-10 animate-fade-in space-y-6">
                    <header className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-5">
                            <KeyRound className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Parol o&apos;rnatish</h2>
                        <p className="text-white/40 text-sm mt-2">Salom, <span className="text-indigo-400 font-black">{foundStudentName}</span>! Yangi parolingizni kiriting</p>
                    </header>
                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-black">{error}</div>}
                    <form onSubmit={handleSetupPassword} className="space-y-4">
                        <div className="relative">
                            <input type={showNewPw ? 'text' : 'password'} value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Yangi parol (kamida 6 ta belgi)"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 pr-12 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20"
                                required />
                            <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                                {showNewPw ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                            </button>
                        </div>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Parolni qayta kiriting"
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20"
                            required />
                        <button type="submit" disabled={settingUp} className="btn-premium w-full h-14 text-sm">
                            {settingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {settingUp ? 'Saqlanmoqda...' : 'Parolni Saqlash'}
                        </button>
                    </form>
                    <button onClick={() => { setMode('gmail-check'); setError(''); }}
                        className="w-full text-xs text-white/20 hover:text-white/50 transition-colors font-bold text-center">← Orqaga</button>
                </div>
            </div>
        );
    }

    // ── GMAIL CHECK ────────────────────────────────────────────────────────────
    if (mode === 'gmail-check') {
        return (
            <div className="min-h-screen flex items-center justify-center relative p-6 bg-transparent">
                <BgDeco />
                <div className="glass-card max-w-lg w-full p-8 md:p-12 relative z-10 animate-fade-in space-y-6">
                    <header className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-5">
                            <Mail className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white">Gmail bilan kirish</h2>
                        <p className="text-white/40 text-sm mt-2">O&apos;qituvchi bergan Gmail manzilingizni kiriting</p>
                    </header>
                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-black">{error}</div>}
                    <form onSubmit={handleGmailCheck} className="space-y-4">
                        <input type="email" value={gmailEmail} onChange={e => setGmailEmail(e.target.value)}
                            placeholder="sizning@gmail.com"
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/20"
                            autoFocus required />
                        <button type="submit" disabled={checkingGmail} className="btn-premium w-full h-14 text-sm">
                            {checkingGmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                            {checkingGmail ? 'Tekshirilmoqda...' : 'Tekshirish'}
                        </button>
                    </form>
                    <button onClick={() => { setMode('normal'); setError(''); }}
                        className="w-full text-xs text-white/20 hover:text-white/50 transition-colors font-bold text-center">← Odatiy kirish</button>
                </div>
            </div>
        );
    }

    // ── NORMAL LOGIN ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center relative p-6 bg-[#0a0a0f]">
            <BgDeco />
            <div className="glass-card max-w-lg w-full p-8 md:p-16 relative z-10 overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
                    <Sparkles className="w-32 h-32 text-indigo-400" />
                </div>
                <header className="text-center mb-10 relative">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] mb-6 shadow-[0_20px_40px_-10px_rgba(99,102,241,0.5)]">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-4">Kirish</h1>
                    <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed">
                        Lug&apos;at o&apos;rganishda davom etish uchun<br />hisobingizga kiring
                    </p>
                </header>

                <div className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest animate-fade-in flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0" />{error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-white/60 uppercase tracking-widest ml-1 block mb-1">Email manzilingiz</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                                placeholder="nom@email.com" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-white/60 uppercase tracking-widest ml-1 block mb-1">Parol</label>
                            <div className="relative group">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 pr-14 text-sm font-bold text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-white/20"
                                    placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                                    {showPassword
                                        ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-premium w-full h-14 mt-2 text-sm group">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            <span>{loading ? 'Kirilmoqda...' : 'Tizimga Kirish'}</span>
                        </button>
                    </form>

                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                        <span className="relative px-4 bg-[#1a1a25] text-white/20 text-[10px] font-black uppercase tracking-widest">yoki</span>
                    </div>

                    <button onClick={() => { setMode('gmail-check'); setError(''); }}
                        className="w-full h-12 rounded-2xl flex items-center justify-center gap-3 font-black text-sm transition-all hover:bg-white/10 active:scale-[0.98]"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                        O&apos;qituvchi bergan Gmail bilan kirish
                    </button>

                    <div className="pt-6 border-t border-white/5 text-center">
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest">
                            Akkauntingiz yo&apos;qmi?{' '}
                            <Link href="/register" className="text-white hover:text-indigo-400 font-extrabold transition-colors ml-2">
                                RO&apos;YXATDAN O&apos;TISH
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
