"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  prometheusService,
  PrometheusMetric,
} from "@/lib/api/prometheus";

// ============================================================================
// Types
// ============================================================================

export interface MetricTimeSeries {
  family: string;
  points: Array<{ timestamp: number; metrics: PrometheusMetric[] }>;
}

export type PrometheusConnectionStatus =
  | "unavailable"
  | "checking"
  | "available"
  | "error";

export interface PrometheusDataState {
  status: PrometheusConnectionStatus;
  data: Map<string, MetricTimeSeries>;
  subscribe: (families: string[], intervalMs?: number) => () => void;
  lastUpdated: number | null;
  availableFamilies: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MAX_BUFFER_SIZE = 360; // ~30 min at 5s intervals
const DEFAULT_POLL_INTERVAL = 5000;

// ============================================================================
// Internal types
// ============================================================================

interface Subscription {
  families: string[];
  interval: number;
}

// ============================================================================
// Hook
// ============================================================================

export function usePrometheusData(): PrometheusDataState {
  const [status, setStatus] = useState<PrometheusConnectionStatus>("checking");
  const [data, setData] = useState<Map<string, MetricTimeSeries>>(new Map());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);

  // Mutable refs to avoid re-render loops
  const subscriptionsRef = useRef<Map<number, Subscription>>(new Map());
  const nextIdRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef(status);
  const mountedRef = useRef(true);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ------------------------------------------------------------------
  // Initial status & capabilities check
  // ------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function checkAvailability() {
      try {
        const statusResult = await prometheusService.getStatus();
        if (cancelled) return;

        if (statusResult.available) {
          setStatus("available");

          // Fetch capabilities to populate available families
          try {
            const caps = await prometheusService.getCapabilities();
            if (!cancelled) {
              setAvailableFamilies(caps.available_families);
            }
          } catch {
            // Capabilities fetch failed — non-fatal, leave families empty
          }
        } else {
          setStatus("unavailable");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    checkAvailability();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  // ------------------------------------------------------------------
  // Polling logic — reacts to subscription changes via a trigger counter
  // ------------------------------------------------------------------
  const [pollTrigger, setPollTrigger] = useState(0);

  useEffect(() => {
    // Determine the union of all subscribed families and shortest interval
    const subs = Array.from(subscriptionsRef.current.values());
    if (subs.length === 0) {
      // No active subscriptions — clear any running interval
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const allFamilies = Array.from(
      new Set(subs.flatMap((s) => s.families))
    );
    const shortestInterval = Math.min(...subs.map((s) => s.interval));

    // Clear previous interval before starting a new one
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll when Prometheus is available
    if (statusRef.current !== "available") return;

    async function poll() {
      try {
        const response = await prometheusService.getMetrics(allFamilies);
        if (!mountedRef.current) return;

        const now = response.timestamp;

        setData((prev) => {
          const next = new Map(prev);

          for (const family of allFamilies) {
            const metrics = response.metrics[family] ?? [];
            const existing = next.get(family);
            const point = { timestamp: now, metrics };

            if (existing) {
              const points = [...existing.points, point];
              // Enforce rolling buffer limit
              if (points.length > MAX_BUFFER_SIZE) {
                points.splice(0, points.length - MAX_BUFFER_SIZE);
              }
              next.set(family, { family, points });
            } else {
              next.set(family, { family, points: [point] });
            }
          }

          return next;
        });

        setLastUpdated(now);
      } catch {
        // Don't crash — next poll will retry
        if (mountedRef.current) {
          setStatus("error");
        }
      }
    }

    // Fire an immediate poll, then start the interval
    poll();
    intervalRef.current = setInterval(poll, shortestInterval);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pollTrigger]);

  // ------------------------------------------------------------------
  // Subscribe / unsubscribe
  // ------------------------------------------------------------------
  const subscribe = useCallback(
    (families: string[], intervalMs: number = DEFAULT_POLL_INTERVAL): (() => void) => {
      const id = nextIdRef.current++;
      subscriptionsRef.current.set(id, { families, interval: intervalMs });

      // Trigger the polling effect to recalculate
      setPollTrigger((n) => n + 1);

      return () => {
        subscriptionsRef.current.delete(id);
        // Trigger the polling effect again so it can stop or reconfigure
        setPollTrigger((n) => n + 1);
      };
    },
    []
  );

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { status, data, subscribe, lastUpdated, availableFamilies };
}
