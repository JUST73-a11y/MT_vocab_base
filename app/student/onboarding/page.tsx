"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
    Users,
    ChevronRight,
    Sparkles,
    ShieldCheck,
    AlertCircle,
    Loader2,
    LogOut,
    GraduationCap
} from "lucide-react";

export default function StudentOnboarding() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const { user, signOut, refreshUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && user.teacherId) {
            router.push("/student/dashboard");
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError("Iltimos, o'qituvchingiz bergan kodni kiriting.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/student/link-teacher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teacherCode: code.toUpperCase().trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Xato yuz berdi");
                return;
            }

            setSuccess(true);
            await refreshUser(); // Update AuthContext state

            setTimeout(() => {
                router.push("/student/dashboard");
            }, 2000);

        } catch (err) {
            setError("Serverga ulanishda xato. Iltimos qaytadan urinib ko'ring.");
        } finally {
            setLoading(false);
        }
    };

    const MeshBackground = () => (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center relative p-6 bg-[#0a0a0f]">
            <MeshBackground />

            <div className="glass-card max-w-xl w-full p-8 md:p-16 relative z-10 overflow-hidden animate-fade-in shadow-[0_0_100px_rgba(99,102,241,0.1)]">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000"
                        style={{ width: success ? '100%' : '50%' }}
                    />
                </div>

                <div className="flex justify-between items-start mb-12">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-indigo-400" />
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Chiqish
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-10 animate-scale-in">
                        <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)]">
                            <ShieldCheck className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Tabriklaymiz!</h2>
                        <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed">
                            O'qituvchiga muvaffaqiyatli ulandingiz.<br />Dashboardga yo'naltirilmoqda...
                        </p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        <header>
                            <h1 className="text-4xl font-black text-white tracking-tighter mb-4 break-words whitespace-normal">Xush Kelibsiz, {user?.name?.split(' ')[0]}!</h1>
                            <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed break-words whitespace-normal">
                                Lug'at o'rganishni boshlash uchun o'qituvchingizdan<br />olgan maxsus kodni kiriting.
                            </p>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl flex items-center gap-4 animate-shake">
                                    <AlertCircle className="w-6 h-6 shrink-0" />
                                    <p className="text-xs font-black uppercase tracking-widest leading-relaxed">{error}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">O'qituvchi Kodi</label>
                                <div className="relative group">
                                    <Users className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="w-full h-20 bg-white/[0.03] border border-white/10 rounded-2xl pl-16 pr-8 text-2xl font-black text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-white/5 tracking-[0.2em]"
                                        placeholder="T-XXXXXX"
                                        disabled={loading}
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !code.trim()}
                                className="w-full h-20 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-[1.5rem] flex items-center justify-center gap-4 font-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)]"
                            >
                                {loading ? (
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                ) : (
                                    <>
                                        <span>Darslarga Ulanish</span>
                                        <ChevronRight className="w-8 h-8" />
                                    </>
                                )}
                            </button>
                        </form>

                        <footer className="pt-10 border-t border-white/5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-indigo-400/40" />
                            </div>
                            <p className="text-[10px] text-white/20 font-bold leading-relaxed uppercase tracking-wider">
                                Agar kodingiz bo'lmasa, uni o'qituvchingizdan so'rang.<br />
                                O'qituvchingiz sizni tizimga qo'shgan bo'lishi kerak.
                            </p>
                        </footer>
                    </div>
                )}
            </div>
        </div>
    );
}
