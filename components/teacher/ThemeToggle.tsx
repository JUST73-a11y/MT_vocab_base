'use client';

import { useTeacherTheme as useLegacyTeacherTheme, THEMES, TeacherTheme } from '@/lib/teacherTheme';
import { useTeacherTheme as useNewTeacherTheme } from '@/lib/theme/TeacherThemeContext';
import { PRESET_THEMES } from '@/lib/theme/themeDefaults';
import { Palette } from 'lucide-react';
import Link from 'next/link';

const ORDER: TeacherTheme[] = ['kids', 'teen', 'adult'];

export default function ThemeToggle() {
  const { theme, setTheme } = useLegacyTeacherTheme();
  const { equipTheme } = useNewTeacherTheme();

  const handleSelect = async (id: TeacherTheme) => {
    setTheme(id);
    const preset = PRESET_THEMES.find(p => p.id === id);
    if (preset) {
      try {
        const res = await fetch('/api/teacher/themes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: preset.name, config: preset.config }),
        });
        if (res.ok) {
          const data = await res.json();
          await equipTheme(data._id);
        }
      } catch {}
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(12px)',
      borderRadius: '999px',
      padding: '4px',
      gap: '4px',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {ORDER.map((id) => {
        const cfg = THEMES[id];
        const isActive = theme === id;
        return (
          <button
            key={id}
            onClick={() => handleSelect(id)}
            title={cfg.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: isActive ? '7px 14px' : '7px 10px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: 12,
              fontFamily: 'inherit',
              transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
              background: isActive
                ? cfg.accentColor
                : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              boxShadow: isActive
                ? `0 3px 12px ${cfg.accentGlow}`
                : 'none',
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>{cfg.emoji}</span>
            <span
              style={{
                maxWidth: isActive ? 50 : 0,
                overflow: 'hidden',
                transition: 'max-width 0.25s ease',
                display: 'inline-block',
              }}
            >
              {cfg.label}
            </span>
          </button>
        );
      })}

      <Link
        href="/teacher/theme"
        title="Dizayn va Mavzular"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.7)',
          transition: 'all 0.2s ease',
        }}
        className="hover:bg-white/15 hover:text-white"
      >
        <Palette style={{ width: '15px', height: '15px' }} />
      </Link>
    </div>
  );
}
