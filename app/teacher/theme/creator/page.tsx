'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTeacherTheme } from '@/lib/theme/TeacherThemeContext';
import type { ThemeConfig, BlurLevel } from '@/lib/theme/themeTypes';
import { DEFAULT_THEME_CONFIG, PRESET_THEMES } from '@/lib/theme/themeDefaults';
import { sanitizeThemeConfig, applyThemeToDom } from '@/lib/theme/themeEngine';
import { ArrowLeft, Save, Sparkles, RotateCcw, Loader2, Check, Upload, Trash2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

// Curated high quality wallpaper presets
const WALLPAPER_PRESETS = [
  { id: 'space', name: 'Koinot & Galaktika', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop' },
  { id: 'forest', name: 'Qorong\'i O\'rmon', url: 'https://images.unsplash.com/photo-1511497584788-876761c11969?q=80&w=1200&auto=format&fit=crop' },
  { id: 'aurora', name: 'Shimol Yog\'dusi', url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1200&auto=format&fit=crop' },
  { id: 'abstract_gold', name: 'Abstrakt Oltin', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' },
  { id: 'city_night', name: 'Tungi Shahar', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1200&auto=format&fit=crop' },
];

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ title, onReset, children }: { title: string; onReset: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-white/50">{title}</p>
        <button onClick={onReset} className="text-[10px] font-black text-white/30 hover:text-indigo-400 transition-colors uppercase tracking-wider">Reset</button>
      </div>
      {children}
    </div>
  );
}

// ─── Option Chips ─────────────────────────────────────────────────────────────
function Chips<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels?: Record<T, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          className="px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer"
          style={{
            background: value === o ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
            color: value === o ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
            border: value === o ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
          }}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

// ─── Color Picker Row ─────────────────────────────────────────────────────────
function ColorRow({ label, desc, value, onChange }: { label: string; desc?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <div>
        <span className="text-xs font-bold text-white/60">{label}</span>
        {desc && <p className="text-[10px] text-white/30">{desc}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg border border-white/20 overflow-hidden cursor-pointer" style={{ background: value }}>
          <input type="color" value={value && value.startsWith('#') ? value : '#6366f1'} onChange={e => onChange(e.target.value)}
            className="w-8 h-8 opacity-0 cursor-pointer -ml-1 -mt-1" />
        </div>
        <span className="text-[10px] font-mono text-white/30">{value && value.startsWith('#') ? value : 'auto'}</span>
      </div>
    </div>
  );
}

// ─── Live Preview Panel ───────────────────────────────────────────────────────
function LivePreview({ config }: { config: ThemeConfig }) {
  const c = config.colors;
  let bgStyle: string = c.background;
  let bgImage: string = 'none';

  if (config.background.type === 'color') {
    bgStyle = config.background.color;
  } else if (config.background.type === 'gradient') {
    const gradients: Record<string, string> = {
      sunset: 'linear-gradient(135deg, #1a0005 0%, #2a0a00 50%, #1a0010 100%)',
      ocean: 'linear-gradient(135deg, #000d1a 0%, #001a2e 60%, #000d1a 100%)',
      purple: 'linear-gradient(135deg, #030014 0%, #0a0025 60%, #030014 100%)',
      midnight: 'linear-gradient(180deg, #000000 0%, #050505 100%)',
      forest: 'linear-gradient(135deg, #021008 0%, #041a0e 60%, #021008 100%)',
      rose: 'linear-gradient(135deg, #140010 0%, #1f0018 60%, #140010 100%)',
    };
    bgStyle = gradients[config.background.gradient] || c.background;
  } else if (config.background.type === 'image' && config.background.imageUrl) {
    bgImage = `url("${config.background.imageUrl}")`;
  }

  const bgBlur = {
    none: 'none',
    subtle: 'blur(6px)',
    medium: 'blur(14px)',
    strong: 'blur(26px)',
  }[config.background.blur || 'none'] || 'none';

  const cardBlur = {
    none: 'none',
    subtle: 'blur(12px)',
    medium: 'blur(24px)',
    strong: 'blur(40px)',
  }[config.cards.blur || 'subtle'] || 'blur(16px)';

  const navBlur = {
    none: 'none',
    subtle: 'blur(10px)',
    medium: 'blur(20px)',
    strong: 'blur(36px)',
  }[config.navbar?.blur || 'medium'] || 'blur(20px)';

  const navBg = {
    glass: 'rgba(10, 18, 35, 0.65)',
    solid: 'rgba(10, 15, 28, 0.95)',
    translucent: 'rgba(0, 0, 0, 0.35)',
    floating: 'rgba(15, 20, 35, 0.70)',
    minimal: 'transparent',
  }[config.navbar?.style || 'glass'] || 'rgba(10, 18, 35, 0.65)';

  const navBorder = {
    none: '1px solid transparent',
    thin: '1px solid rgba(255, 255, 255, 0.10)',
    glow: `1px solid ${c.primary}`,
  }[config.navbar?.border || 'thin'] || '1px solid rgba(255, 255, 255, 0.10)';

  const navRadius = config.navbar?.style === 'floating' ? '9999px' : '14px';

  const overlayBg = {
    none: 'transparent',
    light: 'rgba(0,0,0,0.25)',
    dark: 'rgba(5,10,25,0.70)',
    soft: 'rgba(5,10,25,0.45)',
  }[config.background.overlay || 'soft'] || 'rgba(5,10,25,0.45)';

  const cardBg = {
    solid: 'rgba(15, 20, 35, 0.75)',
    glass: 'rgba(15, 20, 35, 0.45)',
    soft: 'rgba(20, 25, 45, 0.55)',
    minimal: 'rgba(10, 15, 25, 0.30)',
    elevated: 'rgba(25, 30, 55, 0.80)'
  }[config.cards.style] || 'rgba(15, 20, 35, 0.45)';

  const btnRadius = { rounded: '12px', pill: '9999px', square: '4px', soft: '8px', glass: '12px' }[config.buttons.style] || '12px';
  const btnBg = config.buttons?.primaryBg || c.primary;
  const btnTextColor = config.buttons?.textColor || '#ffffff';
  const cardRadius = { small: '8px', medium: '12px', large: '16px', xl: '24px', pill: '9999px' }[config.cards.radius] || '16px';
  const font = { inter: "'Inter', sans-serif", poppins: "'Poppins', sans-serif", nunito: "'Nunito', sans-serif", system: 'system-ui, sans-serif' }[config.typography.fontFamily] || 'inherit';

  return (
    <div style={{
      background: bgStyle,
      borderRadius: '20px',
      padding: '20px',
      fontFamily: font,
      minHeight: '100%',
      border: `1px solid ${c.border}`,
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Image Layer with Blur */}
      {config.background.type === 'image' && config.background.imageUrl && (
        <div style={{
          position: 'absolute',
          inset: '-10px',
          backgroundImage: bgImage,
          backgroundPosition: config.background.imagePosition || 'center',
          backgroundSize: config.background.imageSize || 'cover',
          backgroundRepeat: 'no-repeat',
          filter: bgBlur,
          transform: bgBlur !== 'none' ? 'scale(1.05)' : 'none',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}

      {/* Dark overlay */}
      {config.background.type === 'image' && config.background.imageUrl && (
        <div style={{ position: 'absolute', inset: 0, background: overlayBg, pointerEvents: 'none', zIndex: 1 }} />
      )}

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Nav bar */}
        <div style={{
          background: navBg,
          backdropFilter: navBlur,
          WebkitBackdropFilter: navBlur,
          borderRadius: navRadius,
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: navBorder,
          transition: 'all 0.3s ease',
        }}>
          <span style={{ color: c.text, fontWeight: 900, fontSize: '13px' }}>VocabApp</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['Dashboard', 'Guruhlar', 'O\'quvchilar'].map(n => (
              <span key={n} style={{ color: c.textMuted, fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>{n}</span>
            ))}
          </div>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: btnBg }} />
        </div>

        {/* Card with Box Blur */}
        <div style={{
          background: cardBg,
          backdropFilter: cardBlur,
          WebkitBackdropFilter: cardBlur,
          border: `1px solid ${c.border}`,
          borderRadius: cardRadius,
          padding: '14px',
          marginBottom: '12px'
        }}>
          <p style={{ color: c.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Platforma Ko'rinishi</p>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ width: '75%', height: '100%', background: btnBg, borderRadius: '99px' }} />
          </div>
          <p style={{ color: c.text, fontSize: '11px', fontWeight: 800 }}>Dizayn va ranglar real vaqtda yangilanadi</p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button style={{
            flex: 1,
            background: btnBg,
            color: btnTextColor,
            border: 'none',
            borderRadius: btnRadius,
            padding: '10px',
            fontWeight: 900,
            fontSize: '11px',
            cursor: 'default',
            transition: 'all 0.2s ease'
          }}>
            Asosiy Tugma
          </button>
          <button style={{
            flex: 1,
            background: cardBg,
            backdropFilter: cardBlur,
            WebkitBackdropFilter: cardBlur,
            color: c.text,
            border: `1px solid ${c.border}`,
            borderRadius: btnRadius,
            padding: '10px',
            fontWeight: 800,
            fontSize: '11px',
            cursor: 'default'
          }}>
            Ikkinchi Tugma
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Theme Creator Page ──────────────────────────────────────────────────
export default function ThemeCreatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const fromPreset = searchParams.get('fromPreset');
  const { refresh } = useTeacherTheme();

  const [name, setName] = useState("O'qituvchi Dizayni");
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('preset');
  const [unsaved, setUnsaved] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing theme if editing
  useEffect(() => {
    if (!editId) {
      if (fromPreset) {
        const p = PRESET_THEMES.find(pr => pr.id === fromPreset);
        if (p) {
          setName(`${p.name} (Moslangan)`);
          setConfig(p.config);
        }
      }
      setLoadingEdit(false);
      return;
    }
    fetch(`/api/teacher/themes/${editId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setName(data.name);
          setConfig(sanitizeThemeConfig(data.config));
        }
      })
      .finally(() => setLoadingEdit(false));
  }, [editId, fromPreset]);

  // Live preview — apply to DOM as user changes settings
  useEffect(() => {
    applyThemeToDom(config);
  }, [config]);

  const update = useCallback(<K extends keyof ThemeConfig>(section: K, value: Partial<ThemeConfig[K]>) => {
    setConfig(prev => ({ ...prev, [section]: typeof prev[section] === 'object' ? { ...(prev[section] as object), ...value } : value }));
    setUnsaved(true);
  }, []);

  const resetSection = useCallback(<K extends keyof ThemeConfig>(section: K) => {
    setConfig(prev => ({ ...prev, [section]: DEFAULT_THEME_CONFIG[section] }));
    setUnsaved(true);
  }, []);

  const applyPreset = (presetId: string) => {
    const preset = PRESET_THEMES.find(p => p.id === presetId);
    if (preset) { setConfig(preset.config); setUnsaved(true); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/teacher/themes/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Rasm yuklashda xatolik');
      }

      const data = await res.json();
      update('background', {
        type: 'image',
        imageUrl: data.url,
        imagePosition: 'center',
        imageSize: 'cover',
        overlay: 'soft',
        blur: 'none',
      });
    } catch (err: any) {
      setImageError(err.message || 'Rasm yuklashda xatolik yuz berdi');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setImageError(null);
    update('background', {
      type: 'image',
      imageUrl: customUrlInput.trim(),
      imagePosition: 'center',
      imageSize: 'cover',
      overlay: 'soft',
      blur: 'none',
    });
    setCustomUrlInput('');
  };

  const handleSelectWallpaper = (url: string) => {
    setImageError(null);
    update('background', {
      type: 'image',
      imageUrl: url,
      imagePosition: 'center',
      imageSize: 'cover',
      overlay: 'soft',
      blur: 'none',
    });
  };

  const handleRemoveImage = () => {
    update('background', {
      type: 'color',
      imageUrl: undefined,
    });
  };

  const handleSave = async (autoEquip = true) => {
    const trimmedName = name.trim();
    if (!trimmedName) { nameRef.current?.focus(); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/teacher/themes/${editId}` : '/api/teacher/themes';
      const method = editId ? 'PATCH' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, config }),
      });
      if (!r.ok) throw new Error();
      const savedTheme = await r.json();
      const targetId = editId || savedTheme._id;

      if (autoEquip && targetId) {
        await fetch('/api/teacher/themes/equip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId: targetId }),
        });
      }

      await refresh();
      applyThemeToDom(config);
      setSaved(true);
      setUnsaved(false);
      setTimeout(() => setSaved(false), 2500);
      if (!editId && savedTheme._id) {
        router.replace(`/teacher/theme/creator?edit=${savedTheme._id}`);
      }
    } catch {
      alert('Saqlashda xatolik. Qayta urinib ko\'ring.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) return (
    <div className="w-full flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  const sections = ['preset','colors','background','navbar','typography','buttons','cards','spacing','effects'];

  return (
    <div className="w-full py-6 px-2 max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/teacher/theme')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input ref={nameRef} value={name} onChange={e => { setName(e.target.value); setUnsaved(true); }}
              placeholder="Dizayn nomi..."
              className="bg-transparent text-xl md:text-2xl font-black text-white placeholder-white/20 border-none outline-none w-full max-w-xs"
            />
            {unsaved && <p className="text-[10px] text-white/30 font-bold mt-0.5">Saqlanmagan o'zgarishlar bor</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setConfig(DEFAULT_THEME_CONFIG); setUnsaved(true); }}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-black text-white/50 bg-white/5 rounded-xl border border-white/8 hover:bg-white/10 transition-all">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-black text-white rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/25 cursor-pointer"
            style={{ background: saved ? '#10b981' : '#6366f1' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi va Qo\'llandi!' : 'Saqlash va Qo\'llash'}
          </button>
        </div>
      </div>

      {/* Main layout: Controls | Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

        {/* ── Controls Panel ── */}
        <div className="rounded-3xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {/* Section tabs */}
          <div className="flex overflow-x-auto p-3 gap-1 border-b border-white/8 scrollbar-hide">
            {sections.map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer"
                style={{
                  background: activeSection === s ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: activeSection === s ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                  border: activeSection === s ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}>
                {s === 'preset' ? '✨ Preset' : s === 'colors' ? '🎨 Ranglar' : s === 'background' ? '🖼 Fon' : s === 'navbar' ? '🧭 Nav Bar' : s === 'typography' ? '✍ Shrift' : s === 'buttons' ? '🔘 Tugmalar' : s === 'cards' ? '🃏 Kartalar' : s === 'spacing' ? '📐 Bo\'shliq' : '✨ Effektlar'}
              </button>
            ))}
          </div>

          <div className="p-5 overflow-y-auto max-h-[72vh]">

            {/* PRESETS */}
            {activeSection === 'preset' && (
              <div>
                <p className="text-xs text-white/40 mb-4 font-bold">Tayyor dizaynlardan birini tanlang</p>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_THEMES.map(p => (
                    <button key={p.id} onClick={() => applyPreset(p.id)}
                      className="rounded-2xl border p-3 text-left transition-all hover:border-indigo-500/40 cursor-pointer"
                      style={{ background: p.config.colors.surface, borderColor: 'rgba(255,255,255,0.08)' }}>
                      <div className="text-lg mb-1">{p.emoji}</div>
                      <div className="text-xs font-black text-white">{p.name}</div>
                      <div className="flex gap-1 mt-2">
                        {[p.config.colors.primary, p.config.colors.secondary, p.config.colors.accent].map((c, i) => (
                          <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COLORS */}
            {activeSection === 'colors' && (
              <Section title="Rang Palitasi" onReset={() => resetSection('colors')}>
                {[
                  ['Asosiy rang (Primary)', 'primary'],
                  ['Ikkinchi rang (Secondary)', 'secondary'],
                  ['Aksent rang', 'accent'],
                  ['Fon rangi', 'background'],
                  ['Yuzaki rang', 'surface'],
                  ['Matn rangi', 'text'],
                  ['Chegara rangi', 'border'],
                ].map(([label, key]) => (
                  <ColorRow key={key} label={label}
                    value={(config.colors as any)[key]}
                    onChange={v => update('colors', { [key]: v } as any)} />
                ))}
              </Section>
            )}

            {/* BACKGROUND */}
            {activeSection === 'background' && (
              <Section title="Fon Sozlamalari" onReset={() => resetSection('background')}>
                <div className="mb-5">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Fon turi</p>
                  <Chips options={['color', 'gradient', 'preset', 'image'] as any}
                    value={config.background.type}
                    labels={{ color: 'Rang', gradient: 'Gradient', preset: 'Preset', image: 'Rasm / Wallpaper' } as any}
                    onChange={v => {
                      if (v === 'image' && !config.background.imageUrl) {
                        // Default to first curated wallpaper if none set
                        update('background', { type: 'image', imageUrl: WALLPAPER_PRESETS[0].url });
                      } else {
                        update('background', { type: v as any });
                      }
                    }} />
                </div>

                {config.background.type === 'color' && (
                  <ColorRow label="Fon rangi" value={config.background.color}
                    onChange={v => update('background', { color: v })} />
                )}

                {config.background.type === 'gradient' && (
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Gradient</p>
                    <Chips options={['sunset','ocean','purple','midnight','forest','rose'] as any}
                      value={config.background.gradient}
                      onChange={v => update('background', { gradient: v as any })} />
                  </div>
                )}

                {config.background.type === 'preset' && (
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Preset fon</p>
                    <Chips options={['default','ocean','space','forest','sunset','midnight','minimal'] as any}
                      value={config.background.preset}
                      onChange={v => update('background', { preset: v as any })} />
                  </div>
                )}

                {config.background.type === 'image' && (
                  <div className="space-y-5">
                    
                    {/* Active Image Preview Box */}
                    {config.background.imageUrl && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-white/40 font-bold">Joriy Fon Rasmi</p>
                        <div className="relative rounded-2xl overflow-hidden border border-white/20 h-40 w-full bg-black/60 group shadow-xl">
                          <img
                            src={config.background.imageUrl}
                            alt="Background Preview"
                            className="w-full h-full object-cover"
                            style={{
                              filter: config.background.blur && config.background.blur !== 'none'
                                ? { subtle: 'blur(6px)', medium: 'blur(14px)', strong: 'blur(26px)' }[config.background.blur]
                                : 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" /> Almashtirish
                            </button>
                            <button
                              onClick={handleRemoveImage}
                              className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white shadow-lg transition-all cursor-pointer"
                              title="Rasmni o'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* File Upload Box */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2">1. Kompyuterdan Rasm Yuklash</p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="w-full py-5 border-2 border-dashed border-white/20 hover:border-indigo-400/60 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-500/5 transition-all text-white/60 hover:text-indigo-300 disabled:opacity-50 cursor-pointer"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        ) : (
                          <Upload className="w-6 h-6 text-indigo-400" />
                        )}
                        <span className="text-xs font-black uppercase tracking-wider">
                          {uploadingImage ? 'Rasm yuklanmoqda...' : 'Fayl Tanlash (JPG, PNG, WEBP)'}
                        </span>
                        <span className="text-[10px] text-white/30 font-bold">
                          Maksimal hajm: 10MB
                        </span>
                      </button>
                    </div>

                    {/* Direct Image URL Input Box */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2">2. Rasm URL Havolasini Kiritish</p>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/..."
                            value={customUrlInput}
                            onChange={(e) => setCustomUrlInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomUrl(); }}
                            className="w-full h-10 pl-9 pr-3 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-medium focus:outline-none focus:border-indigo-400 placeholder:text-white/20"
                          />
                          <LinkIcon className="w-4 h-4 text-white/30 absolute left-3 top-3" />
                        </div>
                        <button
                          onClick={handleApplyCustomUrl}
                          className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all cursor-pointer shadow-md"
                        >
                          Qo'llash
                        </button>
                      </div>
                    </div>

                    {/* Curated Wallpaper Presets Gallery */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2.5 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> 3. Tayyor Wallpaper Galereyasi
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        {WALLPAPER_PRESETS.map(wp => (
                          <button
                            key={wp.id}
                            onClick={() => handleSelectWallpaper(wp.url)}
                            className={`group relative rounded-xl overflow-hidden border text-left h-24 transition-all cursor-pointer ${
                              config.background.imageUrl === wp.url ? 'border-indigo-400 ring-2 ring-indigo-500/50 scale-[1.02]' : 'border-white/10 hover:border-indigo-400/50'
                            }`}
                          >
                            <img src={wp.url} alt={wp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex items-end">
                              <span className="text-[10px] font-black text-white truncate">{wp.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Blur Level */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2">Rasm xiraligi (Blur)</p>
                      <Chips<BlurLevel>
                        options={['none', 'subtle', 'medium', 'strong']}
                        value={config.background.blur || 'none'}
                        labels={{ none: 'Yo\'q', subtle: 'Yengil (6px)', medium: 'O\'rta (14px)', strong: 'Kuchli (26px)' }}
                        onChange={v => update('background', { blur: v })} />
                    </div>

                    {/* Position */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2">Rasm joylashuvi</p>
                      <Chips options={['center', 'top', 'bottom'] as any}
                        value={config.background.imagePosition || 'center'}
                        labels={{ center: 'Markaz', top: 'Yuqori', bottom: 'Quyi' } as any}
                        onChange={v => update('background', { imagePosition: v as any })} />
                    </div>

                    {/* Size */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2">Rasm o'lchami</p>
                      <Chips options={['cover', 'contain'] as any}
                        value={config.background.imageSize || 'cover'}
                        labels={{ cover: 'To\'liq (Cover)', contain: 'Moslashgan (Contain)' } as any}
                        onChange={v => update('background', { imageSize: v as any })} />
                    </div>

                    {/* Overlay */}
                    <div>
                      <p className="text-[11px] text-white/40 font-bold mb-2">Qoraytirish (Overlay)</p>
                      <Chips options={['none', 'light', 'dark', 'soft'] as any}
                        value={config.background.overlay || 'soft'}
                        labels={{ none: 'Yo\'q', light: 'Yengil', dark: 'Qorong\'i', soft: 'Yumshoq' } as any}
                        onChange={v => update('background', { overlay: v as any })} />
                    </div>

                    {imageError && (
                      <p className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                        {imageError}
                      </p>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* NAVBAR */}
            {activeSection === 'navbar' && (
              <Section title="Nav Bar" onReset={() => resetSection('navbar')}>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Uslub</p>
                    <Chips options={['glass','solid','translucent','floating','minimal'] as any}
                      value={config.navbar?.style || 'glass'}
                      onChange={v => update('navbar', { style: v as any })} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Blur</p>
                    <Chips options={['none','subtle','medium','strong'] as any}
                      value={config.navbar?.blur || 'medium'}
                      onChange={v => update('navbar', { blur: v as any })} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Chegara</p>
                    <Chips options={['none','thin','glow'] as any}
                      value={config.navbar?.border || 'thin'}
                      onChange={v => update('navbar', { border: v as any })} />
                  </div>
                </div>
              </Section>
            )}

            {/* TYPOGRAPHY */}
            {activeSection === 'typography' && (
              <Section title="Shrift va Matn" onReset={() => resetSection('typography')}>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Shrift (Font Family)</p>
                    <Chips options={['inter','poppins','nunito','system'] as any}
                      value={config.typography.fontFamily}
                      onChange={v => update('typography', { fontFamily: v as any })} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">O'lcham Shkalasi</p>
                    <Chips options={['small','normal','large'] as any}
                      value={config.typography.sizeScale}
                      onChange={v => update('typography', { sizeScale: v as any })} />
                  </div>
                </div>
              </Section>
            )}

            {/* BUTTONS */}
            {activeSection === 'buttons' && (
              <Section title="Tugma Uslubi" onReset={() => resetSection('buttons')}>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Shakl (Border Radius)</p>
                    <Chips options={['rounded','pill','square','soft','glass'] as any}
                      value={config.buttons.style}
                      onChange={v => update('buttons', { style: v as any })} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Soya (Shadow)</p>
                    <Chips options={['none','soft','medium','strong','glow'] as any}
                      value={config.buttons.shadow}
                      onChange={v => update('buttons', { shadow: v as any })} />
                  </div>
                </div>
              </Section>
            )}

            {/* CARDS */}
            {activeSection === 'cards' && (
              <Section title="Kartalar Uslubi" onReset={() => resetSection('cards')}>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Foni (Style)</p>
                    <Chips options={['solid','glass','soft','minimal','elevated'] as any}
                      value={config.cards.style}
                      onChange={v => update('cards', { style: v as any })} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Burchaklar (Radius)</p>
                    <Chips options={['small','medium','large','xl','pill'] as any}
                      value={config.cards.radius}
                      onChange={v => update('cards', { radius: v as any })} />
                  </div>
                </div>
              </Section>
            )}

            {/* SPACING */}
            {activeSection === 'spacing' && (
              <Section title="Zichlik va Masofalar" onReset={() => resetSection('spacing')}>
                <div>
                  <p className="text-[11px] text-white/40 font-bold mb-2">Bo'shliq Zichligi</p>
                  <Chips options={['compact','normal','relaxed'] as any}
                    value={config.spacing.density}
                    onChange={v => update('spacing', { density: v as any })} />
                </div>
              </Section>
            )}

            {/* EFFECTS */}
            {activeSection === 'effects' && (
              <Section title="Vizual Effektlar" onReset={() => resetSection('effects')}>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Animatsiyalar</p>
                    <Chips options={['off','subtle','normal','playful'] as any}
                      value={config.effects.animations}
                      onChange={v => update('effects', { animations: v as any })} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 font-bold mb-2">Glassmorphism Blur</p>
                    <Chips options={['off','soft','strong'] as any}
                      value={config.effects.glass}
                      onChange={v => update('effects', { glass: v as any })} />
                  </div>
                </div>
              </Section>
            )}

          </div>
        </div>

        {/* ── Live Preview Panel ── */}
        <div className="rounded-3xl border border-white/8 p-5 flex flex-col justify-between overflow-hidden relative" style={{ background: 'rgba(10,15,25,0.7)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Real-vaqtli Jonli Preview
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              ● Live Sync
            </span>
          </div>

          <div className="flex-1 min-h-[420px] mb-4">
            <LivePreview config={config} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/40 pt-3 border-t border-white/8 flex-wrap gap-2">
            <span>Dizayn nomi: <strong className="text-white">{name}</strong></span>
            <span>Saqlash tugmasini bossangiz, bu dizayn darslik panelingizga birdan qo'llaniladi.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
