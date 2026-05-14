import { useRef } from 'react';

/**
 * Generic tab-state cache.
 *
 * Stores state snapshots keyed by tab. On tab switch: save previous
 * tab's state, restore target tab's from cache (or use defaults).
 *
 * Usage pattern in a useEffect([tab]):
 * ```
 * const cache = useTabCache<MyState>();
 * useEffect(() => {
 *   cache.save(cache.prevKey, currentState);
 *   const restored = cache.get(tab) ?? getDefault(tab);
 *   cache.track(tab);
 *   applyRestored(restored);
 * }, [tab]);
 * ```
 */
export function useTabCache<T>() {
  const storeRef = useRef<Record<string, T>>({});
  const prevRef = useRef<string>('');

  return {
    /** Read cached state for a tab key */
    get: (key: string): T | undefined => storeRef.current[key],
    /** Persist state snapshot for a tab key */
    save: (key: string, value: T) => { storeRef.current[key] = value; },
    /** Clear cached state for a tab key */
    remove: (key: string) => { delete storeRef.current[key]; },
    /** Tab key that was active BEFORE the current render */
    get prevKey(): string { return prevRef.current; },
    /** Record current tab as the "previous" tab for the next switch */
    track: (key: string) => { prevRef.current = key; },
  };
}

