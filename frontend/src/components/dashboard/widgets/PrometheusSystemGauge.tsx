"use client";

import { useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Gauge } from "lucide-react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { WidgetShell } from "../WidgetShell";
import { WidgetProps } from "../widget-registry";

// ============================================================================
// Constants
// ============================================================================

const SUBSCRIBED_FAMILIES = ["cpu_usage_idle", "mem_used_percent"];

const ARC_START_ANGLE = 200;
const ARC_END_ANGLE = -20;
const INNER_RADIUS = "70%";
const OUTER_RADIUS = "90%";

const BACKGROUND_COLOR = "#1a1a2e";

// ============================================================================
// Helpers
// ============================================================================

function getColor(pct: number): string {
  if (pct < 60) return "#22c55e";
  if (pct < 80) return "#eab308";
  return "#ef4444";
}

/**
 * Extract the latest scalar value for a metric family from the Prometheus
 * data map. Returns `null` when no data is available yet.
 */
function latestValue(
  data: Map<string, { points: Array<{ metrics: Array<{ value: number }> }> }>,
  family: string
): number | null {
  const series = data.get(family);
  if (!series || series.points.length === 0) return null;
  const lastPoint = series.points[series.points.length - 1];
  if (!lastPoint.metrics || lastPoint.metrics.length === 0) return null;
  return lastPoint.metrics[0].value;
}

// ============================================================================
// Gauge Sub-component
// ============================================================================

interface GaugeRingProps {
  value: number; // 0-100
  label: string;
}

function GaugeRing({ value, label }: GaugeRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = getColor(clamped);

  const chartData = [
    { name: "value", value: clamped },
    { name: "remainder", value: 100 - clamped },
  ];

  return (
    <div className="relative flex-1 min-w-0" style={{ minHeight: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            cx="50%"
            cy="50%"
            startAngle={ARC_START_ANGLE}
            endAngle={ARC_END_ANGLE}
            innerRadius={INNER_RADIUS}
            outerRadius={OUTER_RADIUS}
            stroke="none"
            cornerRadius={4}
          >
            <Cell fill={color} />
            <Cell fill={BACKGROUND_COLOR} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-mono text-xl font-semibold leading-none"
          style={{ color }}
        >
          {Math.round(clamped)}%
        </span>
        <span className="text-[11px] text-muted-foreground mt-1">
          {label}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Widget Component
// ============================================================================

export default function PrometheusSystemGauge({
  id,
  config,
  span,
  height,
  editMode,
  onConfigChange,
}: WidgetProps) {
  const { prometheus } = useDashboardData();

  // Subscribe to the required metric families
  useEffect(() => {
    if (prometheus.status !== "available") return;
    const interval =
      typeof config.refreshInterval === "number"
        ? config.refreshInterval
        : 5000;
    const unsubscribe = prometheus.subscribe(SUBSCRIBED_FAMILIES, interval);
    return unsubscribe;
  }, [prometheus.status, prometheus.subscribe, config.refreshInterval]);

  // Derive CPU and memory percentages from latest data
  const { cpuPct, memPct } = useMemo(() => {
    const idleRaw = latestValue(prometheus.data, "cpu_usage_idle");
    const memRaw = latestValue(prometheus.data, "mem_used_percent");

    return {
      cpuPct: idleRaw !== null ? 100 - idleRaw : null,
      memPct: memRaw !== null ? memRaw : null,
    };
  }, [prometheus.data]);

  const isUnavailable =
    prometheus.status === "unavailable" || prometheus.status === "error";
  const isChecking = prometheus.status === "checking";

  return (
    <WidgetShell
      title="CPU & Memory"
      icon={Gauge}
      editMode={editMode}
      span={span}
      height={height}
      loading={isChecking}
    >
      {isUnavailable ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Gauge className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Enable Prometheus</p>
          <p className="text-xs text-muted-foreground/60">
            Prometheus metrics are not available on this device
          </p>
        </div>
      ) : cpuPct === null && memPct === null && !isChecking ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm text-muted-foreground">Waiting for data...</p>
        </div>
      ) : (
        <div className="flex items-center gap-2" style={{ height: 160 }}>
          <GaugeRing value={cpuPct ?? 0} label="CPU" />
          <GaugeRing value={memPct ?? 0} label="Memory" />
        </div>
      )}
    </WidgetShell>
  );
}
