/**
 * Prometheus API Service
 *
 * Handles Prometheus metrics retrieval and status checking for VyOS instances.
 */

import { apiClient } from "./client";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PrometheusStatus {
  available: boolean;
  reason?: string;
  endpoint?: string;
}

export interface PrometheusMetric {
  name: string;
  labels: Record<string, string>;
  value: number;
}

export interface PrometheusMetricsResponse {
  metrics: Record<string, PrometheusMetric[]>;
  timestamp: number;
}

export interface PrometheusCapabilities {
  available_families: string[];
  prometheus_enabled: boolean;
}

// ============================================================================
// Prometheus Service
// ============================================================================

class PrometheusService {
  /**
   * Check whether Prometheus is available on the active VyOS instance.
   */
  async getStatus(): Promise<PrometheusStatus> {
    return apiClient.get<PrometheusStatus>("/vyos/prometheus/status");
  }

  /**
   * Fetch Prometheus metrics, optionally filtered to specific metric families.
   */
  async getMetrics(families?: string[]): Promise<PrometheusMetricsResponse> {
    const params = families?.length
      ? { families: families.join(",") }
      : undefined;
    return apiClient.get<PrometheusMetricsResponse>(
      "/vyos/prometheus/metrics",
      params
    );
  }

  /**
   * Get Prometheus capabilities for the active VyOS instance.
   */
  async getCapabilities(): Promise<PrometheusCapabilities> {
    return apiClient.get<PrometheusCapabilities>(
      "/vyos/prometheus/capabilities"
    );
  }
}

export const prometheusService = new PrometheusService();
