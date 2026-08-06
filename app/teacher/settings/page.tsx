'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { User, Mail, Shield, Star, Phone, MessageCircle, Instagram, ChevronRight } from 'lucide-react';

export default function TeacherSettings() {
    const { user } = useAuth();
    const [celebrationEnabled, setCelebrationEnabled] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCelebrationEnabled(localStorage.getItem('teacher_celebration_enabled') === 'true');
        }
    }, []);

    if (!user) return null;

    const toggleCelebration = () => {
        const newVal = !celebrationEnabled;
        setCelebrationEnabled(newVal);
        if (typeof window !== 'undefined') {
            localStorage.setItem('teacher_celebration_enabled', String(newVal));
        }
    };

    const infoRows = [
        {
            icon: <Mail className="w-5 h-5" />,
            label: 'Email Address',
            value: user.email,
            badge: <span className="badge badge-success">Verified</span>,
            iconBg: 'rgba(99,102,241,0.10)',
            iconColor: '#818cf8',
            borderColor: 'rgba(99,102,241,0.15)',
        },
        {
            icon: <Shield className="w-5 h-5" />,
            label: 'Account Role',
            value: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            iconBg: 'rgba(16,185,129,0.10)',
            iconColor: '#34d399',
            borderColor: 'rgba(16,185,129,0.15)',
        },
    ];

    const contactLinks = [
        {
            href: 'tel:+998889893631',
            icon: <Phone className="w-5 h-5" />,
            label: 'Telefon',
            value: '+998 88 989 36 31',
            iconBg: 'rgba(16,185,129,0.12)',
            iconColor: '#34d399',
        },
        {
            href: 'https://t.me/muhamadali_oo1',
            icon: <MessageCircle className="w-5 h-5" />,
            label: 'Telegram',
            value: '@muhamadali_oo1',
            iconBg: 'rgba(14,165,233,0.12)',
            iconColor: '#38bdf8',
        },
        {
            href: 'https://www.instagram.com/_just_ali.__',
            icon: <Instagram className="w-5 h-5" />,
            label: 'Instagram',
            value: '@_just_ali.__',
            iconBg: 'rgba(236,72,153,0.12)',
            iconColor: '#f472b6',
        },
    ];

    return (
        <div className="page-container animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="card flex flex-col items-center text-center gap-4 py-10">
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center font-black text-3xl text-white shadow-xl"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                boxShadow: '0 8px 32px -8px rgba(99,102,241,0.45)',
                            }}
                        >
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="card-title">{user.name}</h2>
                            <span className="badge badge-primary mt-2">Teacher Account</span>
                        </div>
                        {user.teacherCode && (
                            <div
                                className="w-full rounded-xl p-4 mt-2 text-center"
                                style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}
                            >
                                <p className="form-label mb-1">Teacher Code</p>
                                <p className="font-black text-2xl tracking-widest" style={{ color: '#818cf8' }}>
                                    {user.teacherCode}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Account Info */}
                    <div className="card">
                        <h3 className="card-title flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                            Account Information
                        </h3>
                        <div className="flex flex-col gap-3">
                            {infoRows.map((row, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: row.iconBg, color: row.iconColor, border: `1px solid ${row.borderColor}` }}
                                        >
                                            {row.icon}
                                        </div>
                                        <div>
                                            <p className="form-label mb-0.5">{row.label}</p>
                                            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{row.value}</p>
                                        </div>
                                    </div>
                                    {row.badge}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Game Settings */}
                    <div className="card">
                        <h3 className="card-title flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <Star className="w-5 h-5" style={{ color: '#fbbf24' }} />
                            Game Settings
                        </h3>
                        <div
                            className="flex items-center justify-between p-4 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
                        >
                            <div className="flex-1 pr-6">
                                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                    Final Celebration Animation
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    Play a premium award ceremony with confetti and podiums when all students finish.
                                </p>
                            </div>
                            <button
                                onClick={toggleCelebration}
                                className="flex-shrink-0 w-12 h-6 rounded-full p-0.5 transition-all duration-300"
                                style={{
                                    background: celebrationEnabled ? 'var(--color-accent)' : 'rgba(255,255,255,0.12)',
                                    boxShadow: celebrationEnabled ? '0 0 12px var(--color-accent-glow)' : 'none',
                                }}
                                role="switch"
                                aria-checked={celebrationEnabled}
                            >
                                <div
                                    className="w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"
                                    style={{ transform: celebrationEnabled ? 'translateX(24px)' : 'translateX(0)' }}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Support & Contact */}
                    <div className="card">
                        <h3 className="card-title flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <Shield className="w-5 h-5" style={{ color: '#818cf8' }} />
                            Bog'lanish & Qo'llab-quvvatlash
                        </h3>

                        <div
                            className="p-4 rounded-xl mb-4 text-sm"
                            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#a5b4fc' }}
                        >
                            Muammo chiqsa va sayt ishlashda qiyinchilik bo'lsa, quyidagi manzillar orqali bog'lanishingiz mumkin.
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {contactLinks.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 rounded-xl transition-all group"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = link.iconColor + '44'; (e.currentTarget as HTMLElement).style.background = link.iconBg; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                                        style={{ background: link.iconBg, color: link.iconColor }}
                                    >
                                        {link.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="form-label mb-0.5">{link.label}</p>
                                        <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{link.value}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Pro Tip */}
                    <div
                        className="card relative overflow-hidden"
                        style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)' }}
                    >
                        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl" style={{ background: 'rgba(99,102,241,0.12)' }} />
                        <div className="relative z-10 text-center">
                            <p className="font-black text-base mb-2" style={{ color: 'var(--text-primary)' }}>💡 Pro Tip</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.7 }}>
                                Use the <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Smart Bulk Import</span> in your unit details to quickly add hundreds of words at once from your existing lists.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
