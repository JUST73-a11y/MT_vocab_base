'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Play, LogOut, LayoutDashboard, Menu, X, Brain, BarChart2, Users, Gamepad2, Award } from 'lucide-react';
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
        { name: 'O\'yinlar', href: '/student/games', icon: Gamepad2 },
        { name: 'Sertifikatlar', href: '/student/certificates', icon: Award },
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
        <div className="min-h-[100svh] flex flex-col items-center font-sans text-white overflow-x-hidden" style={{ position: 'relative' }}>
            {/* Adult theme background */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0,
                backgroundImage: 'url(/themes/adult-bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }} />
            {/* Dark overlay so text stays readable */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(10,20,40,0.60)' }} />

            {/* ── TOP NAV ── */}
            <nav
                id="student-nav"
                className="sticky top-0 w-full z-40"
                style={{
                    transition: 'all 0.4s ease',
                    background: 'rgba(10,20,40,0.80)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <div className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-16 md:h-20">

                        {/* Left: Logo */}
                        <div className="flex items-center gap-3 w-1/4">
                            {/* Mobile Hamburger */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 transition-colors"
                                style={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <Link href="/student/dashboard" className="flex items-center gap-2 group">
                                <div
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all"
                                    style={{
                                        background: '#3B82F625',
                                        border: '1.5px solid #3B82F655',
                                    }}
                                >
                                    <BookOpen className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#3B82F6' }} />
                                </div>
                                <span
                                    className="font-black text-lg md:text-xl tracking-tighter"
                                    style={{ color: 'white' }}
                                >
                                    VocabApp
                                </span>
                            </Link>
                        </div>

                        {/* Center: Desktop Links */}
                        <div className="hidden md:flex flex-1 justify-center items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 transition-all group relative overflow-hidden`}
                                        style={{
                                            borderRadius: '8px',
                                            background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                                            color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.6)',
                                        }}
                                    >
                                        <item.icon
                                            className={`w-4 h-4 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 group-hover:-rotate-3'}`}
                                            style={{ color: isActive ? '#60A5FA' : 'inherit' }}
                                        />
                                        <span className="text-[10px] md:text-[13px] font-bold tracking-wide">
                                            {item.name}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Right: Profile */}
                        <div className="flex items-center justify-end gap-3 md:gap-4 w-1/4">
                            {/* Profile Info */}
                            <div className="hidden md:flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[13px] font-bold text-white transition-colors">
                                        {user.name}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#3B82F6' }}>
                                        Student
                                    </p>
                                </div>
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-lg transition-transform"
                                    style={{ background: '#3B82F6' }}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            
                            {/* Logout */}
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="p-2 transition-colors hover:scale-110"
                                style={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
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

            <main className="flex-1 flex flex-col items-center w-[95%] lg:w-[80%] max-w-[1600px] mx-auto overflow-y-auto min-w-0 relative z-10">{children}</main>
        </div>
    );
}
