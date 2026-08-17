'use client';
import { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, Coins, Palette, CreditCard, DollarSign, Zap, Plus, X, Check, AlertCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['Barchasi', 'Mavzular', 'Kartalar', 'Energiya', 'Boshqa'];
const TYPE_CATEGORY: Record<string, string> = {
    THEME_CREATOR_ACCESS: 'Mavzular',
    SMART_CARD: 'Kartalar',
    DOLLAR_CARD: 'Kartalar',
    ENERGY_STACK: 'Energiya',
    CUSTOM: 'Boshqa',
};
const TYPE_ICON: Record<string, any> = {
    THEME_CREATOR_ACCESS: Palette,
    SMART_CARD: CreditCard,
    DOLLAR_CARD: DollarSign,
    ENERGY_STACK: Zap,
    CUSTOM: Plus,
};
const TYPE_EMOJI: Record<string, string> = {
    THEME_CREATOR_ACCESS: '🎨',
    SMART_CARD: '💳',
    DOLLAR_CARD: '💵',
    ENERGY_STACK: '⚡',
    CUSTOM: '🎁',
};

export default function StudentShopPage() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [balance, setBalance] = useState(0);
    const [category, setCategory] = useState('Barchasi');
    const [loading, setLoading] = useState(true);
    const [confirmItem, setConfirmItem] = useState<any>(null);
    const [successData, setSuccessData] = useState<any>(null);
    const [buying, setBuying] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const [shopRes, walletRes] = await Promise.all([
            fetch('/api/student/shop'),
            fetch('/api/student/wallet'),
        ]);
        const shopData = await shopRes.json();
        const walletData = await walletRes.json();
        setItems(shopData.items || []);
        setBalance(walletData.balance || 0);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = category === 'Barchasi'
        ? items
        : items.filter(i => TYPE_CATEGORY[i.type] === category);

    const handleBuy = async () => {
        if (!confirmItem || buying) return;
        setBuying(true);
        setError('');
        try {
            const res = await fetch('/api/student/shop/' + confirmItem._id + '/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || "Xarid amalga oshmadi. Tangalar yechilmadi.");
            } else {
                setBalance(data.newBalance);
                setConfirmItem(null);
                setSuccessData({ item: confirmItem, result: data });
                await load();
            }
        } catch {
            setError("Tarmoq xatosi. Qaytadan urinib koring.");
        }
        setBuying(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-6" style={{ position: 'relative', zIndex: 10 }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                        style={{ background: 'var(--theme-btn-bg, #6366f1)' }}>
                        🛒
                    </div>
                    <div>
                        <h1 className="text-2xl font-black" style={{ color: 'var(--theme-text, #fff)' }}>Do'kon</h1>
                        <p className="text-sm" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>MT Tangalar bilan mukofot sotib oling</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                    style={{ background: 'var(--theme-card-bg, rgba(255,255,255,0.06))', border: '1px solid var(--theme-border, rgba(255,255,255,0.12))' }}>
                    <span className="text-xl">🪙</span>
                    <span className="font-black text-lg" style={{ color: 'var(--theme-primary, #6366f1)' }}>{balance.toLocaleString()}</span>
                    <span className="text-sm" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>MT</span>
                </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap mb-6">
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)}
                        className="px-4 py-2 text-sm font-bold transition-all"
                        style={{
                            borderRadius: 'var(--theme-radius-btn, 999px)',
                            background: category === cat ? 'var(--theme-btn-bg, #6366f1)' : 'var(--theme-card-bg, rgba(255,255,255,0.05))',
                            color: category === cat ? 'var(--theme-btn-text, #fff)' : 'var(--theme-text-muted, rgba(255,255,255,0.6))',
                            border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                        }}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Items grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-10 h-10 rounded-full border-t-2 border-b-2"
                        style={{ borderColor: 'var(--theme-primary, #6366f1)' }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-4">
                    <span className="text-5xl">🏪</span>
                    <p className="text-lg font-semibold" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>
                        Bu yerda hozircha mahsulot yo'q
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(item => {
                        const Icon = TYPE_ICON[item.type] || Plus;
                        const emoji = TYPE_EMOJI[item.type] || '🎁';
                        const canAfford = balance >= item.price;
                        const isSoldOut = !item.isUnlimitedStock && item.stock <= 0;
                        return (
                            <div key={item._id} className="flex flex-col p-5 rounded-2xl gap-3 transition-all"
                                style={{
                                    background: 'var(--theme-card-bg, rgba(255,255,255,0.05))',
                                    border: '1px solid var(--theme-border, rgba(255,255,255,0.1))',
                                    borderRadius: 'var(--theme-radius-card, 16px)',
                                    backdropFilter: 'var(--theme-card-blur, blur(16px))',
                                    opacity: isSoldOut ? 0.6 : 1,
                                }}>
                                {/* Icon + type */}
                                <div className="flex items-start gap-3">
                                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                                        style={{ background: 'var(--theme-btn-bg, #6366f1)22' }}>
                                        {item.imageUrl
                                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                                            : emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--theme-text, #fff)' }}>
                                            {item.name}
                                        </h3>
                                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.55))' }}>
                                            {item.description || (item.type === 'THEME_CREATOR_ACCESS' ? '48 soatlik mavzu yaratish imkoni' : '')}
                                        </p>
                                    </div>
                                </div>

                                {/* Stock badge */}
                                {!item.isUnlimitedStock && (
                                    <div className="text-xs font-medium" style={{ color: item.stock <= 3 ? '#ef4444' : 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>
                                        {isSoldOut ? '🚫 Tugadi' : `📦 ${item.stock} ta qoldi`}
                                    </div>
                                )}

                                {/* Price + buy */}
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xl">🪙</span>
                                        <span className="font-black text-xl" style={{ color: 'var(--theme-primary, #6366f1)' }}>
                                            {item.price.toLocaleString()}
                                        </span>
                                        <span className="text-xs" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.5))' }}>MT</span>
                                    </div>
                                    <button
                                        disabled={isSoldOut || !canAfford}
                                        onClick={() => setConfirmItem(item)}
                                        className="px-5 py-2 font-bold text-sm transition-all"
                                        style={{
                                            borderRadius: 'var(--theme-radius-btn, 999px)',
                                            background: isSoldOut ? 'rgba(255,255,255,0.1)' : canAfford ? 'var(--theme-btn-bg, #6366f1)' : 'rgba(255,255,255,0.08)',
                                            color: isSoldOut || !canAfford ? 'rgba(255,255,255,0.3)' : 'var(--theme-btn-text, #fff)',
                                            cursor: isSoldOut || !canAfford ? 'not-allowed' : 'pointer',
                                        }}>
                                        {isSoldOut ? 'Tugadi' : !canAfford ? `🪙 ${item.price - balance} kam` : 'Sotib olish'}
                                    </button>
                                </div>

                                {/* Requires approval badge */}
                                {item.requiresApproval && (
                                    <p className="text-xs" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.4))' }}>
                                        ⏳ O'qituvchi tasdiqlashi kerak
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Purchase confirmation modal */}
            {confirmItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5"
                        style={{ background: 'var(--theme-card-bg, rgba(15,20,40,0.95))', border: '1px solid var(--theme-border, rgba(255,255,255,0.15))' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black" style={{ color: 'var(--theme-text, #fff)' }}>Xaridni tasdiqlang</h2>
                            <button onClick={() => { setConfirmItem(null); setError(''); }}
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
                            </button>
                        </div>

                        <div className="text-center py-2">
                            <div className="text-5xl mb-3">{TYPE_EMOJI[confirmItem.type]}</div>
                            <h3 className="font-bold text-lg" style={{ color: 'var(--theme-text, #fff)' }}>{confirmItem.name}</h3>
                            {confirmItem.type === 'THEME_CREATOR_ACCESS' && (
                                <p className="text-sm mt-1" style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>⏱️ 48 soatlik kirish huquqi</p>
                            )}
                        </div>

                        <div className="rounded-2xl p-4 flex flex-col gap-2"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>Narxi</span>
                                <span className="font-bold" style={{ color: 'var(--theme-text, #fff)' }}>🪙 {confirmItem.price.toLocaleString()} MT</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>Balans</span>
                                <span className="font-bold" style={{ color: 'var(--theme-text, #fff)' }}>🪙 {balance.toLocaleString()} MT</span>
                            </div>
                            <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                            <div className="flex justify-between text-sm">
                                <span style={{ color: 'var(--theme-text-muted, rgba(255,255,255,0.6))' }}>Keyin qoladi</span>
                                <span className="font-black" style={{ color: balance - confirmItem.price >= 0 ? '#10b981' : '#ef4444' }}>
                                    🪙 {(balance - confirmItem.price).toLocaleString()} MT
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => { setConfirmItem(null); setError(''); }}
                                className="flex-1 py-3 font-bold rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                                Bekor qilish
                            </button>
                            <button onClick={handleBuy} disabled={buying}
                                className="flex-1 py-3 font-black rounded-2xl flex items-center justify-center gap-2"
                                style={{ background: 'var(--theme-btn-bg, #6366f1)', color: 'var(--theme-btn-text, #fff)', opacity: buying ? 0.7 : 1 }}>
                                {buying ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : '✅ Tasdiqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success modal */}
            {successData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5 text-center"
                        style={{ background: 'var(--theme-card-bg, rgba(15,20,40,0.95))', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <div className="text-6xl">🎉</div>
                        <div>
                            <h2 className="text-xl font-black mb-2" style={{ color: '#10b981' }}>Xarid muvaffaqiyatli!</h2>
                            <p className="font-semibold" style={{ color: 'var(--theme-text, #fff)' }}>{successData.item.name}</p>
                            {successData.result.status === 'PENDING' && (
                                <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>⏳ O'qituvchi tasdiqlashini kuting</p>
                            )}
                            {successData.result.entitlement && (
                                <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                    🎨 Mavzu yaratish huquqi faollashdi! Muddat: 48 soat
                                </p>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {successData.item.type === 'THEME_CREATOR_ACCESS' && (
                                <button onClick={() => { setSuccessData(null); router.push('/student/theme'); }}
                                    className="flex-1 py-3 font-bold rounded-2xl"
                                    style={{ background: 'var(--theme-btn-bg, #6366f1)', color: 'var(--theme-btn-text, #fff)' }}>
                                    🎨 Mavzu yaratish
                                </button>
                            )}
                            <button onClick={() => setSuccessData(null)}
                                className="flex-1 py-3 font-bold rounded-2xl"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}