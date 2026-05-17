import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from './AuthContext';
import { SETTINGS_API } from '../services/api';

type OnboardingState = {
  hasCreatedSchedule: boolean;
  hasCreatedDiary: boolean;
  hasViewedAnalysis: boolean;
  dismissed: boolean;
  completed: boolean;
  completionAcknowledged: boolean;
  updatedAt: number;
};

const STORAGE_KEY_PREFIX = 'onboarding.phase5';

const INITIAL_STATE: OnboardingState = {
  hasCreatedSchedule: false,
  hasCreatedDiary: false,
  hasViewedAnalysis: false,
  dismissed: false,
  completed: false,
  completionAcknowledged: false,
  updatedAt: 0,
};

function getStorageKey(userId?: number | null) {
  return userId ? `${STORAGE_KEY_PREFIX}.${userId}` : `${STORAGE_KEY_PREFIX}.anonymous`;
}

function loadState(userId?: number | null): OnboardingState {
  try {
    const scopedKey = getStorageKey(userId);
    let raw = localStorage.getItem(scopedKey);
    if (!raw && userId) {
      // One-time migration from the earlier browser-global cache.
      const legacyRaw = localStorage.getItem(STORAGE_KEY_PREFIX);
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(scopedKey, legacyRaw);
        localStorage.removeItem(STORAGE_KEY_PREFIX);
      }
    }
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
      completionAcknowledged: !!parsed.completionAcknowledged,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState(state: OnboardingState, userId?: number | null) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    // storage full or blocked — degrade gracefully
  }
}

function deriveCompleted(s: OnboardingState): OnboardingState {
  const completed = s.hasCreatedSchedule && s.hasCreatedDiary && s.hasViewedAnalysis;
  if (completed && !s.completed) {
    return { ...s, completed: true };
  }
  return s;
}

function mergeStates(local: OnboardingState, remote: Partial<OnboardingState>): OnboardingState {
  const merged = deriveCompleted({
    hasCreatedSchedule: local.hasCreatedSchedule || !!remote.hasCreatedSchedule,
    hasCreatedDiary: local.hasCreatedDiary || !!remote.hasCreatedDiary,
    hasViewedAnalysis: local.hasViewedAnalysis || !!remote.hasViewedAnalysis,
    dismissed: local.dismissed || !!remote.dismissed,
    completed: local.completed || !!remote.completed,
    completionAcknowledged: local.completionAcknowledged || !!remote.completionAcknowledged,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt ?? 0),
  });

  // Completed onboarding must remain internally coherent even if an older client
  // only persisted the aggregate flag.
  if (merged.completed) {
    return {
      ...merged,
      hasCreatedSchedule: true,
      hasCreatedDiary: true,
      hasViewedAnalysis: true,
    };
  }
  return merged;
}

function toSettingsPayload(state: OnboardingState) {
  return {
    onboardingHasCreatedSchedule: state.hasCreatedSchedule,
    onboardingHasCreatedDiary: state.hasCreatedDiary,
    onboardingHasViewedAnalysis: state.hasViewedAnalysis,
    onboardingDismissed: state.dismissed,
    onboardingCompleted: state.completed,
    onboardingCompletionAcknowledged: state.completionAcknowledged,
  };
}

function fromSettingsResponse(data: Record<string, unknown>): Partial<OnboardingState> {
  return {
    hasCreatedSchedule: !!data.onboardingHasCreatedSchedule,
    hasCreatedDiary: !!data.onboardingHasCreatedDiary,
    hasViewedAnalysis: !!data.onboardingHasViewedAnalysis,
    dismissed: !!data.onboardingDismissed,
    completed: !!data.onboardingCompleted,
    completionAcknowledged: !!data.onboardingCompletionAcknowledged,
  };
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
  acknowledgeCompletion: () => void;
  dismissOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboardingForDebug: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { apiFetch } = useApi();
  const { isAuthenticated, user } = useAuth();
  const [state, setState] = useState<OnboardingState>(() => loadState(user?.id));

  const persistRemote = useCallback(async (next: OnboardingState) => {
    if (!isAuthenticated) return;
    try {
      await apiFetch(SETTINGS_API.base, {
        method: 'PUT',
        body: JSON.stringify(toSettingsPayload(next)),
      });
    } catch {
      // Keep local cache and retry on the next authenticated load / transition.
    }
  }, [apiFetch, isAuthenticated]);

  const apply = useCallback((updater: (prev: OnboardingState) => OnboardingState) => {
    setState(prev => {
      const next = updater(prev);
      if (next === prev) return prev;
      const withTimestamp = { ...next, updatedAt: Date.now() };
      saveState(withTimestamp, user?.id);
      void persistRemote(withTimestamp);
      return withTimestamp;
    });
  }, [persistRemote, user?.id]);

  const markScheduleCreated = useCallback(() => {
    apply(prev => {
      if (prev.hasCreatedSchedule) return prev;
      return deriveCompleted({ ...prev, hasCreatedSchedule: true });
    });
  }, [apply]);

  const markDiaryCreated = useCallback(() => {
    apply(prev => {
      if (prev.hasCreatedDiary) return prev;
      return deriveCompleted({ ...prev, hasCreatedDiary: true });
    });
  }, [apply]);

  const markAnalysisViewed = useCallback(() => {
    apply(prev => {
      if (prev.hasViewedAnalysis) return prev;
      return deriveCompleted({ ...prev, hasViewedAnalysis: true });
    });
  }, [apply]);

  const acknowledgeCompletion = useCallback(() => {
    apply(prev => {
      if (prev.completionAcknowledged) return prev;
      return { ...prev, completionAcknowledged: true };
    });
  }, [apply]);

  const dismissOnboarding = useCallback(() => {
    apply(prev => prev.dismissed ? prev : { ...prev, dismissed: true });
  }, [apply]);

  const skipOnboarding = useCallback(() => {
    apply(prev => prev.dismissed ? prev : { ...prev, dismissed: true });
  }, [apply]);

  const resetOnboardingForDebug = useCallback(() => {
    const fresh = { ...INITIAL_STATE, updatedAt: Date.now() };
    setState(fresh);
    saveState(fresh, user?.id);
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const syncRemote = async () => {
      try {
        const data = await apiFetch(SETTINGS_API.base) as Record<string, unknown>;
        if (cancelled) return;
        setState(() => {
          const localForCurrentUser = loadState(user?.id);
          const merged = mergeStates(localForCurrentUser, fromSettingsResponse(data));
          const changed = JSON.stringify(toSettingsPayload(merged)) !== JSON.stringify(toSettingsPayload(localForCurrentUser));
          const withTimestamp = changed ? { ...merged, updatedAt: Date.now() } : localForCurrentUser;
          if (changed) {
            saveState(withTimestamp, user?.id);
            void persistRemote(withTimestamp);
          }
          return withTimestamp;
        });
      } catch {
        // Local cache remains available as a graceful fallback.
      }
    };

    void syncRemote();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, isAuthenticated, persistRemote, user?.id]);

  useEffect(() => {
    setState(loadState(user?.id));
  }, [user?.id]);

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
        acknowledgeCompletion,
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
