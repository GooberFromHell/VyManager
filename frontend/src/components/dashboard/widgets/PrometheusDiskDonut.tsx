"use client";

import { useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { HardDrive } from "lucide-react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { WidgetShell } from "../WidgetShell";
import { WidgetProps } from "../widget-registry";

// ============================================================================
// Constants
// ============================================================================

const SUBSCRIBED_FAMILIES = ["disk_used_percent", "disk_used", "disk_total"];

const INNER_RADIUS = "55%";
const OUTER_RADIUS = "80%";

const FREE_COLOR = "#1a1a2e";

// ============================================================================
// Types
// ============================================================================

interface DiskPartitionData {
  mount: string;
  usedPercent: number;
  used: number | null; // bytes
  total: number | null; // bytes
  fill: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getColor(pct: number): string {
  if (pct < 60) return "#22c55e";
  if (pct < 80) return "#eab308";
  return "#ef4444";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * Extract the latest metrics for a given family, returning all metric entries
 * (one per partition / label set).
 */
function latestMetrics(
  data: Map<
    string,
    { points: Array<{ metrics: Array<{ value: number; labels: Record<string, string> }> }> }
  >,
  family: string
): Array<{ value: number; labels: Record<string, string> }> {
  const series = data.get(family);
  if (!series || series.points.length === 0) return [];
  const lastPoint = series.points[series.points.length - 1];
  return lastPoint.metrics ?? [];
}

/**
 * Build a lookup from mount/device label to metric value.
 */
function buildLabelMap(
  metrics: Array<{ value: number; labels: Record<string, string> }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of metrics) {
    // Prefer "path" or "mount" label, fall back to "device"
    const key = m.labels.path ?? m.labels.mount ?? m.labels.device ?? "unknown";
    map.set(key, m.value);
  }
  return map;
}

// ============================================================================
// Component
// ============================================================================

export default function PrometheusDiskDonut({
  id,
  config,
  span,
  height,
  editMode,
  onConfigChange,
}: WidgetProps) {
  const { prometheus } = useDashboardData();

  // Subscribe to disk metric families
  useEffect(() => {
    if (prometheus.status !== "available") return;
    const interval =
      typeof config.refreshInterval === "number"
        ? config.refreshInterval
        : 30000;
    const unsubscribe = prometheus.subscribe(SUBSCRIBED_FAMILIES, interval);
    return unsubscribe;
  }, [prometheus.status, prometheus.subscribe, config.refreshInterval]);

  // Derive partition data from latest metrics
  const partitions = useMemo((): DiskPartitionData[] => {
    const pctMetrics = latestMetrics(prometheus.data, "disk_used_percent");
    const usedMetrics = latestMetrics(prometheus.data, "disk_used");
    const totalMetrics = latestMetrics(prometheus.data, "disk_total");

    // If we have disk_used_percent directly, use it
    if (pctMetrics.length > 0) {
      const usedMap = buildLabelMap(usedMetrics);
      const totalMap = buildLabelMap(totalMetrics);

      return pctMetrics.map((m) => {
        const mount =
          m.labels.path ?? m.labels.mount ?? m.labels.device ?? "unknown";
        const pct = Math.max(0, Math.min(100, m.value));
        return {
          mount,
          usedPercent: pct,
          used: usedMap.get(mount) ?? null,
          total: totalMap.get(mount) ?? null,
          fill: getColor(pct),
        };
      });
    }

    // Fall back: compute percent from disk_used / disk_total
    if (usedMetrics.length > 0 && totalMetrics.length > 0) {
      const totalMap = buildLabelMap(totalMetrics);

      return usedMetrics
        .map((m) => {
          const mount =
            m.labels.path ?? m.labels.mount ?? m.labels.device ?? "unknown";
          const total = totalMap.get(mount);
          if (!total || total === 0) return null;
          const pct = Math.max(0, Math.min(100, (m.value / total) * 100));
          return {
            mount,
            usedPercent: pct,
            used: m.value,
            total,
            fill: getColor(pct),
          };
        })
        .filter(Boolean) as DiskPartitionData[];
    }

    return [];
  }, [prometheus.data]);

  // Aggregate average for center label
  const avgPercent = useMemo(() => {
    if (partitions.length === 0) return null;
    const sum = partitions.reduce((a, p) => a + p.usedPercent, 0);
    return sum / partitions.length;
  }, [partitions]);

  const isUnavailable =
    prometheus.status === "unavailable" || prometheus.status === "error";
  const isChecking = prometheus.status === "checking";

  // Build chart data — single partition shows used vs free, multiple shows one segment each
  const chartData = useMemo(() => {
    if (partitions.length === 0) return [];

    if (partitions.length === 1) {
      const p = partitions[0];
      return [
        { name: p.mount, value: p.usedPercent, fill: p.fill },
        { name: "Free", value: 100 - p.usedPercent, fill: FREE_COLOR },
      ];
    }

    return partitions.map((p) => ({
      name: p.mount,
      value: p.usedPercent,
      fill: p.fill,
    }));
  }, [partitions]);

  return (
    <WidgetShell
      title="Disk Usage"
      icon={HardDrive}
      editMode={editMode}
      span={span}
      height={height}
      loading={isChecking}
    >
      {isUnavailable ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <HardDrive className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Enable Prometheus</p>
          <p className="text-xs text-muted-foreground/60">
            Prometheus metrics are not available on this device
          </p>
        </div>
      ) : partitions.length === 0 && !isChecking ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <HardDrive className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No disk metrics available
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* Donut chart */}
          <div className="relative w-full" style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={INNER_RADIUS}
                  outerRadius={OUTER_RADIUS}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={partitions.length > 1 ? 2 : 0}
                >
                  {chartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            {avgPercent !== null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span
                  className="font-mono text-2xl font-semibold leading-none"
                  style={{ color: getColor(avgPercent) }}
                >
                  {Math.round(avgPercent)}%
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {partitions.length === 1 ? "used" : "avg used"}
                </span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2">
            {partitions.map((p) => (
              <div
                key={p.mount}
                className="flex items-center gap-1.5 text-[11px]"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.fill }}
                />
                <span className="font-mono text-foreground truncate max-w-[80px]" title={p.mount}>
                  {p.mount}
                </span>
                {p.used !== null && p.total !== null && (
                  <span className="text-muted-foreground">
                    {formatBytes(p.used)}/{formatBytes(p.total)}
                  </span>
                )}
                {(p.used === null || p.total === null) && (
                  <span className="text-muted-foreground">
                    {Math.round(p.usedPercent)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
