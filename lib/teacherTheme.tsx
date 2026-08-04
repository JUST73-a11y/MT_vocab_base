'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type TeacherTheme = 'kids' | 'teen' | 'adult';

export interface ThemeConfig {
  id: TeacherTheme;
  label: string;
  emoji: string;
  bgImage: string;
  overlayStyle: React.CSSProperties;
  navStyle: React.CSSProperties;
  accentColor: string;
  accentGlow: string;
  btnRadius: string;
  fontFamily: string;
  activeNavBg: string;
  activeNavText: string;
  bodyClass: string;
}

export const THEMES: Record<TeacherTheme, ThemeConfig> = {
  kids: {
    id: 'kids',
    label: 'Kids',
    emoji: '🌈',
    bgImage: '/themes/kids-bg.jpg',
    overlayStyle: {
      background: 'rgba(10,20,40,0.55)',
      backdropFilter: 'blur(6px)',
    },
    navStyle: {
      background: 'rgba(10,20,40,0.80)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    accentColor: '#FF6B35',
    accentGlow: 'rgba(255,107,53,0.4)',
    btnRadius: '24px',
    fontFamily: "'Fredoka', 'Nunito', sans-serif",
    activeNavBg: 'rgba(255,107,53,0.15)',
    activeNavText: '#D94F00',
    bodyClass: 'theme-kids',
  },
  teen: {
    id: 'teen',
    label: 'Teen',
    emoji: '🎧',
    bgImage: '/themes/teen-bg.jpg',
    overlayStyle: {
      background: 'rgba(0,0,0,0.2)', // Lighter overlay to preserve image quality
    },
    navStyle: {
      background: 'rgba(15,10,30,0.80)',
      backdropFilter: 'blur(20px)',
      borderBottom: '2px solid rgba(139,92,246,0.5)',
    },
    accentColor: '#8B5CF6',
    accentGlow: 'rgba(139,92,246,0.5)',
    btnRadius: '12px',
    fontFamily: "inherit",
    activeNavBg: 'rgba(139,92,246,0.15)',
    activeNavText: '#A78BFA',
    bodyClass: 'theme-teen',
  },
  adult: {
    id: 'adult',
    label: 'Adult',
    emoji: '🏔️',
    bgImage: '/themes/adult-bg.jpg',
    overlayStyle: {
      background: 'rgba(10,20,40,0.55)',
    },
    navStyle: {
      background: 'rgba(10,20,40,0.80)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    accentColor: '#3B82F6',
    accentGlow: 'rgba(59,130,246,0.4)',
    btnRadius: '8px',
    fontFamily: "inherit",
    activeNavBg: 'rgba(59,130,246,0.15)',
    activeNavText: '#60A5FA',
    bodyClass: 'theme-adult',
  },
};

interface TeacherThemeContextValue {
  theme: TeacherTheme;
  config: ThemeConfig;
  setTheme: (t: TeacherTheme) => void;
}

const TeacherThemeContext = createContext<TeacherThemeContextValue>({
  theme: 'kids',
  config: THEMES.kids,
  setTheme: () => {},
});

const LS_KEY = 'teacher_audience_theme';

export function TeacherThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<TeacherTheme>('kids');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as TeacherTheme | null;
      if (saved && saved in THEMES) setThemeState(saved);
    } catch {}
  }, []);

  const setTheme = (t: TeacherTheme) => {
    setThemeState(t);
    try { localStorage.setItem(LS_KEY, t); } catch {}
  };

  return (
    <TeacherThemeContext.Provider value={{ theme, config: THEMES[theme], setTheme }}>
      {children}
    </TeacherThemeContext.Provider>
  );
}

export function useTeacherTheme() {
  return useContext(TeacherThemeContext);
}
