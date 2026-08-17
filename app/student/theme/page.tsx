'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentTheme } from '@/lib/theme/StudentThemeContext';
import type { StudentTheme } from '@/lib/theme/themeTypes';
import { Palette, Plus, Pencil, Copy, Trash2, Check, Sparkles, RotateCcw, Loader2, Lock, ShoppingBag, Clock } from 'lucide-react';

function formatRemaining(ms: number) {
  if (ms <= 0) return '0s';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return h + 's ' + m + 'd';
  return m + 'd';
}

// ─── Mini Theme Preview Card ──────────────────────────────────────────────────
function ThemePreviewSwatch({ config }: { config: any }) {
  const c = config?.colors ?? {};
  const bgObj = config?.background ?? {};
  let bg = c.background ?? '#09090f';
  let bgImage = 'none';

  if (bgObj.type === 'image' && bgObj.imageUrl) {
    bgImage = `url(${bgObj.imageUrl})`;
  } else if (bgObj.type === 'color' && bgObj.color) {
    bg = bgObj.color;
  }

  const primary = c.primary ?? '#6366f1';
  const card = c.surface ?? '#12121c';
  const text = c.text ?? '#ffffff';

  return (
    <div style={{
      background: bg,
      backgroundImage: bgImage,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRadius: '12px',
      overflow: 'hidden',
      width: '100%',
      height: '90px',
      position: 'relative'
    }}>
      {bgObj.type === 'image' && bgObj.imageUrl && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, background: card, margin: '10px', borderRadius: '8px', padding: '8px', border: `1px solid ${c.border ?? 'rgba(255,255,255,0.1)'}` }}>
        <div style={{ width: '40%', height: '6px', background: primary, borderRadius: '4px', marginBottom: '6px' }} />
        <div style={{ width: '70%', height: '4px', background: text, borderRadius: '4px', opacity: 0.4 }} />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '10px', gap: '4px', marginTop: '-4px' }}>
        <div style={{ width: '20px', height: '6px', background: primary, borderRadius: '4px' }} />
        <div style={{ width: '14px', height: '6px', background: c.accent ?? '#10b981', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

// ─── Theme Card ───────────────────────────────────────────────────────────────
function ThemeCard({
  theme, onEquip, onEdit, onDuplicate, onDelete, isLoading, hasAccess,
}: {
  theme: StudentTheme;
  onEquip: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isLoading: boolean;
  hasAccess: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div
      className="rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor: theme.isEquipped ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
        boxShadow: theme.isEquipped ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      {/* Swatch */}
      <div className="p-3 pb-0">
        <ThemePreviewSwatch config={theme.config} />
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-sm text-white truncate mb-1">{theme.name}</h4>
          {theme.isEquipped && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-indigo-400">
              <Check className="w-3 h-3" /> Tanlangan
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-1 pt-2 border-t border-white/5">
          {!theme.isEquipped && (
            <button
              onClick={onEquip}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tanlash'}
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={onEdit}
              title={hasAccess ? 'Tahrirlash' : 'Ruxsat sotib olish kerak'}
              className={`p-1.5 rounded-lg border transition-all ${
                hasAccess
                  ? 'text-white/60 hover:text-white bg-white/5 border-white/10 hover:bg-white/10'
                  : 'text-white/30 bg-white/2 border-white/5 cursor-not-allowed'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDuplicate}
              disabled={isLoading || !hasAccess}
              title={hasAccess ? 'Nusxa olish' : 'Ruxsat sotib olish kerak'}
              className="p-1.5 text-white/60 hover:text-white bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isLoading}
              className="p-1.5 text-red-400/60 hover:text-red-400 bg-red-500/5 rounded-lg border border-red-500/10 hover:bg-red-500/15 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="p-3 bg-red-950/80 border-t border-red-500/30 flex items-center justify-between text-xs">
          <span className="text-red-300 font-bold">O'chirilsinmi?</span>
          <div className="flex gap-1">
            <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 bg-white/10 text-white rounded-md">Yo'q</button>
            <button onClick={onDelete} className="px-2 py-1 bg-red-600 text-white rounded-md font-bold">Ha</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ThemePage() {
  const router = useRouter();
  const { themes, equippedTheme, loading, refresh, equipTheme, resetToDefault } = useStudentTheme();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<any>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    fetch('/api/student/entitlements')
      .then(r => r.json())
      .then(data => {
        const tc = data?.THEME_CREATOR;
        setEntitlement(tc || { active: false });
        if (tc?.active && tc.remainingMs > 0) {
          setRemaining(tc.remainingMs);
        }
      })
      .catch(() => setEntitlement({ active: false }));
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1000) {
          clearInterval(interval);
          setEntitlement((prev: any) => ({ ...prev, active: false }));
          return 0;
        }
        return r - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const hasAccess = !!(entitlement?.active && remaining > 0);

  const handle = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    setError(null);
    try { await fn(); } catch { setError('Xatolik yuz berdi. Qayta urinib ko\'ring.'); }
    finally { setActionLoading(null); }
  };

  const handleEquip = (id: string) => handle(id, () => equipTheme(id));
  const handleDuplicate = (id: string) => {
    if (!hasAccess) {
      router.push('/student/shop');
      return;
    }
    handle(id + '-dup', async () => {
      const r = await fetch(`/api/student/themes/${id}/duplicate`, { method: 'POST' });
      if (!r.ok) throw new Error();
      await refresh();
    });
  };
  const handleDelete = (id: string) => handle(id + '-del', async () => {
    const r = await fetch(`/api/student/themes/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error();
    await refresh();
  });
  const handleResetDefault = () => handle('default', resetToDefault);

  const handleCreateClick = () => {
    if (hasAccess) {
      router.push('/student/theme/creator');
    } else {
      router.push('/student/shop');
    }
  };

  if (loading) return (
    <div className="w-full flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="w-full py-8 px-2 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Mening Dizaynlarim</h1>
          </div>
          <p className="text-white/40 text-sm ml-[52px]">MT-Vocab ko'rinishini o'zing sozla</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefault}
            disabled={actionLoading === 'default'}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-black text-white/60 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          >
            {actionLoading === 'default' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Default
          </button>
          <button
            onClick={handleCreateClick}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-black text-white rounded-xl transition-all shadow-lg ${
              hasAccess
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
            }`}
          >
            {hasAccess ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {hasAccess ? 'Yangi Dizayn' : 'Dizayn Huquqini Sotib Olish'}
          </button>
        </div>
      </div>

      {/* Access Entitlement Banner */}
      <div className="mb-8 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap border"
        style={{
          background: hasAccess ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.1)',
          borderColor: hasAccess ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)',
        }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{hasAccess ? '🎨' : '🔒'}</span>
          <div>
            <div className="font-bold text-sm text-white">
              {hasAccess ? 'Mavzu yaratish huquqi faol' : 'Mavzu yaratish uchun huquq kerak'}
            </div>
            {hasAccess ? (
              <div className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> Muddat qoldi: {formatRemaining(remaining)}
              </div>
            ) : (
              <div className="text-xs text-amber-200/80 mt-0.5">
                Do'kondan 48 soatlik mavzu yaratish imkoniyatini sotib oling.
              </div>
            )}
          </div>
        </div>
        {!hasAccess && (
          <button
            onClick={() => router.push('/student/shop')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-black text-amber-950 bg-amber-400 rounded-xl hover:bg-amber-300 transition-all"
          >
            <ShoppingBag className="w-4 h-4" /> Do'konga o'tish
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Currently Equipped */}
      {equippedTheme && (
        <div className="mb-10">
          <p className="text-[11px] uppercase font-black tracking-widest text-white/30 mb-3 px-1">Hozirda faol</p>
          <div className="rounded-3xl border border-indigo-500/30 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
            style={{ background: 'rgba(99,102,241,0.05)', boxShadow: '0 0 30px rgba(99,102,241,0.08)' }}>
            <div className="w-full sm:w-48 shrink-0">
              <ThemePreviewSwatch config={equippedTheme.config} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Faol dizayn</p>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">{equippedTheme.name}</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    if (hasAccess) router.push(`/student/theme/creator?edit=${equippedTheme._id}`);
                    else router.push('/student/shop');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl border transition-all ${
                    hasAccess
                      ? 'text-white/80 bg-white/8 border-white/10 hover:bg-white/15'
                      : 'text-amber-300 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                  }`}
                >
                  {hasAccess ? <Pencil className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {hasAccess ? 'Tahrirlash' : 'Ruxsat kerak'}
                </button>
                <button onClick={() => handleDuplicate(equippedTheme._id)} disabled={!!actionLoading || !hasAccess}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white/80 bg-white/8 rounded-xl border border-white/10 hover:bg-white/15 transition-all disabled:opacity-50">
                  <Copy className="w-3.5 h-3.5" /> Nusxa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Themes Grid */}
      {themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
            <Palette className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Dizayn yo'q</h3>
          <p className="text-white/40 text-sm mb-8 max-w-xs">MT-Vocab ko'rinishini o'zingizga mos ravishda sozlang</p>
          <button onClick={handleCreateClick}
            className={`flex items-center gap-2 px-6 py-3 font-black text-white rounded-2xl transition-all shadow-xl ${
              hasAccess ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
            }`}>
            {hasAccess ? <Plus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            {hasAccess ? 'Birinchi dizayn yarating' : 'Do\'kondan ruxsat sotib oling'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-[11px] uppercase font-black tracking-widest text-white/30 mb-3 px-1">Barcha dizaynlar</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {themes.map(theme => (
              <ThemeCard
                key={theme._id}
                theme={theme}
                hasAccess={hasAccess}
                isLoading={actionLoading === theme._id}
                onEquip={() => handleEquip(theme._id)}
                onEdit={() => {
                  if (hasAccess) router.push(`/student/theme/creator?edit=${theme._id}`);
                  else router.push('/student/shop');
                }}
                onDuplicate={() => handleDuplicate(theme._id)}
                onDelete={() => handleDelete(theme._id)}
              />
            ))}
            {/* Create new */}
            <button onClick={handleCreateClick}
              className={`rounded-2xl border border-dashed transition-all flex flex-col items-center justify-center gap-2 min-h-[180px] ${
                hasAccess
                  ? 'border-white/15 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-white/30 hover:text-indigo-400'
                  : 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5 text-amber-400/50 hover:text-amber-300'
              }`}>
              {hasAccess ? <Plus className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
              <span className="text-xs font-black uppercase tracking-wider">
                {hasAccess ? 'Yangi' : 'Ruxsat kerak'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}