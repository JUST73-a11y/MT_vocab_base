'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { StudentTheme, StudentThemeContextValue } from './themeTypes';
import { applyThemeToDom, removeThemeFromDom, sanitizeThemeConfig } from './themeEngine';
import { DEFAULT_THEME_CONFIG } from './themeDefaults';

const LS_KEY = 'mt_vocab_student_theme_equipped';

const StudentThemeContext = createContext<StudentThemeContextValue>({
  equippedTheme: null,
  themes: [],
  loading: true,
  refresh: async () => {},
  equipTheme: async () => {},
  resetToDefault: async () => {},
});

export function StudentThemeProvider({ children }: { children: React.ReactNode }) {
  const [themes, setThemes] = useState<StudentTheme[]>([]);
  const [equippedTheme, setEquippedTheme] = useState<StudentTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const appliedConfigRef = useRef<string | null>(null);

  const applyTheme = useCallback((theme: StudentTheme | null) => {
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
      const res = await fetch('/api/student/themes');
      if (!res.ok) return;
      const data: StudentTheme[] = await res.json();
      const equipped = data.find(t => t.isEquipped) ?? null;

      setThemes(data);
      setEquippedTheme(equipped);
      applyTheme(equipped);
    } catch {
      // silently fall back to default on network error
    }
  }, [applyTheme]);

  // On mount: fast apply from localStorage cache, then sync from server
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as StudentTheme;
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
    const res = await fetch(`/api/student/themes/${id}/equip`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to equip theme');
    await refresh();
  }, [refresh]);

  const resetToDefault = useCallback(async () => {
    // Unequip all themes
    const res = await fetch('/api/student/themes/equip-default', { method: 'POST' });
    if (res.ok) {
      removeThemeFromDom();
      appliedConfigRef.current = null;
      setEquippedTheme(null);
      try { localStorage.removeItem(LS_KEY); } catch {}
      await refresh();
    }
  }, [refresh]);

  return (
    <StudentThemeContext.Provider value={{ equippedTheme, themes, loading, refresh, equipTheme, resetToDefault }}>
      {children}
    </StudentThemeContext.Provider>
  );
}

export function useStudentTheme() {
  return useContext(StudentThemeContext);
}
