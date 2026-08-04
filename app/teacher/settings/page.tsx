'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { User, Mail, Shield, BookOpen, Star } from 'lucide-react';

export default function TeacherSettings() {
    const { user } = useAuth();
    const [celebrationEnabled, setCelebrationEnabled] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCelebrationEnabled(localStorage.getItem('teacher_celebration_enabled') === 'true');
        }
    }, []);

    if (!user) return null;

    return (
        <div className="p-8 max-w-4xl mx-auto flex flex-col gap-10 animate-fade-in">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
                    Settings
                </h1>
                <p className="text-lg text-gray-400 font-medium">
                    Manage your account and preferences
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="card text-center flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-indigo-600 shadow-xl flex items-center justify-center text-white font-black text-3xl mb-4 ring-4 ring-gray-900">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-primary/20">
                            Teacher Account
                        </span>
                    </div>
                </div>

                {/* Account Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="card space-y-6 !p-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-4">
                            <User className="w-5 h-5 text-primary" />
                            Account Information
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-gray-800 rounded-xl text-gray-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Email Address</p>
                                        <p className="text-white font-medium">{user.email}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Verified</span>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-gray-800 rounded-xl text-gray-400">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Role</p>
                                        <p className="text-white font-medium capitalize">{user.role}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Game Settings */}
                    <div className="card space-y-6 !p-8">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-4">
                            <Star className="w-5 h-5 text-amber-400" />
                            Game Settings
                        </h3>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div>
                                <p className="text-white font-medium">Final Celebration Animation</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                                    Play a premium award ceremony with fireworks and podiums when all students finish the vocabulary session.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    const newVal = !celebrationEnabled;
                                    setCelebrationEnabled(newVal);
                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem('teacher_celebration_enabled', String(newVal));
                                    }
                                }}
                                className={`w-14 h-8 rounded-full p-1 transition-colors ${celebrationEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${celebrationEnabled ? 'translate-x-6 shadow-md' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Support & Contact Section */}
                    <div className="card space-y-6 !p-8">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-400" />
                                Bog'lanish & Qo'llab-quvvatlash
                            </h3>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-4">
                            <p className="text-sm text-indigo-300 font-medium">
                                Muammo chiqsa va sayt qatib qolsa, quyidagi manzillar orqali bog'lanishingiz mumkin:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <a href="tel:+998889893631" className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <User className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Telefon</p>
                                    <p className="text-sm font-black text-white">+998 88 989 36 31</p>
                                </div>
                            </a>

                            <a href="https://t.me/muhamadali_oo1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-sky-500/30 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
                                    <Mail className="w-5 h-5 text-sky-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Telegram</p>
                                    <p className="text-sm font-black text-white">@muhamadali_oo1</p>
                                </div>
                            </a>

                            <a href="https://www.instagram.com/_just_ali.__?igsh=cHYwb3J5dHdyb3hk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/30 transition-all group">
                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform">
                                    <User className="w-5 h-5 text-pink-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Instagram</p>
                                    <p className="text-sm font-black text-white">just_ali</p>
                                </div>
                            </a>
                        </div>
                    </div>

                    <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 text-center relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                        <h4 className="text-white font-bold mb-2 relative z-10">Pro Tip</h4>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-md mx-auto relative z-10 font-medium">
                            Use the <span className="text-primary">Smart Bulk Import</span> in your unit details to quickly add hundreds of words at once from your existing lists.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
