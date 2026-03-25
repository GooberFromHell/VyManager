"use client";

import { useState, useEffect, useMemo } from "react";
import { Table2 } from "lucide-react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { WidgetShell } from "../WidgetShell";
import { WidgetProps, WidgetConfigPanelProps } from "../widget-registry";
import { FormField } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Types
// ============================================================================

interface MetricRow {
  name: string;
  labels: Record<string, string>;
  value: number;
}

type SortKey = "name" | "value";
type SortDir = "asc" | "desc";

// ============================================================================
// Helpers
// ============================================================================

function formatLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels).filter(
    ([k]) => k !== "__name__"
  );
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${k}=${v}`).join(", ");
}

function getValueColor(
  value: number,
  thresholds: { warning: number; critical: number }
): string {
  if (value >= thresholds.critical) return "text-red-500";
  if (value >= thresholds.warning) return "text-yellow-500";
  return "text-foreground";
}

function formatValue(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(2);
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// ============================================================================
// Sort header component
// ============================================================================

function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey;
  currentSortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentSortKey === sortKey;
  return (
    <th
      className={`py-1.5 px-3 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (
          <span className="text-foreground">
            {currentSortDir === "asc" ? "\u2191" : "\u2193"}
          </span>
        )}
      </span>
    </th>
  );
}

// ============================================================================
// Widget Component
// ============================================================================

