'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Settings, LogOut, LayoutDashboard, Menu, X, Share2, Play, Users, UsersRound, Gamepad2, Bell, Mail, Send, Palette, ShoppingBag, Trophy, ChevronDown, MoreHorizontal } from 'lucide-react';
import { TeacherThemeProvider, useTeacherTheme } from '@/lib/teacherTheme';
import { TeacherThemeProvider as NewTeacherThemeProvider } from '@/lib/theme/TeacherThemeContext';
import MessagesModal from '@/components/teacher/MessagesModal';
import { motion, AnimatePresence } from 'framer-motion';

// ── Inner layout (needs access to theme context) ─────────────────────────────
function TeacherLayoutInner({ children }: { children: React.ReactNode }) {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { config, theme } = useTeacherTheme();
    
    // Notifications State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [showMessagesModal, setShowMessagesModal] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter(n => !n.isRead).length;

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

    useEffect(() => {
        if (user && (user.role === 'teacher' || user.role === 'admin')) {
            fetch('/api/teacher/notifications')
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setNotifications(data);
                })
                .catch(console.error);
        }
    }, [user]);

    const handleMarkAsRead = async () => {
        if (unreadCount > 0) {
            await fetch('/api/teacher/notifications', { method: 'PUT' }).catch(console.error);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    };

    useEffect(() => {
        setMounted(true);
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'teacher' && user.role !== 'admin') {
                router.push('/student/dashboard');
            }
        }
    }, [user, loading, router]);

    // Inject theme keyframes once
    useEffect(() => {
        const styleId = 'teacher-theme-keyframes';
        if (!document.getElementById(styleId)) {
            const s = document.createElement('style');
            s.id = styleId;
            s.textContent = `
                @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap');
                @keyframes tt-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
                @keyframes tt-wiggle { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-3deg)} 75%{transform:rotate(3deg)} }
                @keyframes tt-glow { 0%,100%{box-shadow:0 0 8px var(--tt-glow)} 50%{box-shadow:0 0 22px var(--tt-glow)} }
                @keyframes tt-slide { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
                @keyframes tt-fade { from{opacity:0;transform:scale(.98)} to{opacity:1;transform:scale(1)} }

                /* Kids theme overrides */
                .theme-kids .btn-premium, .theme-kids .btn-action { border-radius:24px !important; animation: tt-bounce 2s ease infinite; }
                .theme-kids a, .theme-kids button { font-family:'Fredoka',sans-serif !important; }
                .theme-kids .glass-card { border-radius:24px !important; background:rgba(10,20,40,0.72) !important; border:1px solid rgba(59,130,246,.2) !important; }
                .theme-kids [class*="border-white"] { border-color:rgba(59,130,246,.15) !important; }
                .theme-kids .bg-white\\/\\[0\\.02\\], .theme-kids .bg-white\\/\\[0\\.03\\] { background: rgba(10,20,40,0.65) !important; }
                .theme-kids main { animation: tt-wiggle 0s; }

                /* Teen theme overrides */
                .theme-teen .btn-premium { border-radius:12px !important; }
                .theme-teen .glass-card { border-radius:12px !important; background:rgba(20,10,40,0.75) !important; border:1px solid rgba(139,92,246,.25) !important; }
                .theme-teen [class*="border-white"] { border-color:rgba(139,92,246,.2) !important; }
                .theme-teen .bg-white\\/\\[0\\.02\\], .theme-teen .bg-white\\/\\[0\\.03\\] { background: rgba(30,15,60,0.65) !important; }
                .theme-teen main { animation: tt-slide .35s ease both; }

                /* Adult theme overrides */
                .theme-adult .btn-premium { border-radius:8px !important; }
                .theme-adult .glass-card { border-radius:10px !important; background:rgba(10,20,40,0.72) !important; border:1px solid rgba(59,130,246,.2) !important; }
                .theme-adult [class*="border-white"] { border-color:rgba(59,130,246,.15) !important; }
                .theme-adult .bg-white\\/\\[0\\.02\\], .theme-adult .bg-white\\/\\[0\\.03\\] { background: rgba(10,20,40,0.65) !important; }
                .theme-adult main { animation: tt-fade .4s ease both; }
            `;
            document.head.appendChild(s);
        }
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    // Primary items shown directly on desktop navbar
    const primaryNavItems = user?.role === 'admin' ? [
        { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'All Units', href: '/teacher/units', icon: BookOpen },
    ] : [
        { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
        { name: 'Live Scores', href: '/teacher/live-scores', icon: Trophy },
        { name: 'Units', href: '/teacher/units', icon: BookOpen },
        { name: 'Students', href: '/teacher/students', icon: Users },
        { name: 'Groups', href: '/teacher/groups', icon: UsersRound },
        { name: 'Mashq', href: '/teacher/random', icon: Play },
        { name: 'O\'yinlar', href: '/teacher/vocab-game', icon: Gamepad2 },
    ];

    // Secondary items grouped in "Ko'proq" dropdown on desktop
    const secondaryNavItems = user?.role === 'admin' ? [] : [
        { name: 'Shared', href: '/teacher/shared', icon: Share2 },
        { name: 'Dizayn', href: '/teacher/theme', icon: Palette },
        { name: 'Do\'kon', href: '/teacher/shop', icon: ShoppingBag },
    ];

    // All items for mobile drawer
    const allNavItems = [...primaryNavItems, ...secondaryNavItems];

    const isSecondaryActive = secondaryNavItems.some(
        item => pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href))
    );

    if (loading || !user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return (
            <div
                className="h-screen flex items-center justify-center"
                style={{
                    backgroundImage: `url(${config.bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div style={{ ...config.overlayStyle, position: 'absolute', inset: 0 }} />
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center animate-spin"
                        style={{ border: `3px solid ${config.accentColor}30`, borderTopColor: config.accentColor }}
                    />
                    <p className="font-black text-xs uppercase tracking-widest" style={{ color: config.accentColor }}>
                        Yuklanmoqda...
                    </p>
                </div>
            </div>
        );
    }

    const navTextColor = 'white';
    const navTextFaint = 'rgba(255,255,255,0.6)';

    return (
        <div
            className={`min-h-[100svh] flex flex-col items-center font-sans relative overflow-x-hidden ${config.bodyClass}`}
            style={{ '--tt-glow': config.accentGlow } as React.CSSProperties}
        >
            {/* ── FULL-PAGE BACKGROUND (with blur & custom theme support) ── */}
            <div
                id="teacher-theme-bg"
                style={{
                    position: 'fixed',
                    top: '-30px',
                    left: '-30px',
                    right: '-30px',
                    bottom: '-30px',
                    zIndex: 0,
                    backgroundImage: `var(--theme-bg-image, url(${config.bgImage}))`,
                    backgroundColor: 'var(--theme-bg-color, #0a1428)',
                    backgroundPosition: 'var(--theme-bg-pos, center)',
                    backgroundSize: 'var(--theme-bg-size, cover)',
                    backgroundRepeat: 'no-repeat',
                    filter: 'var(--theme-bg-blur, none)',
                    transform: 'translate3d(0, 0, 0)',
                    willChange: 'filter',
                    transition: 'background-image 0.4s ease, filter 0.3s ease',
                }}
            />
            {/* Overlay on top of bg image */}
            <div
                id="teacher-theme-overlay"
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1,
                    backgroundColor: 'var(--theme-bg-overlay-color, rgba(10,20,40,0.55))',
                    backgroundImage: 'var(--theme-bg-overlay, none)',
                    pointerEvents: 'none',
                    transition: 'background-color 0.4s ease',
                }}
            />

            {/* ── TOP NAV (PADDED & PROPERLY CENTERED) ── */}
            <nav
                id="teacher-nav"
                className="sticky top-0 w-full z-40 mb-6 md:mb-8"
                style={{
                    background: 'var(--theme-nav-bg, rgba(10, 18, 35, 0.75))',
                    backdropFilter: 'var(--theme-nav-blur, blur(20px))',
                    WebkitBackdropFilter: 'var(--theme-nav-blur, blur(20px))',
                    borderBottom: 'var(--theme-nav-border, 1px solid rgba(255,255,255,0.10))',
                    transition: 'all 0.4s ease',
                    ...config.navStyle,
                }}
            >
                <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20 py-2">

                        {/* Left: Logo */}
                        <div className="flex items-center gap-3 w-auto shrink-0">
                            {/* Mobile Hamburger */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 transition-colors cursor-pointer"
                                style={{ color: navTextFaint }}
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <Link href="/teacher/dashboard" className="flex items-center gap-2.5 group">
                                <div
                                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                                    style={{
                                        background: `${config.accentColor}25`,
                                        border: `1.5px solid ${config.accentColor}55`,
                                    }}
                                >
                                    <BookOpen className="w-5 h-5 md:w-6 md:h-6" style={{ color: config.accentColor }} />
                                </div>
                                <span
                                    className="font-black text-lg md:text-xl tracking-tighter"
                                    style={{ color: navTextColor, fontFamily: config.fontFamily }}
                                >
                                    VocabTeacher
                                </span>
                            </Link>
                        </div>

                        {/* Center: Desktop Links (WITH BALANCED PADDING & SPACING) */}
                        <div className="hidden lg:flex items-center gap-2 xl:gap-3 px-6 py-1 whitespace-nowrap overflow-x-auto scrollbar-none my-auto">
                            {primaryNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-2 px-3.5 xl:px-4.5 py-2 text-[13px] xl:text-sm font-black transition-all shrink-0 cursor-pointer"
                                        style={{
                                            borderRadius: config.btnRadius,
                                            background: isActive ? config.activeNavBg : 'transparent',
                                            color: isActive ? config.activeNavText : navTextFaint,
                                            fontFamily: config.fontFamily,
                                            boxShadow: isActive ? `0 0 12px ${config.accentGlow}` : 'none',
                                        }}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}

                            {/* "Ko'proq" Dropdown */}
                            {secondaryNavItems.length > 0 && (
                                <div className="relative shrink-0" ref={dropdownRef}>
                                    <button
                                        onClick={() => setIsMoreOpen(!isMoreOpen)}
                                        className="flex items-center gap-1.5 px-3.5 xl:px-4.5 py-2 text-[13px] xl:text-sm font-black transition-all cursor-pointer"
                                        style={{
                                            borderRadius: config.btnRadius,
                                            background: isSecondaryActive ? config.activeNavBg : isMoreOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                                            color: isSecondaryActive ? config.activeNavText : navTextFaint,
                                            fontFamily: config.fontFamily,
                                        }}
                                    >
                                        <span>Ko'proq</span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {isMoreOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute right-0 top-full mt-2 w-48 p-2 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-1 z-50"
                                                style={{
                                                    background: 'var(--theme-card-bg, rgba(15, 23, 42, 0.95))',
                                                    backdropFilter: 'blur(20px)',
                                                }}
                                            >
                                                {secondaryNavItems.map((item) => {
                                                    const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            onClick={() => setIsMoreOpen(false)}
                                                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-black transition-all group cursor-pointer"
                                                            style={{
                                                                color: isActive ? config.accentColor : 'rgba(255,255,255,0.85)',
                                                                background: isActive ? `${config.accentColor}20` : 'transparent',
                                                                border: isActive ? `1px solid ${config.accentColor}40` : '1px solid transparent',
                                                            }}
                                                        >
                                                            <div 
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                                                style={{
                                                                    background: isActive ? config.accentColor : `${config.accentColor}18`,
                                                                    color: isActive ? '#ffffff' : config.accentColor,
                                                                }}
                                                            >
                                                                <item.icon className="w-4 h-4" />
                                                            </div>
                                                            <span className="truncate tracking-wide">{item.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Right: User + Messages/Notifications */}
                        <div className="flex items-center justify-end gap-3 md:gap-4 w-auto shrink-0">
                            {/* Stacked Messages and Notifications */}
                            <div className="flex flex-col items-center justify-center gap-0.5">
                                {/* ✉️ Messages */}
                                <button 
                                    onClick={() => setShowMessagesModal(true)}
                                    className="p-1.5 transition-colors hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                                    style={{ color: navTextFaint }}
                                    title="Xabarlar"
                                >
                                    <Mail className="w-4 h-4" />
                                </button>

                                {/* 🔔 Notifications */}
                                <div className="relative">
                                    <button 
                                        onClick={() => {
                                            setShowNotifications(!showNotifications);
                                            if (!showNotifications) handleMarkAsRead();
                                        }}
                                        className="p-1.5 transition-colors hover:text-white rounded-lg hover:bg-white/5 relative cursor-pointer"
                                        style={{ color: navTextFaint }}
                                        title="Xabarnomalar"
                                    >
                                        <Bell className="w-4 h-4" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-black text-[9px] flex items-center justify-center animate-pulse">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Notifications Dropdown */}
                                    <AnimatePresence>
                                        {showNotifications && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                                className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-2 z-50 bg-slate-900/96 backdrop-blur-2xl"
                                            >
                                                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1">
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">Xabarnomalar</h3>
                                                    <span className="text-[10px] text-slate-400 font-bold">{notifications.length} ta</span>
                                                </div>

                                                <div className="space-y-2">
                                                    {notifications.length === 0 ? (
                                                        <p className="text-slate-400 text-xs text-center py-6 font-medium">Xabarnomalar mavjud emas</p>
                                                    ) : (
                                                        notifications.map(n => {
                                                            const isMessage = n.type === 'MESSAGE';
                                                            return (
                                                            <button 
                                                                key={n._id} 
                                                                onClick={() => {
                                                                    setSelectedNotification(n);
                                                                    setShowNotifications(false);
                                                                }}
                                                                className={`w-full text-left p-3.5 rounded-xl flex flex-col gap-1.5 transition-all cursor-pointer border ${
                                                                    isMessage 
                                                                        ? 'bg-red-500/15 border-red-500/30 hover:bg-red-500/25' 
                                                                        : 'bg-slate-800/90 border-slate-700/70 hover:bg-indigo-900/40 hover:border-indigo-500/50 shadow-sm'
                                                                }`}
                                                            >
                                                                <p className={`text-xs font-black tracking-wide ${isMessage ? 'text-red-400' : 'text-amber-300'}`}>{n.title}</p>
                                                                <p className={`text-[12px] leading-relaxed line-clamp-2 ${isMessage ? 'text-red-200' : 'text-slate-200'}`}>{n.message}</p>
                                                                <p className={`text-[10px] uppercase font-bold mt-0.5 tracking-wider ${isMessage ? 'text-red-400/70' : 'text-slate-400'}`}>{new Date(n.createdAt).toLocaleDateString()}</p>
                                                            </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="hidden md:flex items-center gap-3 md:gap-4 pl-3 md:pl-4 border-l" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/teacher/settings'} className="flex items-center gap-3 group cursor-pointer">
                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-black leading-none transition-colors" style={{ color: navTextColor, fontFamily: config.fontFamily }}>
                                            {user?.name || 'Guest Teacher'}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1" style={{ color: config.accentColor }}>
                                            {user?.role === 'admin' ? 'Admin' : 'Teacher'}
                                        </p>
                                    </div>
                                    <div
                                        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-black text-xs md:text-sm shadow-lg transition-transform group-hover:scale-105"
                                        style={{
                                            borderRadius: config.btnRadius,
                                            background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}99)`,
                                            boxShadow: `0 4px 15px ${config.accentGlow}`,
                                            color: 'white',
                                            fontFamily: config.fontFamily,
                                        }}
                                    >
                                        {(user?.name || 'T').charAt(0).toUpperCase()}
                                    </div>
                                </Link>
                                <button
                                    onClick={() => setShowLogoutModal(true)}
                                    className="hidden md:block p-2 transition-colors hover:text-red-400 cursor-pointer"
                                    style={{ color: navTextFaint }}
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <MessagesModal isOpen={showMessagesModal} onClose={() => setShowMessagesModal(false)} />

            {/* ── MOBILE DRAWER ── */}
            {mounted && isMobileMenuOpen && createPortal(
                <div className="fixed inset-0 z-[9999] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div
                        className="absolute top-0 left-0 bottom-0 w-[80vw] max-w-[320px] flex flex-col pt-6 font-sans shadow-2xl"
                        style={{
                            background: 'var(--theme-nav-bg, rgba(10, 18, 35, 0.95))',
                            backdropFilter: 'var(--theme-nav-blur, blur(24px))',
                            WebkitBackdropFilter: 'var(--theme-nav-blur, blur(24px))',
                            borderRight: `1px solid var(--theme-border, ${config.accentColor}40)`,
                        }}
                    >
                        <div className="flex items-center justify-between px-6 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md"
                                    style={{
                                        background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}99)`,
                                        color: 'white',
                                    }}
                                >
                                    {(user?.name || 'T').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-black text-sm" style={{ color: navTextColor }}>{user?.name || 'Teacher'}</h4>
                                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: config.accentColor }}>{user?.role}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 cursor-pointer" style={{ color: navTextFaint }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {allNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer"
                                        style={{
                                            background: isActive ? config.activeNavBg : 'transparent',
                                            border: isActive ? `1px solid ${config.accentColor}40` : '1px solid transparent',
                                        }}
                                    >
                                        <div
                                            className="p-2"
                                            style={{
                                                borderRadius: Math.max(8, parseInt(config.btnRadius) - 8) + 'px',
                                                background: isActive ? config.accentColor : `${config.accentColor}15`,
                                                color: isActive ? (theme === 'kids' ? '#3A2000' : 'white') : config.accentColor,
                                            }}
                                        >
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span
                                            className="font-black text-sm"
                                            style={{
                                                color: isActive ? config.activeNavText : navTextFaint,
                                                fontFamily: config.fontFamily,
                                            }}
                                        >
                                            {item.name}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="p-4 mt-auto" style={{ borderTop: `1px solid ${config.accentColor}20` }}>
                            <button
                                onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }}
                                className="w-full flex items-center gap-3 p-4 cursor-pointer"
                                style={{ borderRadius: config.btnRadius, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#F87171' }}
                            >
                                <div className="p-2" style={{ borderRadius: 10, background: 'rgba(239,68,68,0.12)' }}>
                                    <LogOut className="w-5 h-5" />
                                </div>
                                <span className="font-black text-sm">Tizimdan chiqish</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── LOGOUT MODAL ── */}
            {mounted && showLogoutModal && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <div
                        className="w-[95%] max-w-sm p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-fade-in"
                        style={{
                            background: 'var(--theme-card-bg, rgba(15, 23, 42, 0.95))',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: `1px solid var(--theme-border, ${config.accentColor}30)`,
                            borderRadius: 'var(--theme-radius-card, 24px)',
                        }}
                    >
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/15 border border-red-500/30 text-red-400">
                            <LogOut className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-white">Tizimdan chiqish</h3>
                            <p className="text-xs text-slate-300 mt-1 font-medium">Haqiqatan ham hisobingizdan chiqmoqchimisiz?</p>
                        </div>
                        <div className="flex items-center gap-3 w-full mt-2">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 py-3 text-xs font-black transition-colors cursor-pointer"
                                style={{ borderRadius: config.btnRadius, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 py-3 text-xs font-black text-white transition-all cursor-pointer"
                                style={{ borderRadius: config.btnRadius, background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }}
                            >
                                Ha, chiqish
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── NOTIFICATION MODAL ── */}
            {mounted && selectedNotification && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <div
                        className="w-[95%] max-w-md p-7 shadow-2xl flex flex-col gap-4 animate-fade-in rounded-3xl bg-slate-900 border border-slate-700 text-white"
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedNotification.type === 'MESSAGE' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                    {selectedNotification.type === 'MESSAGE' ? <Mail className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white">{selectedNotification.title}</h2>
                                    <p className="text-xs uppercase tracking-wider font-bold text-slate-400">{new Date(selectedNotification.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedNotification(null)} className="p-2 transition-colors text-slate-400 hover:text-white cursor-pointer">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="py-2">
                            <p className="text-sm leading-relaxed text-slate-200 font-medium">{selectedNotification.message}</p>
                            {selectedNotification.unitTitle && (
                                <div className="mt-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
                                    <p className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Tafsilotlar</p>
                                    <p className="text-sm font-bold text-white">O'quvchi: <span className="text-amber-400">{selectedNotification.studentName}</span></p>
                                    <p className="text-sm font-bold mt-1 text-white">Bo'lim: <span className="text-amber-400">{selectedNotification.unitTitle}</span></p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedNotification(null)}
                            className="mt-2 py-3.5 font-black text-sm transition-all w-full rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white cursor-pointer"
                        >
                            Yopish
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ── MAIN CONTENT (FULL WIDTH RESPONSIVE CONTAINER) ── */}
            <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4 md:pt-6 pb-16">
                {children}
            </main>
        </div>
    );
}

// ── Outer wrapper provides the context ───────────────────────────────────────
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <NewTeacherThemeProvider>
            <TeacherThemeProvider>
                <TeacherLayoutInner>{children}</TeacherLayoutInner>
            </TeacherThemeProvider>
        </NewTeacherThemeProvider>
    );
}
