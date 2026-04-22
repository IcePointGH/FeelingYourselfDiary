import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ThemeType } from '../types';

interface ThemeContextType {
  theme: ThemeType;
  // eslint-disable-next-line no-unused-vars
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('theme') as ThemeType) || 'morandi';
  });

  const setTheme = useCallback((newTheme: ThemeType) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
    document.body.className = newTheme === 'minimal' ? 'minimal-theme' : '';
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
