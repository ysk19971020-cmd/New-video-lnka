'use client';

import { useSyncExternalStore, useCallback } from 'react';

/**
 * Custom hook to read from localStorage using useSyncExternalStore.
 * This avoids hydration mismatches and the "setState in effect" lint issue.
 * Returns [value, setValue] where setValue also updates localStorage.
 */
export function useLocalStorage(key: string, initialValue: string = ''): [string, (value: string) => void] {
  const subscribe = useCallback((callback: () => void) => {
    // Listen for storage events (from other tabs) and custom events (from same tab)
    window.addEventListener('storage', callback);
    window.addEventListener(`ls-${key}`, callback);
    return () => {
      window.removeEventListener('storage', callback);
      window.removeEventListener(`ls-${key}`, callback);
    };
  }, [key]);

  const getSnapshot = useCallback(() => {
    return localStorage.getItem(key) || initialValue;
  }, [key, initialValue]);

  const getServerSnapshot = useCallback(() => {
    return initialValue;
  }, [initialValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback((newValue: string) => {
    if (newValue) {
      localStorage.setItem(key, newValue);
    } else {
      localStorage.removeItem(key);
    }
    // Dispatch custom event so same-tab updates trigger re-render
    window.dispatchEvent(new Event(`ls-${key}`));
  }, [key]);

  return [value, setValue];
}
