'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStudentTheme } from '@/lib/theme/StudentThemeContext';
import type { ThemeConfig, BlurLevel, NavbarStyle, NavbarBorder } from '@/lib/theme/themeTypes';
import { DEFAULT_THEME_CONFIG, PRESET_THEMES } from '@/lib/theme/themeDefaults';
import { sanitizeThemeConfig, applyThemeToDom } from '@/lib/theme/themeEngine';
import { ArrowLeft, Save, Sparkles, RotateCcw, Loader2, Check, Upload, Trash2, CheckCircle2 } from 'lucide-react';

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
          className="px-3 py-1.5 rounded-xl text-xs font-black transition-all"
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
          <input type="color" value={value.startsWith('#') ? value : '#6366f1'} onChange={e => onChange(e.target.value)}
            className="w-8 h-8 opacity-0 cursor-pointer -ml-1 -mt-1" />
        </div>
        <span className="text-[10px] font-mono text-white/30">{value.startsWith('#') ? value : 'auto'}</span>
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
    bgImage = `url(${config.background.imageUrl})`;
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
  const btnShadow = {
    none: 'none',
    soft: '0 2px 10px rgba(0,0,0,0.3)',
    medium: '0 4px 20px rgba(0,0,0,0.5)',
    strong: '0 8px 30px rgba(0,0,0,0.7)',
    glow: `0 0 20px ${btnBg}80`,
  }[config.buttons.shadow] || 'none';
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
            {['Dashboard', 'O\'yinlar', 'Mashq'].map(n => (
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
            boxShadow: btnShadow,
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
  const { refresh, equippedTheme, equipTheme } = useStudentTheme();

  const [name, setName] = useState("O'quvchi Dizayni");
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('preset');
  const [unsaved, setUnsaved] = useState(false);
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
    fetch(`/api/student/themes/${editId}`)
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
    return () => {};
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

      const res = await fetch('/api/student/themes/upload', {
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

  const handleRemoveImage = () => {
    update('background', {
      type: 'preset',
      imageUrl: undefined,
    });
  };

  const handleSave = async (autoEquip = true) => {
    const trimmedName = name.trim();
    if (!trimmedName) { nameRef.current?.focus(); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/student/themes/${editId}` : '/api/student/themes';
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
        await fetch('/api/student/themes/equip', {
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
        router.replace(`/student/theme/creator?edit=${savedTheme._id}`);
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
          <button onClick={() => router.push('/student/theme')}
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
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-black text-white rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/25"
            style={{ background: saved ? '#10b981' : '#6366f1' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saqlanmoqda...' : saved ? 'Saqlandi va Qo\'llandi!' : 'Saqlash va Qo\'llash'}
          </button>
        </div>
      </div>

      {/* Main layout: Controls | Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

        {/* ── Controls Panel ── */}
        <div className="rounded-3xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {/* Section tabs */}
          <div className="flex overflow-x-auto p-3 gap-1 border-b border-white/8 scrollbar-hide">
            {sections.map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: activeSection === s ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: activeSection === s ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
                  border: activeSection === s ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                }}>
                {s === 'preset' ? '✨ Preset' : s === 'colors' ? '🎨 Ranglar' : s === 'background' ? '🖼 Fon' : s === 'navbar' ? '🧭 Nav Bar' : s === 'typography' ? '✍ Shrift' : s === 'buttons' ? '🔘 Tugmalar' : s === 'cards' ? '🃏 Kartalar' : s === 'spacing' ? '📐 Bo\'shliq' : '✨ Effektlar'}
              </button>
            ))}
          </div>

          <div className="p-5 overflow-y-auto max-h-[70vh]">

            {/* PRESETS */}
            {activeSection === 'preset' && (
              <div>
                <p className="text-xs text-white/40 mb-4 font-bold">Tayyor dizaynlardan birini tanlang</p>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_THEMES.map(p => (
                    <button key={p.id} onClick={() => applyPreset(p.id)}
                      className="rounded-2xl border p-3 text-left transition-all hover:border-indigo-500/40"
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
              <Section title="Fon" onReset={() => resetSection('background')}>
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Fon turi</p>
                  <Chips options={['color', 'gradient', 'preset', 'image'] as any}
                    value={config.background.type}
                    labels={{ color: 'Rang', gradient: 'Gradient', preset: 'Preset', image: 'Rasm' } as any}
                    onChange={v => update('background', { type: v as any })} />
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
                    <Chips options={['default','ocean','space','forest','sunset','midnight','minimal','kids','teen','adult'] as any}
                      value={config.background.preset}
                      onChange={v => update('background', { preset: v as any })} />
                  </div>
                )}

                {config.background.type === 'image' && (
                  <div className="space-y-4">
                    {config.background.imageUrl ? (
                      <div className="space-y-3">
                        <div className="relative rounded-2xl overflow-hidden border border-white/15 h-36 w-full bg-black/40 group">
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
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingImage}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5"
                            >
                              <Upload className="w-3.5 h-3.5" /> Almashtirish
                            </button>
                            <button
                              onClick={handleRemoveImage}
                              className="p-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white shadow-lg transition-all"
                              title="Rasmni o'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                        />

                        {/* Background Image Blur */}
                        <div>
                          <p className="text-[11px] text-white/40 font-bold mb-2">Rasm xiraligi (Blur)</p>
                          <Chips<BlurLevel>
                            options={['none', 'subtle', 'medium', 'strong']}
                            value={config.background.blur || 'none'}
                            labels={{ none: 'Yo\'q', subtle: 'Yengil (6px)', medium: 'O\'rta (14px)', strong: 'Kuchli (26px)' }}
                            onChange={v => update('background', { blur: v })} />
                        </div>

                        <div>
                          <p className="text-[11px] text-white/40 font-bold mb-2">Rasm joylashuvi</p>
                          <Chips options={['center', 'top', 'bottom'] as any}
                            value={config.background.imagePosition || 'center'}
                            labels={{ center: 'Markaz', top: 'Yuqori', bottom: 'Quyi' } as any}
                            onChange={v => update('background', { imagePosition: v as any })} />
                        </div>

                        <div>
                          <p className="text-[11px] text-white/40 font-bold mb-2">Rasm o'lchami</p>
                          <Chips options={['cover', 'contain'] as any}
                            value={config.background.imageSize || 'cover'}
                            labels={{ cover: 'To\'liq (Cover)', contain: 'Moslashgan (Contain)' } as any}
                            onChange={v => update('background', { imageSize: v as any })} />
                        </div>

                        <div>
                          <p className="text-[11px] text-white/40 font-bold mb-2">Qoraytirish (Overlay)</p>
                          <Chips options={['none', 'light', 'dark', 'soft'] as any}
                            value={config.background.overlay || 'soft'}
                            labels={{ none: 'Yo\'q', light: 'Yengil', dark: 'Qorong\'i', soft: 'Yumshoq' } as any}
                            onChange={v => update('background', { overlay: v as any })} />
                        </div>
                      </div>
                    ) : (
                      <div>
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
                          className="w-full py-8 border-2 border-dashed border-white/20 hover:border-indigo-400/60 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-500/5 transition-all text-white/50 hover:text-indigo-300 disabled:opacity-50"
                        >
                          {uploadingImage ? (
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                          ) : (
                            <Upload className="w-8 h-8 text-indigo-400" />
                          )}
                          <span className="text-xs font-black uppercase tracking-wider">
                            {uploadingImage ? 'Yuklanmoqda...' : 'Kompyuterdan rasm yuklash'}
                          </span>
                          <span className="text-[10px] text-white/30 font-bold">
                            JPG, PNG, WEBP (maks. 3MB)
                          </span>
                        </button>
                      </div>
                    )}

                    {imageError && (
                      <p className="text-xs text-red-400 font-bold">{imageError}</p>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* NAVBAR */}
            {activeSection === 'navbar' && (
              <Section title="Navigatsiya Paneli (Nav Bar)" onReset={() => update('navbar', { style: 'glass', blur: 'medium', border: 'thin' })}>
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Nav Bar uslubi</p>
                  <Chips<NavbarStyle>
                    options={['glass', 'solid', 'translucent', 'floating', 'minimal']}
                    value={config.navbar?.style || 'glass'}
                    labels={{ glass: 'Shisha (Glass)', solid: 'To\'liq (Solid)', translucent: 'Shaffof', floating: 'Suzuvchi (Floating)', minimal: 'Minimal' }}
                    onChange={v => update('navbar', { style: v })} />
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Nav Bar xiraligi (Backdrop Blur)</p>
                  <Chips<BlurLevel>
                    options={['none', 'subtle', 'medium', 'strong']}
                    value={config.navbar?.blur || 'medium'}
                    labels={{ none: 'Yo\'q', subtle: 'Yengil (10px)', medium: 'O\'rta (20px)', strong: 'Kuchli (36px)' }}
                    onChange={v => update('navbar', { blur: v })} />
                </div>

                <div>
                  <p className="text-[11px] text-white/40 font-bold mb-2">Nav Bar chegarasi</p>
                  <Chips<NavbarBorder>
                    options={['none', 'thin', 'glow']}
                    value={config.navbar?.border || 'thin'}
                    labels={{ none: 'Yo\'q', thin: 'Yupqa', glow: 'Porlovchi (Glow)' }}
                    onChange={v => update('navbar', { border: v })} />
                </div>
              </Section>
            )}

            {/* TYPOGRAPHY */}
            {activeSection === 'typography' && (
              <Section title="Tipografiya" onReset={() => resetSection('typography')}>
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Shrift</p>
                  <Chips options={['inter','poppins','nunito','system'] as any}
                    value={config.typography.fontFamily}
                    labels={{ inter: 'Inter', poppins: 'Poppins', nunito: 'Nunito', system: 'System' } as any}
                    onChange={v => update('typography', { fontFamily: v as any })} />
                </div>
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">O'lcham</p>
                  <Chips options={['small','normal','large'] as any}
                    value={config.typography.sizeScale}
                    labels={{ small: 'Kichik', normal: 'Normal', large: 'Katta' } as any}
                    onChange={v => update('typography', { sizeScale: v as any })} />
                </div>
                <div>
                  <p className="text-[11px] text-white/40 font-bold mb-2">Qalinlik</p>
                  <Chips options={['normal','medium','bold'] as any}
                    value={config.typography.weight}
                    labels={{ normal: 'Normal', medium: 'O\'rta', bold: 'Qalin' } as any}
                    onChange={v => update('typography', { weight: v as any })} />
                </div>
              </Section>
            )}

            {/* BUTTONS */}
            {activeSection === 'buttons' && (
              <Section title="Tugmalar" onReset={() => resetSection('buttons')}>
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Tugma Shakli</p>
                  <Chips options={['rounded','pill','square','soft','glass'] as any}
                    value={config.buttons.style}
                    labels={{ rounded: 'Yumaloq (12px)', pill: 'Kapsula (Pill)', square: 'To\'rtburchak (4px)', soft: 'Yumshoq (8px)', glass: 'Shisha' } as any}
                    onChange={v => update('buttons', { style: v as any })} />
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Tugma Ranglari</p>
                  <div className="space-y-1">
                    <ColorRow
                      label="Asosiy Tugma Rangi"
                      desc="Barcha asosiy harakat tugmalari foni"
                      value={config.buttons?.primaryBg || config.colors.primary}
                      onChange={v => {
                        update('buttons', { primaryBg: v });
                        update('colors', { primary: v });
                      }}
                    />
                    <ColorRow
                      label="Tugma Matn Rangi"
                      desc="Tugma ichidagi yozuv rangi"
                      value={config.buttons?.textColor || '#ffffff'}
                      onChange={v => update('buttons', { textColor: v })}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Soya va Neon Porlash (Shadow)</p>
                  <Chips options={['none','soft','medium','strong','glow'] as any}
                    value={config.buttons.shadow}
                    labels={{ none: 'Yo\'q', soft: 'Yengil', medium: 'O\'rta', strong: 'Kuchli', glow: 'Neon Porlash' } as any}
                    onChange={v => update('buttons', { shadow: v as any })} />
                </div>

                <div>
                  <p className="text-[11px] text-white/40 font-bold mb-2">Hover va Bosilish Kattalashuvi</p>
                  <Chips options={['minimal','normal','playful'] as any}
                    value={config.buttons?.hoverScale || 'normal'}
                    labels={{ minimal: 'Yengil (1.01x)', normal: 'Normal (1.03x)', playful: 'Katta (1.06x)' } as any}
                    onChange={v => update('buttons', { hoverScale: v as any })} />
                </div>
              </Section>
            )}

            {/* CARDS */}
            {activeSection === 'cards' && (
              <Section title="Kartalar" onReset={() => resetSection('cards')}>
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Stil</p>
                  <Chips options={['solid','glass','soft','minimal','elevated'] as any}
                    value={config.cards.style}
                    labels={{ solid: 'Solid', glass: 'Shisha', soft: 'Yumshoq', minimal: 'Minimal', elevated: 'Ko\'tarilgan' } as any}
                    onChange={v => update('cards', { style: v as any })} />
                </div>

                {/* Box / Card Blur */}
                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Karta / Box xiraligi (Backdrop Blur)</p>
                  <Chips<BlurLevel>
                    options={['none', 'subtle', 'medium', 'strong']}
                    value={config.cards.blur || 'subtle'}
                    labels={{ none: 'Yo\'q', subtle: 'Yengil (12px)', medium: 'O\'rta (24px)', strong: 'Kuchli (40px)' }}
                    onChange={v => update('cards', { blur: v })} />
                </div>

                <div className="mb-4">
                  <p className="text-[11px] text-white/40 font-bold mb-2">Burchaklar</p>
                  <Chips options={['small','medium','large','xl','pill'] as any}
                    value={config.cards.radius}
                    labels={{ small: 'Kichik', medium: 'O\'rta', large: 'Katta', xl: 'XL', pill: 'Pill' } as any}
                    onChange={v => update('cards', { radius: v as any })} />
                </div>
                <div>
                  <p className="text-[11px] text-white/40 font-bold mb-2">Soya</p>
                  <Chips options={['none','soft','medium','strong','glow'] as any}
                    value={config.cards.shadow}
                    labels={{ none: 'Yo\'q', soft: 'Yengil', medium: 'O\'rta', strong: 'Kuchli', glow: 'Porlash' } as any}
                    onChange={v => update('cards', { shadow: v as any })} />
                </div>
              </Section>
            )}

            {/* SPACING */}
            {activeSection === 'spacing' && (
              <Section title="Bo'shliq zichligi" onReset={() => resetSection('spacing')}>
                <p className="text-xs text-white/30 mb-3">Global bo'shliq miqdori. Bu barcha kartalar, bo'limlar va tugmalar uchun ishlaydi.</p>
                <Chips options={['compact','normal','relaxed'] as any}
                  value={config.spacing.density}
                  labels={{ compact: 'Zich', normal: 'Normal', relaxed: 'Keng' } as any}
                  onChange={v => update('spacing', { density: v as any })} />
              </Section>
            )}

            {/* EFFECTS */}
            {activeSection === 'effects' && (
              <>
                <Section title="Animatsiyalar" onReset={() => resetSection('effects')}>
                  <Chips options={['off','subtle','normal','playful'] as any}
                    value={config.effects.animations}
                    labels={{ off: 'O\'chiq', subtle: 'Kamroq', normal: 'Normal', playful: 'O\'ynoqi' } as any}
                    onChange={v => update('effects', { animations: v as any })} />
                </Section>
                <Section title="Shisha effekt (Glassmorphism)" onReset={() => update('effects', { glass: 'soft' })}>
                  <Chips options={['off','soft','strong'] as any}
                    value={config.effects.glass}
                    labels={{ off: 'O\'chiq', soft: 'Yengil', strong: 'Kuchli' } as any}
                    onChange={v => update('effects', { glass: v as any })} />
                </Section>
                <Section title="Hover effekti" onReset={() => update('effects', { hover: 'normal' })}>
                  <Chips options={['minimal','normal','playful'] as any}
                    value={config.effects.hover}
                    labels={{ minimal: 'Minimal', normal: 'Normal', playful: 'O\'ynoqi' } as any}
                    onChange={v => update('effects', { hover: v as any })} />
                </Section>
              </>
            )}
          </div>
        </div>

        {/* ── Live Preview Panel ── */}
        <div className="sticky top-24 h-fit">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <p className="text-xs font-black uppercase tracking-widest text-white/40">Jonli Ko'rinish (O'quvchi)</p>
          </div>
          <LivePreview config={config} />
          <p className="text-center text-[10px] text-white/20 font-bold mt-3">O'zgartirish kiritganingizda ko'rinish darhol yangilanadi</p>
        </div>
      </div>
    </div>
  );
}
