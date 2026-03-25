"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { backgroundJobsService } from "@/lib/api/background-jobs";
import type { BackgroundJob } from "@/lib/api/types/background-jobs";

interface UseJobPollingOptions {
  enabled?: boolean;
  pollInterval?: number; // ms, default 2500
  siteId?: string;
}

export function useJobPolling({
  enabled = true,
  pollInterval = 2500,
  siteId,
}: UseJobPollingOptions = {}) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const result = await backgroundJobsService.listJobs(
        siteId ? { siteId } : undefined
      );
      // Handle both {jobs: [...]} and [...] response formats
      const jobList = Array.isArray(result)
        ? result
        : (result as Record<string, unknown>).jobs || [];
      setJobs(jobList as BackgroundJob[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  const refetch = useCallback(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;
    fetchJobs();
  }, [enabled, fetchJobs]);

  // Polling based on whether there are active jobs
  useEffect(() => {
    if (!enabled || loading) return;

    const hasRunning = jobs.some(
      (j) => j.status === "queued" || j.status === "running"
    );

    if (hasRunning) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(fetchJobs, pollInterval);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobs, enabled, loading, pollInterval, fetchJobs]);

  const runningCount = jobs.filter(
    (j) => j.status === "queued" || j.status === "running"
  ).length;

  return { jobs, loading, error, refetch, runningCount };
}
