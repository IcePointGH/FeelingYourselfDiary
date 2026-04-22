import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useApi } from '../hooks/useApi';
import { SETTINGS_API } from '../services/api';

const defaultEmotionLabels: Record<string, string> = {
  '3': '极好',
  '2': '很好',
  '1': '不错',
  '0': '平淡',
  '-1': '稍差',
  '-2': '不好',
  '-3': '极差',
};

interface EmotionLabelsContextValue {
  emotionLabels: Record<string, string>;
  refreshLabels: () => Promise<void>;
}

const EmotionLabelsContext = createContext<EmotionLabelsContextValue>({
  emotionLabels: defaultEmotionLabels,
  refreshLabels: async () => {},
});

export function EmotionLabelsProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const [emotionLabels, setEmotionLabels] = useState<Record<string, string>>(defaultEmotionLabels);

  const refreshLabels = useCallback(async () => {
    try {
      const data = await apiFetch(SETTINGS_API.base);
      if (data && typeof data.emotionLabels === 'string') {
        const parsed = JSON.parse(data.emotionLabels) as Record<string, string>;
        setEmotionLabels({ ...defaultEmotionLabels, ...parsed });
      } else {
        setEmotionLabels(defaultEmotionLabels);
      }
    } catch {
      setEmotionLabels(defaultEmotionLabels);
    }
  }, [apiFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshLabels();
  }, [refreshLabels]);

  return (
    <EmotionLabelsContext.Provider value={{ emotionLabels, refreshLabels }}>
      {children}
    </EmotionLabelsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEmotionLabels() {
  return useContext(EmotionLabelsContext);
}
