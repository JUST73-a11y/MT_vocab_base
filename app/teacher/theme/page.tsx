'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTeacherTheme } from '@/lib/theme/TeacherThemeContext';
import { PRESET_THEMES } from '@/lib/theme/themeDefaults';
import type { TeacherTheme, ThemeConfig } from '@/lib/theme/themeTypes';
import { Sparkles, Plus, Check, Copy, Trash2, Edit3, RotateCcw, Loader2, Palette } from 'lucide-react';

// ─── Theme Preview Swatch ─────────────────────────────────────────────────────
function ThemePreviewSwatch({ config }: { config: ThemeConfig }) {
  const c = config.colors;
  const bgObj = config.background;
  let bg = c.background ?? '#09090f';
  let bgImage = 'none';

  if (bgObj.type === 'image' && bgObj.imageUrl) {
    bgImage = `url(${bgObj.imageUrl})`;
  } else if (bgObj.type === 'color' && bgObj.color) {
    bg = bgObj.color;
  }

  const bgBlur = {
    none: 'none',
    subtle: 'blur(4px)',
    medium: 'blur(8px)',
    strong: 'blur(16px)',
  }[bgObj.blur || 'none'] || 'none';

  const cardBlur = {
    none: 'none',
    subtle: 'blur(6px)',
    medium: 'blur(12px)',
    strong: 'blur(20px)',
  }[config.cards.blur || 'subtle'] || 'blur(12px)';

  const primary = c.primary ?? '#6366f1';
  const card = config.cards.style === 'glass' ? 'rgba(15,20,35,0.45)' : (c.surface ?? '#12121c');
  const text = c.text ?? '#ffffff';

  return (
    <div style={{
      background: bg,
      borderRadius: '12px',
      overflow: 'hidden',
      width: '100%',
      height: '90px',
      position: 'relative'
    }}>
      {/* Background Image Layer with Blur */}
      {bgObj.type === 'image' && bgObj.imageUrl && (
        <div style={{
          position: 'absolute',
          inset: '-6px',
          backgroundImage: bgImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: bgBlur,
          transform: bgBlur !== 'none' ? 'scale(1.08)' : 'none',
        }} />
      )}
      {bgObj.type === 'image' && bgObj.imageUrl && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
      )}
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: card,
        backdropFilter: cardBlur,
        WebkitBackdropFilter: cardBlur,
        margin: '10px',
        borderRadius: '8px',
        padding: '8px',
        border: `1px solid ${c.border ?? 'rgba(255,255,255,0.1)'}`
      }}>
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
  theme: TeacherTheme;
  onEquip: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className="group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderColor: theme.isEquipped ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)',
        boxShadow: theme.isEquipped ? '0 0 24px rgba(99,102,241,0.18)' : 'none',
      }}
    >
      <div className="p-4">
        <ThemePreviewSwatch config={theme.config} />
        <div className="mt-3 flex items-center justify-between">
          <div>
            <span className="text-sm font-black text-white">{theme.name}</span>
            {theme.source === 'SYSTEM' && (
              <span className="ml-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                Preset
              </span>
            )}
          </div>
          {theme.isEquipped && (
            <span className="flex items-center gap-1 text-[11px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" /> Tanlangan
            </span>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-white/5 flex items-center gap-2">
        {!theme.isEquipped && (
          <button
            onClick={onEquip}
            disabled={isLoading}
            className="flex-1 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all disabled:opacity-50"
          >
            Tanlash
          </button>
        )}
        <button
          onClick={onEdit}
          title="Tahrirlash"
          className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDuplicate}
          title="Nusxa olish"
          className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        {theme.source !== 'SYSTEM' && (
          <button
            onClick={onDelete}
            title="O'chirish"
            className="p-2 text-red-400/60 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeacherThemePage() {
  const router = useRouter();
  const { themes, equippedTheme, loading, refresh, equipTheme, resetToDefault } = useTeacherTheme();
  const [actionLoading, setActionLoading] = useState(false);

  const handleEquipPreset = async (presetId: string) => {
    const preset = PRESET_THEMES.find(p => p.id === presetId);
    if (!preset) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/teacher/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: preset.name, config: preset.config }),
      });
      if (!res.ok) throw new Error();
      const created: TeacherTheme = await res.json();
      await equipTheme(created._id);
    } catch {
      alert('Mavzuni qo\'llashda xatolik');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/teacher/themes/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: id }),
      });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      alert('Nusxa olishda xatolik');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu mavzuni o\'chirishni tasdiqlaysizmi?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/teacher/themes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await refresh();
    } catch {
      alert('O\'chirishda xatolik');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full py-8 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-black text-white">Dizayn va Mavzular</h1>
          </div>
          <p className="text-sm text-white/50 font-bold">
            O'qituvchi boshqaruv panelining ranglari, foni va shisha blur effektlarini sozlang
          </p>
        </div>

        <div className="flex items-center gap-3">
          {equippedTheme && (
            <button
              onClick={resetToDefault}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black transition-all border border-white/8"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Standart holatga qaytarish
            </button>
          )}
          <button
            onClick={() => router.push('/teacher/theme/creator')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" /> Yangi Dizayn Yaratish
          </button>
        </div>
      </div>

      {loading ? (
        <div className="w-full flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Custom Themes */}
          {themes.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Mening Dizaynlarim</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map(t => (
                  <ThemeCard
                    key={t._id}
                    theme={t}
                    isLoading={actionLoading}
                    onEquip={() => equipTheme(t._id)}
                    onEdit={() => router.push(`/teacher/theme/creator?edit=${t._id}`)}
                    onDuplicate={() => handleDuplicate(t._id)}
                    onDelete={() => handleDelete(t._id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preset Themes */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Tayyor Dizaynlar (Presets)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRESET_THEMES.map(preset => {
                const isEquipped = !equippedTheme && preset.id === 'default';
                return (
                  <div
                    key={preset.id}
                    className="rounded-2xl border p-4 flex flex-col justify-between transition-all hover:border-indigo-500/30"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div>
                      <ThemePreviewSwatch config={preset.config} />
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{preset.emoji}</span>
                          <span className="text-sm font-black text-white">{preset.name}</span>
                        </div>
                        {isEquipped && (
                          <span className="flex items-center gap-1 text-[11px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" /> Standart
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleEquipPreset(preset.id)}
                        disabled={actionLoading}
                        className="flex-1 py-2 text-xs font-black text-white bg-indigo-600/80 hover:bg-indigo-600 rounded-xl transition-all disabled:opacity-50"
                      >
                        Qo'llash
                      </button>
                      <button
                        onClick={() => {
                          const query = encodeURIComponent(JSON.stringify(preset.config));
                          router.push(`/teacher/theme/creator?fromPreset=${preset.id}`);
                        }}
                        title="Moslash"
                        className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs font-black flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}