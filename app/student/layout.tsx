'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Play, LogOut, LayoutDashboard, Menu, X, Brain, BarChart2, Users, Gamepad2, Award, Settings, Palette, ShoppingBag, Package, ChevronDown, MoreHorizontal, Trophy } from 'lucide-react';
import StudentOnboarding from './onboarding/page';
import { StudentThemeProvider } from '@/lib/theme/StudentThemeContext';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
        if (!loading) {
            if (!user) router.push('/login');
            else if (user.role !== 'student') router.push('/teacher/dashboard');
        }
    }, [user, loading, router]);

    // Close dropdown on outside click or route change
    useEffect(() => {
        setIsMoreOpen(false);
    }, [pathname]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsMoreOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    // Primary items shown directly on desktop navbar
    const primaryNavItems = [
        { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
        { name: 'Mashq', href: '/student/random', icon: Play },
        { name: 'Quiz', href: '/student/quiz', icon: Brain },
        { name: 'O\'yinlar', href: '/student/games', icon: Gamepad2 },
        { name: 'Statistika', href: '/student/stats', icon: BarChart2 },
        { name: 'Mening guruhim', href: '/student/group', icon: Users },
        { name: 'Scores', href: '/student/scores', icon: Trophy },
    ];

    // Secondary items grouped in "Ko'proq" dropdown on desktop
    const secondaryNavItems = [
        { name: 'Do\'kon', href: '/student/shop', icon: ShoppingBag },
        { name: 'Inventar', href: '/student/inventory', icon: Package },
        { name: 'Dizayn', href: '/student/theme', icon: Palette },
        { name: 'Yodlash', href: '/student/mistakes', icon: BookOpen },
        { name: 'Sertifikatlar', href: '/student/certificates', icon: Award },
    ];

    // All items for mobile drawer
    const allNavItems = [...primaryNavItems, ...secondaryNavItems];

    const isSecondaryActive = secondaryNavItems.some(
        item => pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href))
    );

    if (loading || !user || user.role !== 'student') {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    if (!user.teacherId) {
        return <StudentThemeProvider><StudentOnboarding /></StudentThemeProvider>;
    }

    return (
        <StudentThemeProvider>
        <div className="min-h-[100svh] flex flex-col items-center font-sans text-white overflow-x-hidden" style={{ position: 'relative' }}>
            {/* Theme dynamic background */}
            <div
                id="student-theme-bg"
                style={{
                    position: 'fixed',
                    top: '-30px',
                    left: '-30px',
                    right: '-30px',
                    bottom: '-30px',
                    zIndex: 0,
                    backgroundImage: 'var(--theme-bg-image, none)',
                    backgroundColor: 'var(--theme-bg-color, #09090f)',
                    backgroundPosition: 'var(--theme-bg-pos, center)',
                    backgroundSize: 'var(--theme-bg-size, cover)',
                    backgroundRepeat: 'no-repeat',
                    filter: 'var(--theme-bg-blur, none)',
                    transform: 'translate3d(0, 0, 0)',
                    willChange: 'filter',
                }}
            />
            {/* Theme overlay so text stays readable and gradients show */}
            <div
                id="student-theme-overlay"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1,
                    backgroundColor: 'var(--theme-bg-overlay-color, rgba(10,20,40,0.50))',
                    backgroundImage: 'var(--theme-bg-overlay, none)',
                    pointerEvents: 'none',
                }}
            />

            {/* ── TOP NAV ── */}
            <div className="w-full max-w-[1600px] mx-auto sticky top-4 md:top-6 z-40 flex justify-center px-4 sm:px-6 lg:px-8">
                <nav
                    id="student-nav"
                    className="w-full flex items-center transition-all duration-300"
                    style={{
                        height: '72px',
                        borderRadius: 'var(--theme-radius-card, 16px)',
                        background: 'var(--theme-nav-bg, rgba(10, 18, 35, 0.75))',
                        backdropFilter: 'var(--theme-nav-blur, blur(20px))',
                        WebkitBackdropFilter: 'var(--theme-nav-blur, blur(20px))',
                        border: 'var(--theme-nav-border, 1px solid rgba(255,255,255,0.10))',
                        marginBottom: '24px',
                    }}
                >
                    <div className="w-full h-full px-4 md:px-6 flex items-center justify-between gap-2">

                        {/* Left: Logo */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Mobile Hamburger */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 transition-colors cursor-pointer"
                                style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <Link href="/student/dashboard" className="flex items-center gap-2 group">
                                <div
                                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-all"
                                    style={{
                                        borderRadius: 'var(--theme-radius-btn, 12px)',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1.5px solid var(--theme-border, rgba(255,255,255,0.15))',
                                        color: 'var(--theme-primary, #3B82F6)'
                                    }}
                                >
                                    <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <span
                                    className="font-black text-lg md:text-xl tracking-tighter"
                                    style={{ color: 'var(--theme-text, #ffffff)' }}
                                >
                                    VocabApp
                                </span>
                            </Link>
                        </div>

                        {/* Center: Desktop Links */}
                        <div className="hidden md:flex items-center gap-1 xl:gap-2">
                            {primaryNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-1.5 px-3 py-2 transition-all group relative overflow-hidden"
                                        style={{
                                            borderRadius: 'var(--theme-radius-btn, 999px)',
                                            background: isActive ? 'var(--theme-btn-bg, #6366f1)' : 'transparent',
                                            color: isActive ? 'var(--theme-btn-text, #ffffff)' : 'var(--theme-text-muted, rgba(255,255,255,0.75))',
                                            border: isActive ? '1px solid var(--theme-primary, rgba(99,102,241,0.4))' : '1px solid transparent',
                                            boxShadow: isActive ? 'var(--theme-shadow-btn, 0 0 10px rgba(99,102,241,0.3))' : 'none',
                                        }}
                                    >
                                        <item.icon
                                            className={`w-4 h-4 transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 group-hover:-rotate-3'}`}
                                            style={{ color: isActive ? 'inherit' : 'var(--theme-primary, #60A5FA)' }}
                                        />
                                        <span className="text-[12px] xl:text-[13px] font-bold tracking-wide whitespace-nowrap">
                                            {item.name}
                                        </span>
                                    </Link>
                                );
                            })}

                            {/* "Ko'proq" Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                                    className="flex items-center gap-1.5 px-3 py-2 transition-all group relative cursor-pointer"
                                    style={{
                                        borderRadius: 'var(--theme-radius-btn, 999px)',
                                        background: isSecondaryActive ? 'var(--theme-btn-bg, #6366f1)' : isMoreOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                                        color: isSecondaryActive ? 'var(--theme-btn-text, #ffffff)' : 'var(--theme-text-muted, rgba(255,255,255,0.75))',
                                        border: isSecondaryActive ? '1px solid var(--theme-primary, rgba(99,102,241,0.4))' : '1px solid transparent',
                                    }}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                    <span className="text-[12px] xl:text-[13px] font-bold tracking-wide whitespace-nowrap">
                                        Ko'proq
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isMoreOpen && (
                                    <div
                                        className="absolute right-0 mt-2 w-48 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 border animate-in fade-in slide-in-from-top-2 duration-200"
                                        style={{
                                            background: 'var(--theme-nav-bg, rgba(15, 22, 42, 0.96))',
                                            backdropFilter: 'blur(20px)',
                                            borderColor: 'var(--theme-border, rgba(255,255,255,0.15))',
                                            zIndex: 50,
                                        }}
                                    >
                                        {secondaryNavItems.map((item) => {
                                            const isActive = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setIsMoreOpen(false)}
                                                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all font-bold text-xs"
                                                    style={{
                                                        background: isActive ? 'var(--theme-btn-bg, #6366f1)' : 'transparent',
                                                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
                                                    }}
                                                >
                                                    <item.icon className="w-4 h-4 shrink-0" style={{ color: isActive ? '#fff' : 'var(--theme-primary, #60A5FA)' }} />
                                                    <span>{item.name}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Profile */}
                        <div className="flex items-center justify-end gap-3 shrink-0">
                            {/* Profile Info (Clickable link to Settings) */}
                            <Link
                                href="/student/settings"
                                className="hidden md:flex items-center gap-3 group p-1.5 rounded-xl hover:bg-white/5 transition-all"
                                title="Sozlamalar va Profil"
                            >
                                <div className="text-right">
                                    <p className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors">
                                        {user.name}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                        Student
                                    </p>
                                </div>
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg transition-transform group-hover:scale-105 border border-[#5B8CFF]/30"
                                    style={{ background: 'linear-gradient(135deg, #4D7CFE, #7A5AF8)' }}
                                >
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </Link>
                            
                            {/* Logout */}
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="p-2 transition-colors hover:scale-110 cursor-pointer"
                                style={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </nav>
            </div>

            {/* ── Mobile Left Drawer ── */}
            {mounted && isMobileMenuOpen && createPortal(
                <div className="fixed inset-0 z-[9999] md:hidden animate-fade-in">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div
                        className="absolute top-0 left-0 bottom-0 w-[80vw] max-w-[320px] shadow-2xl flex flex-col pt-6 font-sans"
                        style={{
                            background: 'var(--theme-nav-bg, rgba(10, 18, 35, 0.95))',
                            backdropFilter: 'var(--theme-nav-blur, blur(24px))',
                            WebkitBackdropFilter: 'var(--theme-nav-blur, blur(24px))',
                            borderRight: '1px solid var(--theme-border, rgba(255,255,255,0.12))',
                        }}
                    >
                        <div className="px-6 flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        borderColor: 'var(--theme-border, rgba(255,255,255,0.15))',
                                        color: 'var(--theme-primary, #3B82F6)'
                                    }}
                                >
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <span className="font-black text-xl text-white">VocabApp</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/50 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="px-3 flex-1 overflow-y-auto space-y-1">
                            {allNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="w-full flex items-center gap-4 p-3.5 transition-all group border"
                                        style={{
                                            borderRadius: 'var(--theme-radius-btn, 12px)',
                                            background: isActive ? 'var(--theme-btn-bg, #6366f1)' : 'transparent',
                                            color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                                            borderColor: isActive ? 'var(--theme-primary, rgba(99,102,241,0.4))' : 'transparent',
                                        }}
                                    >
                                        <div
                                            className="p-2.5 rounded-lg transition-colors"
                                            style={{
                                                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                                                color: isActive ? '#ffffff' : 'var(--theme-primary, #60A5FA)',
                                            }}
                                        >
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-[15px]">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="p-4 mt-auto border-t space-y-3" style={{ borderColor: 'var(--theme-border, rgba(255,255,255,0.10))' }}>
                            <Link 
                                href="/student/settings" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-full flex items-center gap-4 p-4 transition-all hover:bg-white/5 group border"
                                style={{
                                    borderRadius: 'var(--theme-radius-btn, 12px)',
                                    background: pathname === '/student/settings' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                    borderColor: pathname === '/student/settings' ? 'var(--theme-border, rgba(255,255,255,0.2))' : 'transparent',
                                }}
                            >
                                <div
                                    className="p-3 transition-colors"
                                    style={{
                                        borderRadius: 'var(--theme-radius-btn, 10px)',
                                        background: pathname === '/student/settings' ? 'var(--theme-primary, #4F46E5)' : 'rgba(255,255,255,0.05)',
                                        color: pathname === '/student/settings' ? '#ffffff' : 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    <Settings className="w-5 h-5" />
                                </div>
                                <span className="font-black text-[15px] text-white">Sozlamalar</span>
                            </Link>
                            
                            <button
                                onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }}
                                className="w-full flex items-center gap-4 p-4 border border-red-500/20 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 group cursor-pointer"
                                style={{ borderRadius: 'var(--theme-radius-btn, 12px)' }}
                            >
                                <div className="p-3 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </div>
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
                            <button onClick={() => setShowLogoutModal(false)} className="btn-action justify-center text-sm cursor-pointer">Bekor</button>
                            <button onClick={handleSignOut}
                                className="py-3 rounded-xl font-black text-white text-sm transition-all hover:opacity-90 cursor-pointer"
                                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}>
                                Ha, chiqish
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <main className="flex-1 flex flex-col items-center w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 overflow-y-auto min-w-0 relative z-10 pt-2 md:pt-4 pb-16">{children}</main>
        </div>
        </StudentThemeProvider>
    );
}