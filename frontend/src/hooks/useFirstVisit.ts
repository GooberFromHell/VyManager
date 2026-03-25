"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Track whether a user is visiting a specific feature/page for the first time.
 * Uses localStorage to persist dismissal across sessions.
 *
 * Defaults to false on initial render to prevent a flash during SSR hydration.
 * The effect runs after mount and sets the flag only when no persisted value exists.
 *
 * @param key - Unique identifier (e.g., "services-sidebar", "dashboard-welcome")
 * @returns { isFirstVisit, dismiss }
 *
 * @example
 * const { isFirstVisit, dismiss } = useFirstVisit("services-sidebar");
 *
 * if (isFirstVisit) {
 *   return <OnboardingBanner onDismiss={dismiss} />;
 * }
 */
export function useFirstVisit(key: string) {
  const storageKey = `vymanager-visited-${key}`;
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(storageKey);
    if (!visited) {
      setIsFirstVisit(true);
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsFirstVisit(false);
  }, [storageKey]);

  return { isFirstVisit, dismiss };
}
