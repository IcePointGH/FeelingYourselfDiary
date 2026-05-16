import { useState, useEffect, useCallback, useRef } from 'react';

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
  /** Compare current form value against the last persisted draft */
  hasUnsavedChanges: (current: T) => boolean;
  /** Update the timestamp on the stored draft without changing its value */
  markSaved: () => void;
  /**
   * Call this at the top of your render to wire up the beforeunload guard.
   * The guard compares the ref'd value against the stored envelope.
   */
  setCurrent: (value: T) => void;
}

export function useDraft<T>(key: string): UseDraftReturn<T> {
  const [envelope, setEnvelope] = useState<DraftEnvelope<T> | null>(
    () => readEnvelope<T>(key),
  );
  const currentRef = useRef<T | null>(null);

  // Re-read from storage if the key changes (should not happen in practice)
  useEffect(() => {
    setEnvelope(readEnvelope<T>(key));
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
  }, [key]);

  const hasUnsavedChanges = useCallback(
    (current: T): boolean => {
      if (!envelope) return false;
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

  // ── beforeunload guard ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!currentRef.current) return;
      const stored = readEnvelope<T>(key);
      if (!stored) return;
      if (JSON.stringify(currentRef.current) !== JSON.stringify(stored.value)) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [key]);

  return {
    draft: envelope?.value ?? null,
    hasDraft: envelope !== null,
    save,
    clear,
    hasUnsavedChanges,
    markSaved,
    setCurrent,
  };
}
