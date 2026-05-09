import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ThemeType } from '../types';

const THEME_KEY = 'app-theme';

function getInitialTheme(): ThemeType {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'minimal') return stored;
  return 'morandi';
}

function applyTheme(theme: ThemeType) {
  document.documentElement.setAttribute('data-theme', theme);
}

interface ThemeContextType {
  theme: ThemeType;
  // eslint-disable-next-line no-unused-vars
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeType) => {
    localStorage.setItem(THEME_KEY, newTheme);
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
