import { useState, useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface DraftEnvelope<T> {
  value: T;
  updatedAt: number;
}

function readEnvelope<T>(key: string): DraftEnvelope<T> | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed: DraftEnvelope<T> = JSON.parse(raw);
    if (Date.now() - parsed.updatedAt > SEVEN_DAYS_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export interface UseDraftReturn<T> {
  /** The stored draft value, or null if none / expired */
  draft: T | null;
  /** Whether a valid (non-expired) draft exists in storage */
  hasDraft: boolean;
  /** Persist a value to localStorage with the current timestamp */
  save: (value: T) => void;
  /** Remove the stored draft from localStorage */
  clear: () => void;
  /**
   * Compare current form value against the last persisted draft.
   * When no draft has been saved yet, falls back to the dirty signal
   * so the pre-autosave gap is protected.
   */
  hasUnsavedChanges: (current: T) => boolean;
  /** Update the timestamp on the stored draft without changing its value */
  markSaved: () => void;
  /**
   * Call this at the top of your render to wire up the beforeunload guard.
   * The guard compares the ref'd value against the stored envelope.
   */
  setCurrent: (value: T) => void;
  /**
   * Tell the hook whether the consumer considers the current form "dirty"
   * (has user input worth protecting). Used by beforeunload / hasUnsavedChanges
   * during the window before the first autosave fires.
   */
  setDirty: (dirty: boolean) => void;
}

export function useDraft<T>(key: string): UseDraftReturn<T> {
  const [envelope, setEnvelope] = useState<DraftEnvelope<T> | null>(
    () => readEnvelope<T>(key),
  );
  const currentRef = useRef<T | null>(null);
  const dirtyRef = useRef(false);

  // Re-read from storage if the key changes (should not happen in practice)
  useEffect(() => {
    setEnvelope(readEnvelope<T>(key));
    dirtyRef.current = false;
  }, [key]);

  const save = useCallback(
    (value: T) => {
      const env: DraftEnvelope<T> = { value, updatedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(env));
      setEnvelope(env);
    },
    [key],
  );

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setEnvelope(null);
    dirtyRef.current = false;
  }, [key]);

  const hasUnsavedChanges = useCallback(
    (current: T): boolean => {
      if (!envelope) return dirtyRef.current;
      return JSON.stringify(current) !== JSON.stringify(envelope.value);
    },
    [envelope],
  );

  const markSaved = useCallback(() => {
    if (envelope) {
      const updated: DraftEnvelope<T> = {
        ...envelope,
        updatedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(updated));
      setEnvelope(updated);
    }
  }, [envelope, key]);

  const setCurrent = useCallback((value: T) => {
    currentRef.current = value;
  }, []);

  const setDirty = useCallback((d: boolean) => {
    dirtyRef.current = d;
  }, []);

  // ── beforeunload guard (browser departures) ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!currentRef.current) return;
      const stored = readEnvelope<T>(key);
      if (!stored) {
        // No draft saved yet — warn if the form has been touched
        if (dirtyRef.current) e.preventDefault();
        return;
      }
      if (JSON.stringify(currentRef.current) !== JSON.stringify(stored.value)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [key]);

  // ── In-app navigation guard (sidebar / route transitions) ──
  const blocker = useBlocker(() => {
    if (!currentRef.current) return false;
    const stored = readEnvelope<T>(key);
    if (!stored) return dirtyRef.current;
    return JSON.stringify(currentRef.current) !== JSON.stringify(stored.value);
  });

  // When the blocker fires, confirm with the user
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const ok = window.confirm('你有未保存的更改，确定要离开吗？');
      if (ok) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker]);

  return {
    draft: envelope?.value ?? null,
    hasDraft: envelope !== null,
    save,
    clear,
    hasUnsavedChanges,
    markSaved,
    setCurrent,
    setDirty,
  };
}
