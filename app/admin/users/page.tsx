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
            
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">View and manage all registered users</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="input-group" style={{ width: '240px' }}>
                        <Search className="input-group-icon" style={{ width: '16px', height: '16px' }} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button
                        onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(''); setCreateSuccess(''); }}
                        className="btn-base btn-accent"
                    >
                        <UserPlus style={{ width: '16px', height: '16px' }} />
                        Teacher yaratish
                    </button>
                </div>
            </div>

            {/* Create Teacher Form */}
            {showCreateForm && (
                <div className="card animate-fade-in" style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.03)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="card-title flex items-center gap-2">
                            <GraduationCap style={{ width: '20px', height: '20px', color: 'var(--color-accent)' }} />
                            Yangi Teacher Akkaunt
                        </h2>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="btn-base btn-ghost btn-sm"
                            style={{ width: '36px', padding: '0' }}
                        >
                            <X style={{ width: '16px', height: '16px' }} />
                        </button>
                    </div>
                    {createError && <p className="form-error mb-4">{createError}</p>}
                    {createSuccess && <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-accent)' }}>{createSuccess}</p>}
                    <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="form-field">
                            <label className="form-label">Ism</label>
                            <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ali Valiyev" className="input" />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Email</label>
                            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="teacher@email.com" className="input" />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Parol</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="••••••••" className="input" />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Teacher Code (Ixtiyoriy)</label>
                            <input value={newTeacherCode} onChange={e => setNewTeacherCode(e.target.value)} placeholder="T-XXXXXX" className="input uppercase" />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Admin Secret Key</label>
                            <input type="password" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required placeholder="Secret..." className="input" />
                        </div>
                        <div className="sm:col-span-2">
                            <button type="submit" disabled={creating} className="btn-base btn-accent" style={{ width: '100%' }}>
                                {creating ? 'Yaratilmoqda...' : 'Teacher akkaunt yaratish'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '24px' }}>User</th>
                                <th>Role / Code</th>
                                <th>Joined</th>
                                <th>Activity</th>
                                <th style={{ paddingRight: '24px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u: any) => (
                                <tr key={u._id}>
                                    <td style={{ paddingLeft: '24px', maxWidth: '220px' }}>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex items-center justify-center font-black text-sm flex-shrink-0"
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                    color: '#fff',
                                                }}
                                            >
                                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                                                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge role={u.role} />
                                        {u.role === 'teacher' && (
                                            <div className="mt-2 flex items-center gap-2">
                                                {editingCodeUserId === u._id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            value={tempCode}
                                                            onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                                                            className="input"
                                                            style={{ height: '32px', fontSize: '12px', width: '96px', padding: '0 8px' }}
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateCode(u._id);
                                                                if (e.key === 'Escape') setEditingCodeUserId(null);
                                                            }}
                                                        />
                                                        <button onClick={() => handleUpdateCode(u._id)} className="btn-base btn-ghost btn-sm" style={{ width: '32px', padding: 0 }}>
                                                            <Check style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                        <button onClick={() => setEditingCodeUserId(null)} className="btn-base btn-danger btn-sm" style={{ width: '32px', padding: 0 }}>
                                                            <X style={{ width: '14px', height: '14px' }} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => { setEditingCodeUserId(u._id); setTempCode(u.teacherCode || ''); }}
                                                        className="cursor-pointer group flex items-center gap-1.5 font-mono font-black"
                                                        title="Kodni tahrirlash"
                                                        style={{
                                                            fontSize: '11px', color: '#818cf8',
                                                            background: 'rgba(99,102,241,0.08)',
                                                            padding: '3px 8px', borderRadius: '6px',
                                                            border: '1px solid rgba(99,102,241,0.18)',
                                                        }}
                                                    >
                                                        {u.teacherCode || 'SET CODE'}
                                                        <Edit3 style={{ width: '10px', height: '10px', opacity: 0.5 }} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {u.totalWordsSeen} <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>words</span>
                                            </span>
                                            {u.role === 'student' && (
                                                <span className="text-xs font-black" style={{ color: '#fbbf24' }}>
                                                    {u.coinBalance || 0} <span className="font-normal" style={{ color: 'rgba(251,191,36,0.6)' }}>coins</span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ paddingRight: '24px' }}>
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
                                                        className="select"
                                                        style={{ height: '36px', fontSize: '12px', width: 'auto', minWidth: '120px' }}
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
                                                        className="btn-base btn-secondary btn-sm"
                                                    >
                                                        Promote
                                                    </button>
                                                </>
                                            )}
                                            <button className="btn-base btn-ghost btn-sm" style={{ width: '36px', padding: 0 }}>
                                                <MoreVertical style={{ width: '16px', height: '16px' }} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Search style={{ width: '24px', height: '24px' }} /></div>
                        <p className="empty-state-title">No results</p>
                        <p className="empty-state-desc">No users found matching &quot;{searchTerm}&quot;</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Badge({ role }: { role: string }) {
    const config: Record<string, { cls: string; icon: any }> = {
        admin:   { cls: 'badge badge-primary', icon: Shield },
        teacher: { cls: 'badge badge-success', icon: GraduationCap },
        student: { cls: 'badge badge-ghost',   icon: UserIcon },
    };
    const { cls, icon: Icon } = config[role] || config.student;
    return (
        <span className={cls}>
            <Icon style={{ width: '12px', height: '12px' }} />
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
    );
}
