'use client';

import { useTeacherTheme, THEMES, TeacherTheme } from '@/lib/teacherTheme';

const ORDER: TeacherTheme[] = ['kids', 'teen', 'adult'];

export default function ThemeToggle() {
  const { theme, setTheme } = useTeacherTheme();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(12px)',
      borderRadius: '999px',
      padding: '4px',
      gap: '2px',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {ORDER.map((id) => {
        const cfg = THEMES[id];
        const isActive = theme === id;
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
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
    </div>
  );
}
