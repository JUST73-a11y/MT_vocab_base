'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Play, LogOut, LayoutDashboard, Menu, X, Brain, BarChart2, Users } from 'lucide-react';
import StudentOnboarding from './onboarding/page';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!loading) {
            if (!user) router.push('/login');
            else if (user.role !== 'student') router.push('/teacher/dashboard');
        }
    }, [user, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const navItems = [
        { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
        { name: 'Mashq', href: '/student/random', icon: Play },
        { name: 'Quiz', href: '/student/quiz', icon: Brain },
        { name: 'Yodlash', href: '/student/mistakes', icon: BookOpen },
        { name: 'Statistika', href: '/student/stats', icon: BarChart2 },
        { name: 'Mening guruhim', href: '/student/group', icon: Users },
    ];

    if (loading || !user || user.role !== 'student') {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user.teacherId) {
        return <StudentOnboarding />;
    }

    return (
        <div className="min-h-[100svh] flex flex-col items-center font-sans text-white overflow-x-hidden" style={{ background: 'linear-gradient(160deg,#0d0d1f 0%,#12102e 50%,#0d0d1f 100%)' }}>

            {/* ── Desktop & Mobile Top Nav ── */}
            <nav id="student-nav" className="sticky top-0 w-full z-40 bg-gray-900/60 backdrop-blur-xl border-b border-white/5">
                <div className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto px-4 md:px-6 justify-self-center">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Left: Logo + Desktop Links */}
                        <div className="flex items-center gap-10">
                            <div className="flex items-center gap-3 md:gap-4">
                                {/* Mobile Hamburger */}
                                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-white/60 hover:text-white transition-colors">
                                    <Menu className="w-6 h-6" />
                                </button>

                                <Link href="/student/dashboard" className="flex items-center gap-2 group">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-all">
                                        <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                                    </div>
                                    <span className="font-black text-lg md:text-xl tracking-tighter text-white">VocabApp</span>
                                </Link>
                            </div>

                            {/* Desktop Links */}
                            <div className="hidden md:flex items-center gap-2 p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
                                {navItems.map(item => {
                                    const active = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                                    return (
                                        <Link key={item.href} href={item.href}
                                            className={`flex items-center gap-2.5 px-5 lg:px-6 py-2.5 rounded-lg text-[13px] lg:text-sm font-black transition-all duration-300 group relative overflow-hidden ${active ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                            style={{
                                                background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))' : 'transparent',
                                                border: active ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
                                                boxShadow: active ? '0 0 20px rgba(168,85,247,0.15), inset 0 0 10px rgba(99,102,241,0.1)' : 'none',
                                            }}>
                                            {/* Active Glow Accent */}
                                            {active && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl z-0" />}
                                            <item.icon className={`w-4 h-4 z-10 transition-all duration-300 ${active ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] scale-110' : 'group-hover:text-white group-hover:scale-110 group-hover:-rotate-3'}`} />
                                            <span className="z-10 tracking-wide" style={{ textShadow: active ? '0 0 10px rgba(255,255,255,0.3)' : 'none' }}>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Profile */}
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="flex items-center gap-3 md:gap-4 md:pl-6 md:border-l md:border-white/10">
                                <Link href="/student/dashboard" className="flex items-center gap-3 md:gap-4 group cursor-pointer">
                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">{user.name}</p>
                                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Student</p>
                                    </div>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs md:text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                </Link>
                                <button onClick={() => setShowLogoutModal(true)} className="hidden md:block p-2 text-white/20 hover:text-red-400 transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Mobile Left Drawer ── */}
            {mounted && isMobileMenuOpen && createPortal(
                <div className="fixed inset-0 z-[9999] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute top-0 left-0 bottom-0 w-[80vw] max-w-[320px] bg-[#0f0d1e] border-r border-white/5 shadow-2xl flex flex-col pt-6 font-sans">
                        <div className="px-6 mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                    <BookOpen className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <span className="font-black text-lg tracking-tighter text-white block leading-tight">VocabApp</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Student</span>
                                </div>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-xl text-white/60">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 space-y-3 mt-4">
                            {navItems.map(item => {
                                const active = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link key={item.href} href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${active ? 'border border-purple-500/30' : 'border border-transparent hover:bg-white/5'}`}
                                        style={{ background: active ? 'rgba(168,85,247,0.1)' : 'transparent' }}>
                                        {/* Active background glow */}
                                        {active && <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-md z-0" />}

                                        <div className={`z-10 p-3 rounded-lg transition-all duration-300 ${active ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] scale-110' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/90 group-hover:scale-110 group-hover:-rotate-3'}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col z-10">
                                            <span className={`font-black text-[15px] transition-all duration-300 ${active ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-white/60 group-hover:text-white group-hover:translate-x-1'}`}>
                                                {item.name}
                                            </span>
                                            {active && <span className="text-[9px] font-black tracking-[0.2em] uppercase text-purple-400 mt-0.5">Faol sahifa</span>}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="p-4 mt-auto border-t border-white/5">
                            <button onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-4 p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 transition-all hover:bg-red-500/10 group">
                                <div className="p-3 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors"><LogOut className="w-5 h-5" /></div>
                                <span className="font-black text-[15px]">Tizimdan chiqish</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Logout modal */}
            {mounted && showLogoutModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="w-[95%] max-w-sm rounded-[2rem] p-8 text-center shadow-2xl animate-fade-in"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <LogOut className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Chiqish</h2>
                        <p className="text-white/50 mb-8 text-sm">Siz rostdan ham chiqmoqchimisiz?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowLogoutModal(false)} className="btn-action justify-center text-sm">Bekor</button>
                            <button onClick={handleSignOut}
                                className="py-3 rounded-xl font-black text-white text-sm transition-all hover:opacity-90"
                                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                                Ha, chiqish
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <main className="flex-1 flex flex-col items-center w-[95%] lg:w-[80%] max-w-[1600px] mx-auto overflow-y-auto min-w-0">{children}</main>
        </div>
    );
}
