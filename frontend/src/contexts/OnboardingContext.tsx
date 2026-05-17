import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type OnboardingState = {
  hasCreatedSchedule: boolean;
  hasCreatedDiary: boolean;
  hasViewedAnalysis: boolean;
  dismissed: boolean;
  completed: boolean;
  updatedAt: number;
};

const STORAGE_KEY = 'onboarding.phase5';

const INITIAL_STATE: OnboardingState = {
  hasCreatedSchedule: false,
  hasCreatedDiary: false,
  hasViewedAnalysis: false,
  dismissed: false,
  completed: false,
  updatedAt: 0,
};

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_STATE };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.hasCreatedSchedule !== 'boolean' ||
      typeof parsed.hasCreatedDiary !== 'boolean' ||
      typeof parsed.hasViewedAnalysis !== 'boolean'
    ) {
      return { ...INITIAL_STATE };
    }
    return {
      hasCreatedSchedule: parsed.hasCreatedSchedule,
      hasCreatedDiary: parsed.hasCreatedDiary,
      hasViewedAnalysis: parsed.hasViewedAnalysis,
      dismissed: !!parsed.dismissed,
      completed: !!parsed.completed,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked — degrade gracefully
  }
}

type OnboardingStep = 1 | 2 | 3;

type OnboardingContextValue = {
  state: OnboardingState;
  isActive: boolean;
  currentStep: OnboardingStep;
  remainingSteps: number;
  nextRoute: string;
  nextActionLabel: string;
  markScheduleCreated: () => void;
  markDiaryCreated: () => void;
  markAnalysisViewed: () => void;
  dismissOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboardingForDebug: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(loadState);

  const persist = useCallback((next: OnboardingState) => {
    const withTimestamp = { ...next, updatedAt: Date.now() };
    setState(withTimestamp);
    saveState(withTimestamp);
  }, []);

  const deriveCompleted = useCallback(
    (s: OnboardingState): OnboardingState => {
      const completed = s.hasCreatedSchedule && s.hasCreatedDiary && s.hasViewedAnalysis;
      if (completed && !s.completed) {
        return { ...s, completed: true };
      }
      return s;
    },
    [],
  );

  const markScheduleCreated = useCallback(() => {
    setState(prev => {
      if (prev.hasCreatedSchedule) return prev;
      const next = deriveCompleted({ ...prev, hasCreatedSchedule: true });
      persist(next);
      return next;
    });
  }, [persist, deriveCompleted]);

  const markDiaryCreated = useCallback(() => {
    setState(prev => {
      if (prev.hasCreatedDiary) return prev;
      const next = deriveCompleted({ ...prev, hasCreatedDiary: true });
      persist(next);
      return next;
    });
  }, [persist, deriveCompleted]);

  const markAnalysisViewed = useCallback(() => {
    setState(prev => {
      if (prev.hasViewedAnalysis) return prev;
      const next = deriveCompleted({ ...prev, hasViewedAnalysis: true });
      persist(next);
      return next;
    });
  }, [persist, deriveCompleted]);

  const dismissOnboarding = useCallback(() => {
    setState(prev => {
      const next = { ...prev, dismissed: true };
      persist(next);
      return next;
    });
  }, [persist]);

  const skipOnboarding = useCallback(() => {
    setState(prev => {
      const next = { ...prev, dismissed: true };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetOnboardingForDebug = useCallback(() => {
    const fresh = { ...INITIAL_STATE, updatedAt: Date.now() };
    persist(fresh);
  }, [persist]);

  useEffect(() => {
    const synced = loadState();
    setState(prev => {
      if (prev.updatedAt === synced.updatedAt) return prev;
      return synced;
    });
  }, []);

  const isActive = !state.completed && !state.dismissed;

  const currentStep: OnboardingStep = !state.hasCreatedSchedule
    ? 1
    : !state.hasCreatedDiary
      ? 2
      : 3;

  const remainingSteps =
    (state.hasCreatedSchedule ? 0 : 1) +
    (state.hasCreatedDiary ? 0 : 1) +
    (state.hasViewedAnalysis ? 0 : 1);

  const nextRoute = !state.hasCreatedSchedule
    ? '/schedule'
    : !state.hasCreatedDiary
      ? '/thoughts'
      : '/analysis';

  const nextActionLabel = !state.hasCreatedSchedule
    ? '添加第一条日程'
    : !state.hasCreatedDiary
      ? '写一篇日记'
      : '查看分析';

  return (
    <OnboardingContext.Provider
      value={{
        state,
        isActive,
        currentStep,
        remainingSteps,
        nextRoute,
        nextActionLabel,
        markScheduleCreated,
        markDiaryCreated,
        markAnalysisViewed,
        dismissOnboarding,
        skipOnboarding,
        resetOnboardingForDebug,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
