'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { TeacherTheme, TeacherThemeContextValue } from './themeTypes';
import { applyThemeToDom, removeThemeFromDom, sanitizeThemeConfig } from './themeEngine';
import { DEFAULT_THEME_CONFIG } from './themeDefaults';

const LS_KEY = 'mt_vocab_teacher_theme_equipped';

const TeacherThemeContext = createContext<TeacherThemeContextValue>({
  equippedTheme: null,
  themes: [],
  loading: true,
  refresh: async () => {},
  equipTheme: async () => {},
  resetToDefault: async () => {},
});

export function TeacherThemeProvider({ children }: { children: React.ReactNode }) {
  const [themes, setThemes] = useState<TeacherTheme[]>([]);
  const [equippedTheme, setEquippedTheme] = useState<TeacherTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const appliedConfigRef = useRef<string | null>(null);

  const applyTheme = useCallback((theme: TeacherTheme | null) => {
    if (!theme) {
      removeThemeFromDom();
      appliedConfigRef.current = null;
      try { localStorage.removeItem(LS_KEY); } catch {}
      return;
    }

    const configStr = JSON.stringify(theme.config);
    if (appliedConfigRef.current === configStr) return; // Skip redundant re-renders / flashes

    const safe = sanitizeThemeConfig(theme.config);
    applyThemeToDom(safe);
    appliedConfigRef.current = configStr;
    try { localStorage.setItem(LS_KEY, JSON.stringify(theme)); } catch {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/teacher/themes');
      if (!res.ok) return;
      const data: TeacherTheme[] = await res.json();
      const equipped = data.find(t => t.isEquipped) ?? null;

      setThemes(data);
      setEquippedTheme(equipped);
      applyTheme(equipped);
    } catch {
      // silently fall back on network error
    }
  }, [applyTheme]);

  // On mount: fast apply from localStorage cache, then sync from server
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as TeacherTheme;
        if (parsed && parsed.config) {
          const configStr = JSON.stringify(parsed.config);
          applyThemeToDom(sanitizeThemeConfig(parsed.config));
          appliedConfigRef.current = configStr;
          setEquippedTheme(parsed);
        }
      }
    } catch {}

    refresh().finally(() => setLoading(false));
  }, [applyTheme, refresh]);

  const equipTheme = useCallback(async (id: string) => {
    const res = await fetch(`/api/teacher/themes/equip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId: id }),
    });
    if (!res.ok) throw new Error('Failed to equip theme');
    await refresh();
  }, [refresh]);

  const resetToDefault = useCallback(async () => {
    const res = await fetch('/api/teacher/themes/equip-default', { method: 'POST' });
    if (res.ok) {
      removeThemeFromDom();
      appliedConfigRef.current = null;
      setEquippedTheme(null);
      try { localStorage.removeItem(LS_KEY); } catch {}
      await refresh();
    }
  }, [refresh]);

  return (
    <TeacherThemeContext.Provider value={{ equippedTheme, themes, loading, refresh, equipTheme, resetToDefault }}>
      {children}
    </TeacherThemeContext.Provider>
  );
}

export function useTeacherTheme() {
  return useContext(TeacherThemeContext);
}