export function PrometheusMetricTable({
  id,
  config,
  span,
  height,
  editMode,
  onConfigChange,
}: WidgetProps) {
  const { prometheus } = useDashboardData();

  const families = (config.families as string[]) ?? [];
  const thresholds = (config.thresholds as { warning: number; critical: number }) ?? {
    warning: 70,
    critical: 90,
  };
  const refreshInterval =
    typeof config.refreshInterval === "number" ? config.refreshInterval : 10000;

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Subscribe to configured metric families
  useEffect(() => {
    if (prometheus.status !== "available" || families.length === 0) return;
    const unsubscribe = prometheus.subscribe(families, refreshInterval);
    return unsubscribe;
  }, [prometheus.status, prometheus.subscribe, families.join(","), refreshInterval]);

  // Extract latest metric rows from prometheus data
  const rows = useMemo<MetricRow[]>(() => {
    const result: MetricRow[] = [];

    for (const family of families) {
      const series = prometheus.data.get(family);
      if (!series || series.points.length === 0) continue;

      const lastPoint = series.points[series.points.length - 1];
      if (!lastPoint.metrics || lastPoint.metrics.length === 0) continue;

      for (const metric of lastPoint.metrics) {
        result.push({
          name: metric.name || family,
          labels: metric.labels ?? {},
          value: metric.value,
        });
      }
    }

    return result;
  }, [prometheus.data, families.join(",")]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortDir === "asc" ? cmp : -cmp;
      }
      // value
      return sortDir === "asc" ? a.value - b.value : b.value - a.value;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const isUnavailable =
    prometheus.status === "unavailable" || prometheus.status === "error";
  const isChecking = prometheus.status === "checking";

  return (
    <WidgetShell
      title="Metric Table"
      icon={Table2}
      editMode={editMode}
      span={span}
      height={height}
      loading={isChecking}
    >
      {isUnavailable ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Table2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Prometheus not available
          </p>
          <p className="text-xs text-muted-foreground/60">
            Prometheus metrics are not available on this device
          </p>
        </div>
      ) : families.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Table2 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Configure metrics to display
          </p>
          <p className="text-xs text-muted-foreground/60">
            Open widget settings to select metric families
          </p>
        </div>
      ) : sortedRows.length === 0 && !isChecking ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm text-muted-foreground">Waiting for data...</p>
        </div>
      ) : (
        <div className="overflow-y-auto -mx-4 -mb-2" style={{ maxHeight: 320 }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <SortableHeader
                  label="Metric"
                  sortKey="name"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  className="text-left"
                />
                <th className="py-1.5 px-3 text-xs font-medium text-muted-foreground text-left">
                  Labels
                </th>
                <SortableHeader
                  label="Value"
                  sortKey="value"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  className="text-right"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, idx) => {
                const labelStr = formatLabels(row.labels);
                return (
                  <tr
                    key={`${row.name}-${labelStr}-${idx}`}
                    className={`border-b border-border/50 hover:bg-muted/40 transition-colors ${
                      idx % 2 === 1 ? "bg-muted/30" : "bg-transparent"
                    }`}
                  >
                    <td className="py-1.5 px-3 text-sm font-mono truncate max-w-[200px]" title={row.name}>
                      {row.name}
                    </td>
                    <td
                      className="py-1.5 px-3 text-xs text-muted-foreground truncate max-w-[200px]"
                      title={labelStr || undefined}
                    >
                      {labelStr || "\u2014"}
                    </td>
                    <td
                      className={`py-1.5 px-3 text-sm font-mono text-right tabular-nums ${getValueColor(
                        row.value,
                        thresholds
                      )}`}
                    >
                      {formatValue(row.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </WidgetShell>
  );
}

// ============================================================================
// Config Panel
// ============================================================================

const REFRESH_OPTIONS = [
  { value: "5000", label: "5 seconds" },
  { value: "10000", label: "10 seconds" },
  { value: "15000", label: "15 seconds" },
  { value: "30000", label: "30 seconds" },
  { value: "60000", label: "1 minute" },
] as const;

export function PrometheusMetricTableConfig({
  config,
  onChange,
}: WidgetConfigPanelProps) {
  const { prometheus } = useDashboardData();

  const families = (config.families as string[]) ?? [];
  const thresholds = (config.thresholds as { warning: number; critical: number }) ?? {
    warning: 70,
    critical: 90,
  };
  const refreshInterval = String(
    typeof config.refreshInterval === "number" ? config.refreshInterval : 10000
  );

  const availableFamilies = prometheus.availableFamilies ?? [];

  const toggleFamily = (family: string) => {
    const next = families.includes(family)
      ? families.filter((f) => f !== family)
      : [...families, family];
    onChange({ ...config, families: next });
  };

  return (
    <div className="space-y-4">
      {/* Metric families multi-select */}
      <FormField
        label="Metric Families"
        description="Select which metric families to display"
      >
        {availableFamilies.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {prometheus.status === "available"
              ? "No metric families discovered yet"
              : "Prometheus is not available"}
          </p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background">
            {availableFamilies.map((family) => {
              const selected = families.includes(family);
              return (
                <label
                  key={family}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted/40 transition-colors ${
                    selected ? "bg-muted/30" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleFamily(family)}
                    className="rounded border-border"
                  />
                  <span className="font-mono text-xs truncate">{family}</span>
                </label>
              );
            })}
          </div>
        )}
      </FormField>

      {/* Thresholds */}
      <FormField
        label="Warning Threshold"
        htmlFor="metric-table-warning"
        description="Values at or above this are shown in yellow"
      >
        <Input
          id="metric-table-warning"
          type="number"
          value={thresholds.warning}
          onChange={(e) =>
            onChange({
              ...config,
              thresholds: {
                ...thresholds,
                warning: Number(e.target.value) || 0,
              },
            })
          }
          className="w-full"
        />
      </FormField>

      <FormField
        label="Critical Threshold"
        htmlFor="metric-table-critical"
        description="Values at or above this are shown in red"
      >
        <Input
          id="metric-table-critical"
          type="number"
          value={thresholds.critical}
          onChange={(e) =>
            onChange({
              ...config,
              thresholds: {
                ...thresholds,
                critical: Number(e.target.value) || 0,
              },
            })
          }
          className="w-full"
        />
      </FormField>

      {/* Refresh interval */}
      <FormField
        label="Refresh Interval"
        htmlFor="metric-table-refresh"
        description="How often to poll for new metric values"
      >
        <Select
          value={refreshInterval}
          onValueChange={(v) =>
            onChange({ ...config, refreshInterval: Number(v) })
          }
        >
          <SelectTrigger id="metric-table-refresh" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
