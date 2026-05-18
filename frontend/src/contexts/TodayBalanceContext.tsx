import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useApi } from '../hooks/useApi';
import { useFetch } from '../hooks/useFetch';
import { SCHEDULE_API } from '../services/api';
import { buildDailyBalanceState } from '../utils/dailyBalance';
import type { ScheduleItem } from '../types';

const todayValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

type TodayBalanceContextValue = {
  items: ScheduleItem[];
  total: number;
  positiveValues: number[];
  negativeValues: number[];
  status: '沉' | '平' | '轻';
  nudge: boolean;
  loading: boolean;
  refresh: () => void;
};

const TodayBalanceContext = createContext<TodayBalanceContextValue | undefined>(undefined);

export function TodayBalanceProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { data, loading, refetch } = useFetch<ScheduleItem[]>(
    () => apiFetch(SCHEDULE_API.byDate(todayValue())),
    [apiFetch],
  );

  const value = useMemo<TodayBalanceContextValue>(() => {
    const items = data ?? [];
    const values = items.map(item => item.feeling);
    const total = values.reduce((sum, value) => sum + value, 0);
    const model = buildDailyBalanceState(total);

    return {
      items,
      total,
      positiveValues: values.filter(value => value > 0),
      negativeValues: values.filter(value => value < 0),
      status: model.status,
      nudge: model.nudge,
      loading,
      refresh: refetch,
    };
  }, [data, loading, refetch]);

  return <TodayBalanceContext.Provider value={value}>{children}</TodayBalanceContext.Provider>;
}

export function useTodayBalance() {
  const context = useContext(TodayBalanceContext);
  if (!context) {
    throw new Error('useTodayBalance must be used within TodayBalanceProvider');
  }
  return context;
}
