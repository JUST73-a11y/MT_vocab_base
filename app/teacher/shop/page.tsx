'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, X, Check, AlertCircle, Edit2, Power, Trash2, Clock, Upload, Image as ImageIcon } from 'lucide-react';

const ITEM_TYPES = [
    { value: 'THEME_CREATOR_ACCESS', label: '🎨 Mavzu Yaratish Huquqi' },
    { value: 'SMART_CARD', label: '💳 Smart Karta' },
    { value: 'DOLLAR_CARD', label: '💵 Dollar Karta' },
    { value: 'ENERGY_STACK', label: '⚡ Energiya' },
    { value: 'CUSTOM', label: '🎁 Maxsus' },
];
const STATUS_TABS = ['Barcha xaridlar', 'Kutayotganlar', 'Bajarildi', 'Rad etildi'];

function badge(status: string) {
    const map: Record<string, [string, string]> = {
        COMPLETED: ['rgba(16,185,129,0.2)', '#6ee7b7'],
        PENDING: ['rgba(245,158,11,0.2)', '#fcd34d'],
        REJECTED: ['rgba(239,68,68,0.2)', '#fca5a5'],
        REFUNDED: ['rgba(99,102,241,0.2)', '#a5b4fc'],
    };
    const [bg, color] = map[status] || ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.6)'];
    const label: Record<string, string> = { COMPLETED: 'Bajarildi', PENDING: 'Kutmoqda', REJECTED: 'Rad etildi', REFUNDED: 'Qaytarildi', CANCELLED: 'Bekor' };
    return <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: bg, color }}>{label[status] || status}</span>;
}

