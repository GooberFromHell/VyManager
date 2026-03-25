"use client";

import React, { createContext, useContext } from "react";
import { useDashboardSSE, DashboardSSEState } from "@/hooks/useDashboardSSE";
import { usePrometheusData, PrometheusDataState } from "@/hooks/usePrometheusData";

// ============================================================================
// Types
// ============================================================================

export interface DashboardDataContextValue extends DashboardSSEState {
  prometheus: PrometheusDataState;
}

// ============================================================================
// Context
// ============================================================================

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const sseState = useDashboardSSE();
  const prometheusState = usePrometheusData();

  const value: DashboardDataContextValue = {
    ...sseState,
    prometheus: prometheusState,
  };

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}

// ============================================================================
// Consumer hook
// ============================================================================

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (ctx === null) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return ctx;
}
