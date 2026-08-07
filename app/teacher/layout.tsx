'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Settings, LogOut, LayoutDashboard, Menu, X, Share2, Play, Users, UsersRound, Gamepad2, Bell, Mail, Send } from 'lucide-react';
import { TeacherThemeProvider, useTeacherTheme } from '@/lib/teacherTheme';
import ThemeToggle from '@/components/teacher/ThemeToggle';
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
    const unreadCount = notifications.filter(n => !n.isRead).length;

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
                .theme-kids .bg-white\/\[0\.02\], .theme-kids .bg-white\/\[0\.03\] { background: rgba(10,20,40,0.65) !important; }
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

    const navItems = user?.role === 'admin' ? [
        { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'All Units', href: '/teacher/units', icon: BookOpen },
    ] : [
        { name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
        { name: 'Units', href: '/teacher/units', icon: BookOpen },
        { name: 'Students', href: '/teacher/students', icon: Users },
        { name: 'Groups', href: '/teacher/groups', icon: UsersRound },
        { name: 'Shared', href: '/teacher/shared', icon: Share2 },
        { name: 'Mashq', href: '/teacher/random', icon: Play },
        { name: 'Lug\'at O\'yini', href: '/teacher/vocab-game', icon: Gamepad2 },
        { name: 'Settings', href: '/teacher/settings', icon: Settings },
    ];

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

    // Nav link active style (depends on theme)
    const getLinkClass = (href: string) => {
        const isActive = pathname === href || (href !== '/teacher/dashboard' && pathname.startsWith(href));
        if (isActive) return 'active-nav-link';
        return 'inactive-nav-link';
    };

    const navTextColor = 'white';
    const navTextFaint = 'rgba(255,255,255,0.6)';

    return (
        <div
            className={`min-h-[100svh] flex flex-col items-center font-sans relative overflow-x-hidden ${config.bodyClass}`}
            style={{ '--tt-glow': config.accentGlow } as React.CSSProperties}
        >
            {/* ── FULL-PAGE BACKGROUND ── */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    backgroundImage: `url(${config.bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    transition: 'background-image 0.6s ease',
                }}
            />
            {/* Overlay on top of bg image */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1,
                    transition: 'background 0.5s ease',
                    ...config.overlayStyle,
                }}
            />

            {/* ── TOP NAV ── */}
            <nav
                id="teacher-nav"
                className="sticky top-0 w-full z-40"
                style={{
                    transition: 'all 0.4s ease',
                    ...config.navStyle,
                }}
            >
                <div className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between h-16 md:h-20">

                        {/* Left: Logo */}
                        <div className="flex items-center gap-3 w-auto lg:w-1/4 shrink-0">
                            {/* Mobile Hamburger */}
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="md:hidden p-2 transition-colors"
                                style={{ color: navTextFaint }}
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <Link href="/teacher/dashboard" className="flex items-center gap-2 group">
                                <div
                                    className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center transition-all"
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

                        {/* Center: Desktop Links */}
                        <div className="hidden lg:flex flex-1 justify-center items-center gap-1 xl:gap-2 overflow-x-auto no-scrollbar px-4 whitespace-nowrap">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-2 px-3 xl:px-4 py-2 text-[13px] xl:text-sm font-black transition-all shrink-0"
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
                        </div>

                        {/* Right: Theme Toggle + User */}
                        <div className="flex items-center justify-end gap-3 md:gap-4 w-auto lg:w-1/4 shrink-0">
                            {/* Stacked Messages and Notifications */}
                            <div className="flex flex-col items-center justify-center gap-0.5">
                                {/* ✉️ Messages */}
                                <button 
                                    onClick={() => setShowMessagesModal(true)}
                                    className="p-1.5 transition-colors hover:text-white rounded-lg hover:bg-white/5"
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
                                        className="p-1.5 transition-colors relative hover:text-white rounded-lg hover:bg-white/5"
                                        style={{ color: navTextFaint }}
                                    >
                                        <Bell className="w-4 h-4" />
                                        {unreadCount > 0 && (
                                            <span 
                                                className="absolute top-1 right-1 w-2 h-2 rounded-full border border-[#0a1226]"
                                                style={{ background: config.accentColor }}
                                            />
                                        )}
                                    </button>

                                    {/* Notifications Dropdown */}
                                    <AnimatePresence>
                                        {showNotifications && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden"
                                                style={{
                                                    background: theme === 'kids' 
                                                        ? 'rgba(255,252,240,0.95)' 
                                                        : 'rgba(15,13,30,0.95)',
                                                    backdropFilter: 'blur(20px)',
                                                    border: `1px solid ${config.accentColor}30`,
                                                    color: theme === 'kids' ? '#1a1a2e' : 'white',
                                                }}
                                            >
                                                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                    <h3 className="font-black text-sm uppercase tracking-widest">Xabarnomalar</h3>
                                                    {unreadCount > 0 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${config.accentColor}20`, color: config.accentColor }}>
                                                            {unreadCount} ta yangi
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                    {notifications.length === 0 ? (
                                                        <p className="text-white/40 text-xs text-center py-4">Xabarnomalar yo'q</p>
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
                                                                className={`w-full text-left p-3 rounded-xl flex flex-col gap-1 transition-colors cursor-pointer ${
                                                                    isMessage 
                                                                        ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' 
                                                                        : 'bg-white/5 border border-white/5 hover:bg-white/10'
                                                                }`}
                                                            >
                                                                <p className={`text-xs font-black ${isMessage ? 'text-red-400' : 'text-white'}`}>{n.title}</p>
                                                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${isMessage ? 'text-red-400/80' : 'text-white/60'}`}>{n.message}</p>
                                                                <p className={`text-[9px] uppercase font-bold mt-1 tracking-wider ${isMessage ? 'text-red-400/50' : 'text-white/30'}`}>{new Date(n.createdAt).toLocaleDateString()}</p>
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

                            {/* 🎨 Theme Toggle */}
                            <ThemeToggle />

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
                                    className="hidden md:block p-2 transition-colors hover:text-red-400"
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
                            background: theme === 'kids'
                                ? 'rgba(255,252,240,0.97)'
                                : theme === 'teen'
                                    ? 'rgba(15,8,30,0.97)'
                                    : 'rgba(10,18,35,0.97)',
                            borderRight: `2px solid ${config.accentColor}40`,
                        }}
                    >
                        <div className="px-6 mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 flex items-center justify-center"
                                    style={{
                                        borderRadius: config.btnRadius,
                                        background: `${config.accentColor}20`,
                                        border: `1.5px solid ${config.accentColor}50`,
                                    }}
                                >
                                    <BookOpen className="w-6 h-6" style={{ color: config.accentColor }} />
                                </div>
                                <div>
                                    <span className="font-black text-lg tracking-tighter block leading-tight" style={{ color: navTextColor, fontFamily: config.fontFamily }}>
                                        VocabTeacher
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: config.accentColor }}>
                                        {user?.role === 'admin' ? 'Admin' : "O'qituvchi"}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2"
                                style={{ background: `${config.accentColor}15`, borderRadius: 10, color: navTextFaint }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mobile Theme Toggle */}
                        <div className="px-4 mb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: navTextFaint }}>
                                Auditoriya
                            </p>
                            <ThemeToggle />
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 space-y-2">
                            {navItems.map(item => {
                                const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex items-center gap-3 p-4 transition-all"
                                        style={{
                                            borderRadius: config.btnRadius,
                                            background: isActive ? config.activeNavBg : 'transparent',
                                            border: isActive ? `1px solid ${config.accentColor}30` : '1px solid transparent',
                                            boxShadow: isActive ? `0 2px 10px ${config.accentGlow}` : 'none',
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
                                className="w-full flex items-center gap-3 p-4"
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
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <div
                        className="w-[95%] max-w-sm p-8 text-center shadow-2xl"
                        style={{
                            borderRadius: config.btnRadius,
                            background: theme === 'kids'
                                ? 'rgba(255,252,240,0.97)'
                                : 'linear-gradient(160deg,#13111f,#0f0d1e)',
                            border: `1px solid ${config.accentColor}30`,
                            color: theme === 'kids' ? '#1a1a2e' : 'white',
                        }}
                    >
                        <div
                            className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
                            style={{ borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                            <LogOut className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-black mb-2" style={{ fontFamily: config.fontFamily }}>Chiqish</h2>
                        <p className="mb-8 text-sm" style={{ opacity: 0.6 }}>Siz rostdan ham chiqmoqchimisiz?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="py-3 font-black text-sm transition-all"
                                style={{
                                    borderRadius: config.btnRadius,
                                    border: `1.5px solid ${config.accentColor}40`,
                                    background: `${config.accentColor}10`,
                                    color: config.accentColor,
                                }}
                            >
                                Bekor
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="py-3 font-black text-white text-sm transition-all hover:opacity-90"
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
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                >
                    <div
                        className="w-[95%] max-w-md p-8 shadow-2xl flex flex-col gap-4 animate-fade-in"
                        style={{
                            borderRadius: config.btnRadius,
                            background: theme === 'kids'
                                ? 'rgba(255,252,240,0.97)'
                                : 'linear-gradient(160deg,#13111f,#0f0d1e)',
                            border: `1px solid ${config.accentColor}30`,
                            color: theme === 'kids' ? '#1a1a2e' : 'white',
                        }}
                    >
                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: selectedNotification.type === 'MESSAGE' ? 'rgba(239,68,68,0.2)' : `${config.accentColor}20`, color: selectedNotification.type === 'MESSAGE' ? '#ef4444' : config.accentColor }}>
                                    {selectedNotification.type === 'MESSAGE' ? <Mail className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black">{selectedNotification.title}</h2>
                                    <p className="text-xs uppercase tracking-wider font-bold" style={{ opacity: 0.5 }}>{new Date(selectedNotification.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedNotification(null)} className="p-2 transition-colors hover:text-red-400" style={{ opacity: 0.6 }}>
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="py-2">
                            <p className="text-sm leading-relaxed" style={{ opacity: 0.9 }}>{selectedNotification.message}</p>
                            {selectedNotification.unitTitle && (
                                <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ opacity: 0.5 }}>Tafsilotlar</p>
                                    <p className="text-sm font-bold">O'quvchi: <span style={{color: config.accentColor}}>{selectedNotification.studentName}</span></p>
                                    <p className="text-sm font-bold mt-1">Bo'lim: <span style={{color: config.accentColor}}>{selectedNotification.unitTitle}</span></p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedNotification(null)}
                            className="mt-2 py-3 font-black text-sm transition-all w-full"
                            style={{
                                borderRadius: config.btnRadius,
                                border: `1.5px solid ${config.accentColor}40`,
                                background: `${config.accentColor}10`,
                                color: config.accentColor,
                            }}
                        >
                            Yopish
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* ── MAIN CONTENT ── */}
            <main className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto relative z-10 w-full">
                {children}
            </main>
        </div>
    );
}

// ── Outer wrapper provides the context ───────────────────────────────────────
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    return (
        <TeacherThemeProvider>
            <TeacherLayoutInner>{children}</TeacherLayoutInner>
        </TeacherThemeProvider>
    );
}
