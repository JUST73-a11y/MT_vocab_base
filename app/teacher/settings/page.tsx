'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { User, Mail, Shield, BookOpen } from 'lucide-react';

export default function TeacherSettings() {
    const { user } = useAuth();

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

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-gray-800 rounded-xl text-gray-400">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-0.5">Teaching Tools</p>
                                        <p className="text-white font-medium">Smart bulk import enabled</p>
                                    </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                            </div>
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
