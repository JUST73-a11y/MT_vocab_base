'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Settings, LogOut, LayoutDashboard, Menu, X, Phone, Instagram, Send, MessageCircle, Users, UsersRound, Share2 } from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'teacher' && user.role !== 'admin') {
                router.push('/student/dashboard'); // Redirect unauthorized users
            }
        }
    }, [user, loading, router]);

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
        { name: 'Settings', href: '/teacher/settings', icon: Settings },
    ];

    if (loading || !user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-950">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-[100svh] flex flex-col items-center bg-[#0a0a0f] font-sans text-white relative overflow-x-hidden">
            <MeshBackground />
            {/* ── Desktop & Mobile Top Nav ── */}
            <nav className="sticky top-0 w-full z-40 bg-gray-900/60 backdrop-blur-xl border-b border-white/5">
                <div className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto px-4 md:px-6 justify-self-center">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Left: Logo + Desktop Links */}
                        <div className="flex items-center gap-10">
                            <div className="flex items-center gap-3 md:gap-4">
                                {/* Mobile Hamburger */}
                                <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-white/60 hover:text-white transition-colors">
                                    <Menu className="w-6 h-6" />
                                </button>

                                <Link href="/teacher/dashboard" className="flex items-center gap-2 group">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-all">
                                        <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                                    </div>
                                    <span className="font-black text-lg md:text-xl tracking-tighter text-white">VocabTeacher</span>
                                </Link>
                            </div>

                            {/* Desktop Links */}
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                    return (
                                        <Link key={item.href} href={item.href}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all ${isActive ? 'bg-indigo-500/10 text-white' : 'text-white/40 hover:text-white'}`}>
                                            <item.icon className="w-4 h-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-4 md:gap-6">
                            <div className="flex items-center gap-3 md:gap-4 md:pl-6 md:border-l md:border-white/10">
                                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/teacher/settings'} className="flex items-center gap-3 md:gap-4 group cursor-pointer">
                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-black text-white leading-none group-hover:text-indigo-400 transition-colors">{user?.name || 'Guest Teacher'}</p>
                                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mt-1">{user?.role === 'admin' ? 'Admin' : 'Teacher'}</p>
                                    </div>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs md:text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                        {(user?.name || 'T').charAt(0).toUpperCase()}
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
                                    <span className="font-black text-lg tracking-tighter text-white block leading-tight">VocabTeacher</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{user?.role === 'admin' ? 'Admin' : 'O\'qituvchi'}</span>
                                </div>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-xl text-white/60">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 space-y-2">
                            {navItems.map(item => {
                                const isActive = pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(item.href));
                                return (
                                    <Link key={item.href} href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${isActive ? 'bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/10' : 'border border-transparent hover:bg-white/5 hover:border-white/5'}`}>
                                        <div className={`p-2 rounded-xl ${isActive ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/40'}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <span className={`font-black text-sm ${isActive ? 'text-white' : 'text-white/60'}`}>{item.name}</span>
                                    </Link>
                                );
                            })}

                            {/* Pro Tip Card */}
                            <div className="mt-6 p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-3xl -mr-12 -mt-12" />
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                        <BookOpen className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Pro Tip</span>
                                </div>
                                <p className="text-xs font-bold text-white/60 leading-relaxed">
                                    Use the <span className="text-white">Smart Bulk Import</span> in your unit details to quickly add hundreds of words at once from your existing lists.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 mt-auto border-t border-white/5 space-y-2">
                            <button onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-500/10 bg-red-500/5 text-red-400">
                                <div className="p-2 rounded-xl bg-red-500/10"><LogOut className="w-5 h-5" /></div>
                                <span className="font-black text-sm">Tizimdan chiqish</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Global Logout Modal */}
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

            <main className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto relative z-10 w-full">
                {children}
            </main>
        </div>
    );
}

const MeshBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[20%] left-[60%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse delay-1000" />
    </div>
);
