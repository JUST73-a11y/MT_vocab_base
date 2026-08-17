'use client';
import { useEffect, useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TABS = ['Barchasi', 'Mavzular', 'Kartalar', 'Energiya', 'Boshqa'];
const TYPE_TAB: Record<string, string> = {
    THEME_CREATOR_ACCESS: 'Mavzular',
    SMART_CARD: 'Kartalar',
    DOLLAR_CARD: 'Kartalar',
    ENERGY_STACK: 'Energiya',
    CUSTOM: 'Boshqa',
};
const TYPE_EMOJI: Record<string, string> = {
    THEME_CREATOR_ACCESS: '🎨',
    SMART_CARD: '💳',
    DOLLAR_CARD: '💵',
    ENERGY_STACK: '⚡',
    CUSTOM: '🎁',
};

function formatRemaining(ms: number) {
    if (ms <= 0) return '0s';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return h + 's ' + m + 'd';
    return m + 'd';
}

export default function StudentInventoryPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [entitlements, setEntitlements] = useState<any>({});
    const [purchases, setPurchases] = useState<any[]>([]);
    const [tab, setTab] = useState('Barchasi');
    const [loading, setLoading] = useState(true);
    const [using, setUsing] = useState<string | null>(null);
    const [remaining, setRemaining] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        const [invRes, entRes, purRes] = await Promise.all([
            fetch('/api/student/inventory'),
            fetch('/api/student/entitlements'),
            fetch('/api/student/purchases'),
        ]);
        const [invData, entData, purData] = await Promise.all([invRes.json(), entRes.json(), purRes.json()]);
        setItems(invData.items || []);
        setEntitlements(entData || {});
        setPurchases(purData.purchases || []);
        const tc = entData?.THEME_CREATOR;
        if (tc?.active && tc.remainingMs > 0) setRemaining(tc.remainingMs);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Live countdown for theme creator
    useEffect(() => {
        if (remaining <= 0) return;
        const t = setInterval(() => {
            setRemaining(r => {
                if (r <= 1000) { clearInterval(t); return 0; }
                return r - 1000;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [remaining]);

    const handleUse = async (itemId: string) => {
        setUsing(itemId);
        await fetch('/api/student/inventory/' + itemId + '/use', { method: 'POST' });
        await load();
        setUsing(null);
    };

    const tc = entitlements.THEME_CREATOR;
    const filtered = tab === 'Barchasi' ? items : items.filter(i => TYPE_TAB[i.itemType] === tab);

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-6" style={{ position: 'relative', zIndex: 10 }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ background: 'var(--theme-btn-bg, #6366f1)' }}>🎒</div>
                <div>
                    <h1 className="text-2xl font-black" style={{ color: 'var(--theme-text, #fff)' }}>Inventar</h1>
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>Sotib olingan mukofotlaringiz</p>
                </div>
            </div>

            {/* Theme Creator Entitlement Banner */}
            {tc && (
                <div className="mb-6 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap"
                    style={{
                        background: tc.active && remaining > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid ' + (tc.active && remaining > 0 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'),
                        borderRadius: 'var(--theme-radius-card, 16px)',
                    }}>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🎨</span>
                        <div>
                            <div className="font-bold" style={{ color: 'var(--theme-text, #fff)' }}>Mavzu Yaratish Huquqi</div>
                            {tc.active && remaining > 0 ? (
                                <div className="text-sm" style={{ color: '#a5b4fc' }}>
                                    ✅ Faol — {formatRemaining(remaining)} qoldi
                                </div>
                            ) : (
                                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>🔒 Muddati tugagan</div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => router.push('/student/theme')}
                            className="px-4 py-2 text-sm font-bold rounded-xl"
                            style={{ background: 'var(--theme-btn-bg, #6366f1)', color: 'var(--theme-btn-text, #fff)' }}>
                            {tc.active && remaining > 0 ? '🎨 Mavzu yaratish' : '🔄 Do\'konga qaytish'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap mb-6">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="px-4 py-2 text-sm font-bold transition-all"
                        style={{
                            borderRadius: 'var(--theme-radius-btn, 999px)',
                            background: tab === t ? 'var(--theme-btn-bg, #6366f1)' : 'var(--theme-card-bg, rgba(255,255,255,0.05))',
                            color: tab === t ? 'var(--theme-btn-text, #fff)' : 'var(--theme-text-muted, rgba(255,255,255,0.6))',
                            border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                        }}>
                        {t}
                    </button>
                ))}
            </div>

            {/* Items */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-b-2"
                        style={{ borderColor: 'var(--theme-primary, #6366f1)' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                    <span className="text-5xl">📦</span>
                    <p className="text-lg font-semibold" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>
                        Inventaringiz bo'sh
                    </p>
                    <button onClick={() => router.push('/student/shop')}
                        className="px-6 py-3 font-bold rounded-2xl"
                        style={{ background: 'var(--theme-btn-bg, #6366f1)', color: 'var(--theme-btn-text, #fff)' }}>
                        Do'konga o'tish
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                    {filtered.map(item => {
                        const emoji = TYPE_EMOJI[item.itemType] || '🎁';
                        const isDollar = item.itemType === 'DOLLAR_CARD';
                        const isEnergy = item.itemType === 'ENERGY_STACK';
                        const isSmart = item.itemType === 'SMART_CARD';
                        return (
                            <div key={item._id} className="p-5 rounded-2xl flex flex-col gap-3"
                                style={{
                                    background: 'var(--theme-card-bg, rgba(255,255,255,0.05))',
                                    border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                                    borderRadius: 'var(--theme-radius-card, 16px)',
                                }}>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{emoji}</span>
                                    <div>
                                        <div className="font-bold text-sm" style={{ color: 'var(--theme-text, #fff)' }}>{item.itemName}</div>
                                        <div className="text-xs" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>
                                            {isDollar && item.metadata?.denomination ? `$${item.metadata.denomination} nominal` : ''}
                                            {isEnergy && item.metadata?.energyAmount ? `+${item.metadata.energyAmount} energiya` : ''}
                                        </div>
                                    </div>
                                    {item.quantity > 1 && (
                                        <span className="ml-auto font-black text-lg" style={{ color: 'var(--theme-primary, #6366f1)' }}>×{item.quantity}</span>
                                    )}
                                </div>
                                {isDollar && (
                                    <div className="text-xs px-3 py-1 rounded-full self-start font-semibold"
                                        style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
                                        Kolleksiya
                                    </div>
                                )}
                                {(isEnergy || isSmart) && (
                                    <button onClick={() => handleUse(item._id)} disabled={using === item._id}
                                        className="py-2 font-bold text-sm rounded-xl transition-all"
                                        style={{ background: 'var(--theme-btn-bg, #6366f1)', color: 'var(--theme-btn-text, #fff)', opacity: using === item._id ? 0.6 : 1 }}>
                                        {using === item._id ? '...' : '⚡ Ishlatish'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent purchases */}
            {purchases.length > 0 && (
                <div>
                    <h2 className="text-lg font-black mb-4" style={{ color: 'var(--theme-text, #fff)' }}>📋 Xaridlar tarixi</h2>
                    <div className="flex flex-col gap-2">
                        {purchases.slice(0, 10).map(p => (
                            <div key={p._id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                                style={{ background: 'var(--theme-card-bg, rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div>
                                    <div className="font-semibold text-sm" style={{ color: 'var(--theme-text, #fff)' }}>{p.itemNameSnapshot}</div>
                                    <div className="text-xs" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>
                                        {new Date(p.purchasedAt || p.createdAt).toLocaleDateString('uz-UZ')}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-black" style={{ color: '#ef4444' }}>-{p.priceSnapshot} MT</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                        style={{
                                            background: p.status === 'COMPLETED' ? 'rgba(16,185,129,0.2)' : p.status === 'PENDING' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                                            color: p.status === 'COMPLETED' ? '#6ee7b7' : p.status === 'PENDING' ? '#fcd34d' : '#fca5a5',
                                        }}>
                                        {p.status === 'COMPLETED' ? 'Bajarildi' : p.status === 'PENDING' ? 'Kutmoqda' : p.status === 'REJECTED' ? 'Rad etildi' : p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}