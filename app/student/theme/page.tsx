'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentTheme } from '@/lib/theme/StudentThemeContext';
import type { StudentTheme } from '@/lib/theme/themeTypes';
import { Palette, Plus, Pencil, Copy, Trash2, Check, Sparkles, RotateCcw, Loader2 } from 'lucide-react';

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
  theme, onEquip, onEdit, onDuplicate, onDelete, isLoading,
}: {
  theme: StudentTheme;
  onEquip: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isLoading: boolean;
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
      <div className="p-3 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-black text-white text-sm truncate flex-1">{theme.name}</p>
          {theme.isEquipped && (
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 shrink-0">
              <Check className="w-2.5 h-2.5" /> Faol
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {confirmDelete ? (
        <div className="px-3 pb-3 flex gap-2">
          <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 text-xs font-black text-white/60 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
            Bekor
          </button>
          <button onClick={onDelete} className="flex-1 py-2 text-xs font-black text-red-400 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20">
            O'chirish
          </button>
        </div>
      ) : (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {!theme.isEquipped && (
            <button onClick={onEquip} disabled={isLoading}
              className="col-span-2 py-2 text-xs font-black text-white bg-indigo-500/80 rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Kiyish
            </button>
          )}
          <button onClick={onEdit}
            className="py-2 text-xs font-black text-white/70 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-1">
            <Pencil className="w-3 h-3" /> Tahrir
          </button>
          <button onClick={onDuplicate} disabled={isLoading}
            className="py-2 text-xs font-black text-white/70 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-1 disabled:opacity-50">
            <Copy className="w-3 h-3" /> Nusxa
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="col-span-2 py-2 text-xs font-black text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center gap-1">
            <Trash2 className="w-3 h-3" /> O'chirish
          </button>
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

  const handle = async (id: string, fn: () => Promise<void>) => {
    setActionLoading(id);
    setError(null);
    try { await fn(); } catch { setError('Xatolik yuz berdi. Qayta urinib ko\'ring.'); }
    finally { setActionLoading(null); }
  };

  const handleEquip = (id: string) => handle(id, () => equipTheme(id));
  const handleDuplicate = (id: string) => handle(id + '-dup', async () => {
    const r = await fetch(`/api/student/themes/${id}/duplicate`, { method: 'POST' });
    if (!r.ok) throw new Error();
    await refresh();
  });
  const handleDelete = (id: string) => handle(id + '-del', async () => {
    const r = await fetch(`/api/student/themes/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error();
    await refresh();
  });
  const handleResetDefault = () => handle('default', resetToDefault);

  if (loading) return (
    <div className="w-full flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="w-full py-8 px-2 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
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
            onClick={() => router.push('/student/theme/creator')}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" /> Yangi Dizayn
          </button>
        </div>
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
                <button onClick={() => router.push(`/student/theme/creator?edit=${equippedTheme._id}`)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white/80 bg-white/8 rounded-xl border border-white/10 hover:bg-white/15 transition-all">
                  <Pencil className="w-3.5 h-3.5" /> Tahrirlash
                </button>
                <button onClick={() => handleDuplicate(equippedTheme._id)} disabled={!!actionLoading}
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
          <button onClick={() => router.push('/student/theme/creator')}
            className="flex items-center gap-2 px-6 py-3 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/25">
            <Plus className="w-5 h-5" /> Birinchi dizayn yarating
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
                isLoading={actionLoading === theme._id}
                onEquip={() => handleEquip(theme._id)}
                onEdit={() => router.push(`/student/theme/creator?edit=${theme._id}`)}
                onDuplicate={() => handleDuplicate(theme._id)}
                onDelete={() => handleDelete(theme._id)}
              />
            ))}
            {/* Create new */}
            <button onClick={() => router.push('/student/theme/creator')}
              className="rounded-2xl border border-dashed border-white/15 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[180px] text-white/30 hover:text-indigo-400">
              <Plus className="w-6 h-6" />
              <span className="text-xs font-black uppercase tracking-wider">Yangi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}