import { useState, useCallback } from 'react';
import type { FeelingSelectorMode } from '../types';

const STORAGE_KEY = 'feelingSelectorMode';

function getInitialMode(): FeelingSelectorMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'buttons' || stored === 'slider' || stored === 'tuner') return stored;
  if (stored === 'balance') {
    localStorage.setItem(STORAGE_KEY, 'tuner');
    return 'tuner';
  }
  return 'buttons';
}

export function useFeelingMode() {
  const [mode, setModeState] = useState<FeelingSelectorMode>(getInitialMode);

  const setMode = useCallback((newMode: FeelingSelectorMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    setModeState(newMode);
  }, []);

  return { mode, setMode };
}