export default function TeacherShopPage() {
    const [items, setItems] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'items' | 'purchases'>('items');
    const [purchaseTab, setPurchaseTab] = useState('Barcha xaridlar');
    const [showCreate, setShowCreate] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        name: '', description: '', type: 'THEME_CREATOR_ACCESS', price: 800,
        isUnlimitedStock: true, stock: 10, requiresApproval: false,
        visibilityType: 'ALL', imageUrl: '',
        effectType: '', effectAmount: 0,
    });

    const load = useCallback(async () => {
        setLoading(true);
        const [iRes, pRes, sRes] = await Promise.all([
            fetch('/api/teacher/shop/items'),
            fetch('/api/teacher/shop/purchases'),
            fetch('/api/teacher/shop/stats'),
        ]);
        const [iData, pData, sData] = await Promise.all([iRes.json(), pRes.json(), sRes.json()]);
        setItems(iData.items || []);
        setPurchases(pData.purchases || []);
        setStats(sData || {});
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const resetForm = () => setForm({ name: '', description: '', type: 'THEME_CREATOR_ACCESS', price: 800, isUnlimitedStock: true, stock: 10, requiresApproval: false, visibilityType: 'ALL', imageUrl: '', effectType: '', effectAmount: 0 });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/teacher/shop/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (res.ok && data.url) {
                setForm(prev => ({ ...prev, imageUrl: data.url }));
            } else {
                alert(data.message || 'Rasm yuklashda xatolik yuz berdi');
            }
        } catch {
            alert('Fayl yuklashda tarmoq xatosi yuz berdi');
        } finally {
            setUploadingImage(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        setSubmitting(true);
        const body: any = {
            name: form.name,
            description: form.description,
            type: form.type,
            price: Math.max(0, Number(form.price) || 0),
            isUnlimitedStock: form.isUnlimitedStock,
            stock: form.isUnlimitedStock ? 0 : Math.max(0, Number(form.stock) || 0),
            requiresApproval: form.requiresApproval,
            visibilityType: form.visibilityType,
            imageUrl: form.imageUrl || null,
        };
        if (form.effectType) body.effect = { type: form.effectType, amount: Math.max(0, Number(form.effectAmount) || 0) };
        const url = editItem ? '/api/teacher/shop/items/' + editItem._id : '/api/teacher/shop/items';
        const method = editItem ? 'PATCH' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { setShowCreate(false); setEditItem(null); resetForm(); await load(); }
        setSubmitting(false);
    };

    const handleToggle = async (item: any) => {
        setActionLoading(item._id);
        await fetch('/api/teacher/shop/items/' + item._id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !item.isActive }) });
        await load();
        setActionLoading(null);
    };

    const handleApprove = async (pid: string) => {
        setActionLoading(pid);
        await fetch('/api/teacher/shop/purchases/' + pid + '/approve', { method: 'POST' });
        await load();
        setActionLoading(null);
    };

    const handleReject = async (pid: string) => {
        const note = prompt('Rad etish sababi (ixtiyoriy):') || '';
        setActionLoading(pid);
        await fetch('/api/teacher/shop/purchases/' + pid + '/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) });
        await load();
        setActionLoading(null);
    };

    const openEdit = (item: any) => {
        setForm({
            name: item.name,
            description: item.description || '',
            type: item.type,
            price: item.price,
            isUnlimitedStock: item.isUnlimitedStock,
            stock: item.stock || 10,
            requiresApproval: item.requiresApproval,
            visibilityType: item.visibilityType,
            imageUrl: item.imageUrl || '',
            effectType: item.effect?.type || '',
            effectAmount: item.effect?.amount || 0,
        });
        setEditItem(item);
        setShowCreate(true);
    };

    const filteredPurchases = purchases.filter(p => {
        if (purchaseTab === 'Barcha xaridlar') return true;
        if (purchaseTab === 'Kutayotganlar') return p.status === 'PENDING';
        if (purchaseTab === 'Bajarildi') return p.status === 'COMPLETED';
        if (purchaseTab === 'Rad etildi') return p.status === 'REJECTED';
        return true;
    });

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-6" style={{ position: 'relative', zIndex: 10 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--theme-primary, #6366f1)' }}>🛒</div>
                    <div>
                        <h1 className="text-2xl font-black" style={{ color: 'var(--theme-text, #fff)' }}>Do'kon boshqaruvi</h1>
                        <p className="text-sm" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>O'quvchilar uchun mukofotlarni boshqaring</p>
                    </div>
                </div>
                <button onClick={() => { resetForm(); setEditItem(null); setShowCreate(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 font-bold rounded-2xl cursor-pointer"
                    style={{ background: 'var(--theme-primary, #6366f1)', color: '#fff' }}>
                    <Plus className="w-4 h-4" /> Yangi mahsulot
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Jami xaridlar', value: stats.totalPurchases || 0, emoji: '🛒' },
                    { label: 'Kutayotganlar', value: stats.pendingCount || 0, emoji: '⏳', warn: (stats.pendingCount || 0) > 0 },
                    { label: 'Sarflangan MT', value: (stats.totalCoinsSpent || 0).toLocaleString(), emoji: '🪙' },
                    { label: 'Faol mahsulotlar', value: stats.activeItems || 0, emoji: '✅' },
                ].map(s => (
                    <div key={s.label} className="p-4 rounded-2xl"
                        style={{ background: s.warn ? 'rgba(245,158,11,0.15)' : 'var(--theme-card-bg, rgba(255,255,255,0.05))', border: '1px solid ' + (s.warn ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'), borderRadius: 'var(--theme-radius-card, 16px)' }}>
                        <div className="text-2xl mb-1">{s.emoji}</div>
                        <div className="text-2xl font-black" style={{ color: 'var(--theme-text, #fff)' }}>{s.value}</div>
                        <div className="text-xs" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {['items', 'purchases'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t as any)}
                        className="px-5 py-2.5 font-bold text-sm rounded-2xl cursor-pointer"
                        style={{ background: activeTab === t ? 'var(--theme-primary, #6366f1)' : 'rgba(255,255,255,0.05)', color: activeTab === t ? '#fff' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {t === 'items' ? '📦 Mahsulotlar' : '📋 Xaridlar'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-10 h-10 rounded-full border-t-2" style={{ borderColor: 'var(--theme-primary, #6366f1)' }} />
                </div>
            ) : activeTab === 'items' ? (
                items.length === 0 ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                        <span className="text-5xl">🏪</span>
                        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Do'koningizga mahsulot qo'shing</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map(item => (
                            <div key={item._id} className="p-5 rounded-2xl flex flex-col gap-3"
                                style={{ background: 'var(--theme-card-bg, rgba(255,255,255,0.05))', border: '1px solid ' + (item.isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'), borderRadius: 'var(--theme-radius-card, 16px)', opacity: item.isActive ? 1 : 0.6 }}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl shrink-0">
                                                {item.type === 'THEME_CREATOR_ACCESS' ? '🎨' : item.type === 'SMART_CARD' ? '💳' : item.type === 'DOLLAR_CARD' ? '💵' : item.type === 'ENERGY_STACK' ? '⚡' : '🎁'}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold" style={{ color: 'var(--theme-text, #fff)' }}>{item.name}</div>
                                            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{ITEM_TYPES.find(t => t.value === item.type)?.label}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)' }}><Edit2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.6)' }} /></button>
                                        <button onClick={() => handleToggle(item)} disabled={actionLoading === item._id} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" style={{ background: item.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                                            <Power className="w-3.5 h-3.5" style={{ color: item.isActive ? '#10b981' : '#ef4444' }} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="font-black text-xl" style={{ color: 'var(--theme-primary, #6366f1)' }}>🪙 {item.price}</span>
                                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        {item.isUnlimitedStock ? '∞ Cheksiz' : item.stock + ' ta qoldi'}
                                    </span>
                                </div>
                                {item.requiresApproval && <span className="text-xs text-amber-300">⏳ Tasdiqlash talab qilinadi</span>}
                                {!item.isActive && <span className="text-xs text-red-400">● Nofaol</span>}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div>
                    <div className="flex gap-2 flex-wrap mb-4">
                        {STATUS_TABS.map(t => (
                            <button key={t} onClick={() => setPurchaseTab(t)}
                                className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                                style={{ background: purchaseTab === t ? 'var(--theme-primary, #6366f1)' : 'rgba(255,255,255,0.05)', color: purchaseTab === t ? '#fff' : 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {t}
                            </button>
                        ))}
                    </div>
                    {filteredPurchases.length === 0 ? (
                        <div className="flex flex-col items-center py-16 gap-3">
                            <span className="text-4xl">📋</span>
                            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Xaridlar yo'q</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {filteredPurchases.map(p => (
                                <div key={p._id} className="flex items-center justify-between px-4 py-3 rounded-xl flex-wrap gap-3"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div>
                                        <div className="font-semibold text-sm" style={{ color: 'var(--theme-text, #fff)' }}>
                                            {(p.studentId as any)?.name || "O'quvchi"} — {p.itemNameSnapshot}
                                        </div>
                                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            🪙 {p.priceSnapshot} MT · {new Date(p.purchasedAt || p.createdAt).toLocaleString('uz-UZ')}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {badge(p.status)}
                                        {p.status === 'PENDING' && (
                                            <>
                                                <button onClick={() => handleApprove(p._id)} disabled={actionLoading === p._id}
                                                    className="px-3 py-1 text-xs font-bold rounded-lg cursor-pointer" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                                                    ✅ Tasdiqlash
                                                </button>
                                                <button onClick={() => handleReject(p._id)} disabled={actionLoading === p._id}
                                                    className="px-3 py-1 text-xs font-bold rounded-lg cursor-pointer" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                                    ❌ Rad etish
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Hidden file input for gallery upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-lg rounded-3xl p-6 flex flex-col gap-4 my-8"
                        style={{ background: 'rgba(10,15,30,0.97)', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black" style={{ color: '#fff' }}>{editItem ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h2>
                            <button onClick={() => { setShowCreate(false); setEditItem(null); resetForm(); }} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'rgba(255,255,255,0.1)' }}><X className="w-4 h-4" /></button>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Nomi *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                                placeholder="Smart Karta / Dollar Karta"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Tavsif</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                                placeholder="Mahsulot haqida qisqacha ma'lumot"
                            />
                        </div>

                        {/* Image Upload / Gallery picker */}
                        <div>
                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Mahsulot rasmi (Galereyadan upload)</label>
                            <div className="flex items-center gap-3">
                                {form.imageUrl ? (
                                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 shrink-0">
                                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setForm(p => ({ ...p, imageUrl: '' }))}
                                            className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 cursor-pointer"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center text-white/40 shrink-0">
                                        <ImageIcon className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <button
                                        type="button"
                                        disabled={uploadingImage}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        {uploadingImage ? 'Yuklanmoqda...' : 'Galereyadan rasm tanlash'}
                                    </button>
                                    <input
                                        type="text"
                                        value={form.imageUrl}
                                        onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))}
                                        className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                                        placeholder="yoki rasm URL manzili..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Turi *</label>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                                {ITEM_TYPES.map(t => <option key={t.value} value={t.value} style={{ background: '#0a0f1e' }}>{t.label}</option>)}
                            </select>
                            {form.type === 'THEME_CREATOR_ACCESS' && (
                                <p className="text-xs mt-1 text-indigo-300">⏱️ Muddat: 48 soat (avtomatik biriktiriladi)</p>
                            )}
                        </div>

                        {/* Price (strictly number) */}
                        <div>
                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Narxi (MT Tanga) *</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={form.price}
                                onChange={e => {
                                    const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setForm(p => ({ ...p, price: val as any }));
                                }}
                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-bold text-indigo-300"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                placeholder="800"
                            />
                        </div>

                        {/* Stock controls */}
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Cheksiz zaxira (Stock)</label>
                            <button
                                type="button"
                                onClick={() => setForm(p => ({ ...p, isUnlimitedStock: !p.isUnlimitedStock }))}
                                className="w-12 h-6 rounded-full transition-all relative cursor-pointer"
                                style={{ background: form.isUnlimitedStock ? 'var(--theme-primary, #6366f1)' : 'rgba(255,255,255,0.1)' }}>
                                <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: form.isUnlimitedStock ? '26px' : '2px' }} />
                            </button>
                        </div>

                        {!form.isUnlimitedStock && (
                            <div>
                                <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Mavjud soni (Stock count)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.stock}
                                    onChange={e => {
                                        const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                        setForm(p => ({ ...p, stock: val as any }));
                                    }}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-bold"
                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                                />
                            </div>
                        )}

                        {/* Approval toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-semibold block" style={{ color: 'rgba(255,255,255,0.6)' }}>O'qituvchi tasdiqlashi shart</label>
                                <p className="text-[10px] text-white/40">Sotib olinganda darhol berilmaydi, o'qituvchi tasdiqlaydi</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setForm(p => ({ ...p, requiresApproval: !p.requiresApproval }))}
                                className="w-12 h-6 rounded-full transition-all relative cursor-pointer shrink-0"
                                style={{ background: form.requiresApproval ? 'var(--theme-primary, #6366f1)' : 'rgba(255,255,255,0.1)' }}>
                                <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: form.requiresApproval ? '26px' : '2px' }} />
                            </button>
                        </div>

                        {/* Effect options */}
                        {(form.type === 'SMART_CARD' || form.type === 'ENERGY_STACK') && (
                            <div className="flex gap-3 pt-1">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Effekt turi</label>
                                    <select value={form.effectType} onChange={e => setForm(p => ({ ...p, effectType: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                                        <option value="" style={{ background: '#0a0f1e' }}>Tanlang</option>
                                        <option value="ENERGY_BONUS" style={{ background: '#0a0f1e' }}>Energiya +</option>
                                        <option value="XP_BONUS" style={{ background: '#0a0f1e' }}>XP +</option>
                                        <option value="COIN_BONUS" style={{ background: '#0a0f1e' }}>MT Tanga +</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Effekt soni</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.effectAmount}
                                        onChange={e => {
                                            const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                            setForm(p => ({ ...p, effectAmount: val as any }));
                                        }}
                                        className="w-full px-3 py-2 rounded-xl text-sm outline-none font-bold"
                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => { setShowCreate(false); setEditItem(null); resetForm(); }}
                                className="flex-1 py-3 font-bold rounded-2xl cursor-pointer" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
                                Bekor qilish
                            </button>
                            <button onClick={handleCreate} disabled={submitting || !form.name.trim() || uploadingImage}
                                className="flex-1 py-3 font-black rounded-2xl flex items-center justify-center cursor-pointer"
                                style={{ background: 'var(--theme-primary, #6366f1)', color: '#fff', opacity: submitting || !form.name.trim() || uploadingImage ? 0.6 : 1 }}>
                                {submitting ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : editItem ? '💾 Saqlash' : '➕ Yaratish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
