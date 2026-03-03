'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Users, LogOut, ShieldCheck, Menu, X, Phone, Instagram, Send, MessageCircle } from 'lucide-react';

function AdminNavContent() {
    const { user, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (user.role !== 'admin') {
                router.push('/teacher/dashboard'); // Redirect unauthorized users
            }
        }
    }, [user, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const navItems = [
        { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Users', href: '/admin/dashboard?tab=users', icon: Users },
        { name: 'Groups', href: '/admin/dashboard?tab=groups', icon: Users },
    ];

    if (loading || !user || user.role !== 'admin') return null;

    return (
        <>
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

                                <Link href="/admin/dashboard" className="flex items-center gap-2 group">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 group-hover:bg-indigo-500/30 transition-all">
                                        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                                    </div>
                                    <span className="font-black text-lg md:text-xl tracking-tighter text-white">AdminPanel</span>
                                </Link>
                            </div>

                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => {
                                    const currentTab = searchParams.get('tab') || '';
                                    const isActive = item.name === 'Overview' ? !currentTab : currentTab === item.name.toLowerCase();
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
                            <button onClick={() => setShowContactModal(true)} className="hidden md:flex btn-glass text-[11px] uppercase tracking-widest px-4 py-2">
                                <MessageCircle className="w-4 h-4" /> Bog'lanish
                            </button>

                            <div className="flex items-center gap-3 md:gap-4 md:pl-6 md:border-l md:border-white/10">
                                <Link href="/admin/dashboard" className="flex items-center gap-3 md:gap-4 group cursor-pointer">
                                    <div className="hidden md:block text-right">
                                        <p className="text-sm font-black text-white leading-none group-hover:text-indigo-400 transition-colors">{user.name}</p>
                                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mt-1">Administrator</p>
                                    </div>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs md:text-sm shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
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
            {mounted && isMobileMenuOpen && typeof document !== 'undefined' ? createPortal(
                <div className="fixed inset-0 z-[9999] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="absolute top-0 left-0 bottom-0 w-[80vw] max-w-[320px] bg-[#0f0d1e] border-r border-white/5 shadow-2xl flex flex-col pt-6 font-sans">
                        <div className="px-6 mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <span className="font-black text-lg tracking-tighter text-white block leading-tight">AdminPanel</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Administrator</span>
                                </div>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-xl text-white/60">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 space-y-2">
                            {navItems.map(item => {
                                const currentTab = searchParams.get('tab') || '';
                                const isActive = item.name === 'Overview' ? !currentTab : currentTab === item.name.toLowerCase();
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
                        </div>

                        <div className="p-4 mt-auto border-t border-white/5 space-y-2">
                            <button onClick={() => { setIsMobileMenuOpen(false); setShowContactModal(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-transparent hover:bg-white/5 hover:border-white/5 transition-all text-white/60">
                                <div className="p-2 rounded-xl bg-white/5"><MessageCircle className="w-5 h-5" /></div>
                                <span className="font-black text-sm">Bog'lanish</span>
                            </button>
                            <button onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-red-500/10 bg-red-500/5 text-red-400">
                                <div className="p-2 rounded-xl bg-red-500/10"><LogOut className="w-5 h-5" /></div>
                                <span className="font-black text-sm">Tizimdan chiqish</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            ) : null}

            {mounted && showLogoutModal && typeof document !== 'undefined' ? createPortal(
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
            ) : null}

            {/* Contact Modal */}
            {mounted && showContactModal ? createPortal(
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
            ) : null}
        </>
    );
}

const MeshBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[35%] h-[35%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[20%] left-[60%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse delay-1000" />
    </div>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center min-h-[100svh] w-full bg-[#0a0a0f] font-sans text-white relative overflow-x-hidden">
            <MeshBackground />
            <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
                <AdminNavContent />
                <main className="w-[95%] lg:w-[80%] max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10 flex-1 flex flex-col min-w-0">
                    {children}
                </main>
            </Suspense>
        </div>
    );
}
