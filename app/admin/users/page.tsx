'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Search, Loader2, MoreVertical, Shield, GraduationCap, User as UserIcon, UserPlus, X, Edit3, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
    createdAt: string;
    totalWordsSeen: number;
    teacherCode?: string;
    teacherId?: string | null;
}

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Create teacher form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newTeacherCode, setNewTeacherCode] = useState('');
    const [adminSecret, setAdminSecret] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    // Edit code state
    const [editingCodeUserId, setEditingCodeUserId] = useState<string | null>(null);
    const [tempCode, setTempCode] = useState('');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsers();
        }
    }, [user]);

    useEffect(() => {
        if (users.length > 0) {
            const filtered = users.filter(u =>
                (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                setFilteredUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeacher = async (e: FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');
        setCreateSuccess('');
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail,
                    password: newPassword,
                    teacherCode: newTeacherCode,
                    adminSecret
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setCreateError(data.message || 'Failed to create teacher');
            } else {
                setCreateSuccess(`✅ Teacher "${newName}" created!`);
                setNewName(''); setNewEmail(''); setNewPassword(''); setNewTeacherCode(''); setAdminSecret('');
                setShowCreateForm(false);
                fetchUsers();
            }
        } catch {
            setCreateError('Network error');
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateCode = async (userId: string) => {
        if (!tempCode.trim()) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}/teacher-code`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherCode: tempCode.toUpperCase().trim() }),
            });
            if (res.ok) {
                setEditingCodeUserId(null);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.message || 'Xato yuz berdi');
            }
        } catch (error) {
            console.error('Failed to update code:', error);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">View and manage all registered users</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full sm:w-64"
                        />
                    </div>
                    <button
                        onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(''); setCreateSuccess(''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4" />
                        Teacher yaratish
                    </button>
                </div>
            </div>

            {/* Create Teacher Form */}
            {showCreateForm && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-emerald-500" />
                            Yangi Teacher Akkaunt
                        </h2>
                        <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {createError && <p className="text-red-500 text-sm mb-3">{createError}</p>}
                    {createSuccess && <p className="text-emerald-500 text-sm mb-3">{createSuccess}</p>}
                    <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Ism</label>
                            <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ali Valiyev"
                                className="input w-full" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="teacher@email.com"
                                className="input w-full" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Parol</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="••••••••"
                                className="input w-full" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Custom Teacher Code (Optional)</label>
                            <input value={newTeacherCode} onChange={e => setNewTeacherCode(e.target.value)} placeholder="T-XXXXXX"
                                className="input w-full uppercase" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Secret Key</label>
                            <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required placeholder="Secret..."
                                className="input w-full" />
                        </div>
                        <div className="sm:col-span-2">
                            <button type="submit" disabled={creating}
                                className="btn-primary w-full disabled:opacity-50">
                                {creating ? 'Yaratilmoqda...' : 'Teacher akkaunt yaratish'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
                <div className="overflow-x-auto min-w-0 w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap sm:whitespace-normal">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 sm:px-6 py-4">User</th>
                                <th className="px-4 sm:px-6 py-4">Role / Code</th>
                                <th className="px-4 sm:px-6 py-4">Joined</th>
                                <th className="px-4 sm:px-6 py-4">Activity / Coins</th>
                                <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredUsers.map((u: any) => (
                                <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 sm:px-6 py-4 max-w-[200px] sm:max-w-none">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 shrink-0">
                                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        <Badge role={u.role} />
                                        {u.role === 'teacher' && (
                                            <div className="mt-1 flex items-center gap-2">
                                                {editingCodeUserId === u._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            value={tempCode}
                                                            onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                                                            className="text-[10px] font-black w-24 bg-white dark:bg-gray-800 border border-indigo-500 rounded px-1 py-0.5 outline-none text-indigo-500"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateCode(u._id);
                                                                if (e.key === 'Escape') setEditingCodeUserId(null);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateCode(u._id)}
                                                            className="p-1 hover:text-emerald-500 transition-colors"
                                                            title="Saqlash"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingCodeUserId(null)}
                                                            className="p-1 hover:text-red-500 transition-colors"
                                                            title="Bekor qilish"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => {
                                                            setEditingCodeUserId(u._id);
                                                            setTempCode(u.teacherCode || '');
                                                        }}
                                                        className="group cursor-pointer flex items-center gap-1.5 font-mono text-[10px] font-black text-indigo-500 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 hover:bg-indigo-500/10 transition-all"
                                                        title="Kodni tahrirlash"
                                                    >
                                                        <span>{u.teacherCode || 'SET CODE'}</span>
                                                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-white">{u.totalWordsSeen}</span>
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">words seen</span>
                                            </div>
                                            {u.role === 'student' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-amber-500">{u.coinBalance || 0}</span>
                                                    <span className="text-[10px] text-amber-500/60 uppercase font-bold">MT Coins</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {u.role === 'student' && (
                                                <>
                                                    <select
                                                        value={u.teacherId || ''}
                                                        onChange={(e) => {
                                                            const teacherId = e.target.value;
                                                            fetch(`/api/admin/students/${u._id}/assign-teacher`, {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ teacherId: teacherId || null })
                                                            }).then(() => fetchUsers());
                                                        }}
                                                        className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="">No Teacher</option>
                                                        {users.filter(user => user.role === 'teacher').map(t => (
                                                            <option key={t._id} value={t._id}>{t.name}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Promote ${u.name} to Teacher?`)) {
                                                                fetch(`/api/admin/users/${u._id}/role`, {
                                                                    method: 'PATCH',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ role: 'teacher' })
                                                                }).then(() => fetchUsers());
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500/20 transition-all"
                                                    >
                                                        Promote
                                                    </button>
                                                </>
                                            )}
                                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No users found matching &quot;{searchTerm}&quot;
                    </div>
                )}
            </div>
        </div>
    );
}

function Badge({ role }: { role: string }) {
    const config = {
        admin: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Shield },
        teacher: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: GraduationCap },
        student: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: UserIcon },
    };

    const { color, icon: Icon } = config[role as keyof typeof config] || config.student;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
    );
}
