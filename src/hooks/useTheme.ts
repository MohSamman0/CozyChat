import { useState, useEffect, useCallback } from 'react';

export type Theme = 'warm-light' | 'warm-dark';

const THEME_STORAGE_KEY = 'cozy-chat-theme';

export const useTheme = () => {
  // Always start with warm-light on server, then hydrate from localStorage
  const [theme, setThemeState] = useState<Theme>('warm-light');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (saved && ['warm-light', 'warm-dark'].includes(saved)) {
        setThemeState(saved);
      }
      setIsInitialized(true);
    }
  }, []);

  // Apply theme globally to entire website
  useEffect(() => {
    // Only apply theme after component has initialized to prevent hydration issues
    if (!isInitialized) return;
    
    const root = document.documentElement;
    const body = document.body;
    
    // Remove any existing theme attributes
    root.removeAttribute('data-theme');
    body.removeAttribute('data-theme');
    
    // Apply new theme globally
    if (theme === 'warm-dark') {
      root.setAttribute('data-theme', 'warm-dark');
      body.setAttribute('data-theme', 'warm-dark');
    }
    // warm-light is the default (no data-theme attribute needed)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    
    // Theme applied successfully
  }, [theme, isInitialized]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'warm-light' ? 'warm-dark' : 'warm-light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isLight: theme === 'warm-light',
    isDark: theme === 'warm-dark',
    isInitialized,
  };
};
