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
    const [showContactModal, setShowContactModal] = useState(false);
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
        <div className="min-h-screen flex flex-col items-center bg-[#0a0a0f] font-sans text-white relative overflow-hidden">
            <MeshBackground />
            {/* ── Desktop Top Nav ── */}
            <nav className="hidden md:block sticky top-0 z-40 bg-gray-900/60 backdrop-blur-xl border-b border-white/5">
                <div className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-10">
                            <Link href="/teacher/dashboard" className="flex items-center gap-2 group">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-all">
                                    <BookOpen className="w-6 h-6 text-indigo-400" />
                                </div>
                                <span className="font-black text-xl tracking-tighter text-white">VocabTeacher</span>
                            </Link>

                            <div className="flex items-center gap-1">
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

                        <div className="flex items-center gap-6">
                            <button onClick={() => setShowContactModal(true)} className="btn-glass text-[11px] uppercase tracking-widest px-4 py-2">
                                <MessageCircle className="w-4 h-4" /> Bog'lanish
                            </button>

                            <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/teacher/settings'} className="flex items-center gap-4 group cursor-pointer">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-white leading-none group-hover:text-indigo-400 transition-colors">{user?.name || 'Guest Teacher'}</p>
                                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mt-1">{user?.role === 'admin' ? 'Admin' : 'Teacher'}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                        {(user?.name || 'T').charAt(0).toUpperCase()}
                                    </div>
                                </Link>
                                <button onClick={() => setShowLogoutModal(true)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Mobile Bottom Nav ── */}
            <nav className="md:hidden mobile-bottom-nav">
                {navItems.filter(item => item.name !== 'Settings').map(item => {
                    const active = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-400 scale-110' : 'text-white/40'}`}>
                            <item.icon className={`w-6 h-6 ${active ? 'fill-indigo-400/20' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
                        </Link>
                    );
                })}
                <button onClick={() => setShowContactModal(true)} className="flex flex-col items-center gap-1 text-white/40">
                    <MessageCircle className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Bog'lanish</span>
                </button>
                <button onClick={() => setShowLogoutModal(true)} className="flex flex-col items-center gap-1 text-red-500/60">
                    <LogOut className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
                </button>
            </nav>

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

            {/* Contact Modal */}
            {mounted && showContactModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
                    <div className="w-[95%] max-w-md rounded-[2.5rem] p-8 relative shadow-2xl animate-fade-in"
                        style={{ background: 'linear-gradient(160deg,#13111f,#0f0d1e)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <button onClick={() => setShowContactModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5 text-white/50" />
                        </button>
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <MessageCircle className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black text-center mb-2" style={{ color: '#ffffff' }}>Bog'lanish</h2>
                        <p className="text-center text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Biz bilan quyidagi tarmoqlar orqali bog'lanishingiz mumkin</p>
                        <div className="space-y-3">
                            <a href="tel:+998889893631" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"><Phone className="w-5 h-5 text-emerald-400" /></div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Telefon</p>
                                        <p className="text-sm font-black" style={{ color: '#ffffff' }}>+998 88 989 36 31</p>
                                    </div>
                                </div>
                                <X className="w-4 h-4 text-white/20 rotate-45" />
                            </a>
                            <a href="https://t.me/muhamadali_oo1" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20"><Send className="w-5 h-5 text-sky-400" /></div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Telegram</p>
                                        <p className="text-sm font-black" style={{ color: '#ffffff' }}>@muhamadali_oo1</p>
                                    </div>
                                </div>
                                <X className="w-4 h-4 text-white/20 rotate-45" />
                            </a>
                            <a href="https://www.instagram.com/_just_ali.__?igsh=cHYwb3J5dHdyb3hk" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20"><Instagram className="w-5 h-5 text-pink-400" /></div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Instagram</p>
                                        <p className="text-sm font-black" style={{ color: '#ffffff' }}>just_ali</p>
                                    </div>
                                </div>
                                <X className="w-4 h-4 text-white/20 rotate-45" />
                            </a>
                        </div>
                        <button onClick={() => setShowContactModal(false)} className="w-full mt-8 py-4 rounded-2xl font-black text-white text-sm bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all">
                            Yopish
                        </button>
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
