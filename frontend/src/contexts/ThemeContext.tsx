import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ThemeType } from '../types';

interface ThemeContextType {
  theme: ThemeType;
  // eslint-disable-next-line no-unused-vars
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<ThemeType>('morandi');

  // Ensure no stale minimal-theme class lingers from prior sessions
  useEffect(() => {
    document.body.classList.remove('minimal-theme');
  }, []);

  const setTheme = useCallback((_newTheme: ThemeType) => {
    // Theme locked to Morandi
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
