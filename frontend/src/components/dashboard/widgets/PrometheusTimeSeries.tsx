"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, BarChart3 } from "lucide-react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import type { WidgetProps, WidgetConfigPanelProps } from "../widget-registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/fieldset";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Constants
// ============================================================================

const COLOR_PALETTE = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
] as const;

const TIME_WINDOW_OPTIONS = [
  { value: 60_000, label: "1 minute" },
  { value: 300_000, label: "5 minutes" },
  { value: 900_000, label: "15 minutes" },
  { value: 1_800_000, label: "30 minutes" },
] as const;

const UNIT_OPTIONS = [
  { value: "raw", label: "Raw" },
  { value: "bytes", label: "Bytes" },
  { value: "percent", label: "Percent" },
  { value: "bps", label: "Bits/sec" },
] as const;

const REFRESH_OPTIONS = [
  { value: 5000, label: "5 seconds" },
  { value: 10_000, label: "10 seconds" },
  { value: 30_000, label: "30 seconds" },
] as const;

// ============================================================================
// Types
// ============================================================================

interface TimeSeriesConfig {
  families: string[];
  timeWindow: number;
  unit: string;
  refreshInterval: number;
}

// ============================================================================
// Helpers
// ============================================================================

function parseConfig(config: Record<string, unknown>): TimeSeriesConfig {
  return {
    families: Array.isArray(config.families) ? (config.families as string[]) : [],
    timeWindow: typeof config.timeWindow === "number" ? config.timeWindow : 300_000,
    unit: typeof config.unit === "string" ? config.unit : "raw",
    refreshInterval: typeof config.refreshInterval === "number" ? config.refreshInterval : 5000,
  };
}

function formatTimeLabel(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatValue(value: number, unit: string): string {
  switch (unit) {
    case "bytes": {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MB`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)} KB`;
      return `${Math.round(value)} B`;
    }
    case "percent":
      return `${value.toFixed(1)}%`;
    case "bps": {
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)} Gbps`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)} Mbps`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)} Kbps`;
      return `${Math.round(value)} bps`;
    }
    default:
      if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
      return value % 1 === 0 ? String(value) : value.toFixed(2);
  }
}

function formatYTick(value: number, unit: string): string {
  if (value === 0) return "0";
  return formatValue(value, unit);
}

/**
 * Build a stable, human-readable series key from a metric.
 * Includes the metric name and any distinguishing labels.
 */
function seriesKey(metricName: string, labels: Record<string, string>): string {
  const labelParts = Object.entries(labels)
    .filter(([k]) => k !== "__name__")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);

  return labelParts.length > 0
    ? `${metricName}{${labelParts.join(",")}}`
    : metricName;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface TimeSeriesCustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
  unit: string;
}

function TimeSeriesCustomTooltip({
  active,
  payload,
  label,
  unit,
}: TimeSeriesCustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1 max-w-xs">
      <p className="text-muted-foreground font-medium mb-1 font-mono">
        {typeof label === "number" ? formatTimeLabel(label) : ""}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground truncate max-w-[160px]" title={p.name}>
            {p.name}:
          </span>
          <span
            className="font-semibold tabular-nums whitespace-nowrap"
            style={{ color: p.color }}
          >
            {formatValue(p.value, unit)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PrometheusTimeSeries({ config: rawConfig }: WidgetProps) {
  const cfg = parseConfig(rawConfig);
  const { prometheus } = useDashboardData();

  // Subscribe to configured families
  useEffect(() => {
    if (cfg.families.length === 0 || prometheus.status !== "available") return;
    const unsub = prometheus.subscribe(cfg.families, cfg.refreshInterval);
    return unsub;
  }, [
    // Serialize families to avoid reference equality issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(cfg.families),
    cfg.refreshInterval,
    prometheus.status,
    prometheus.subscribe,
  ]);

  // Build chart data from the prometheus data map
  const { chartData, seriesNames } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - cfg.timeWindow;

    // Collect all unique series keys across all subscribed families
    const allSeriesKeys = new Set<string>();
    // Map: timestamp -> { [seriesKey]: value }
    const timeMap = new Map<number, Record<string, number>>();

    for (const family of cfg.families) {
      const ts = prometheus.data.get(family);
      if (!ts) continue;

      for (const point of ts.points) {
        if (point.timestamp < cutoff) continue;

        // Round timestamp to nearest second for alignment
        const roundedTs = Math.round(point.timestamp / 1000) * 1000;

        if (!timeMap.has(roundedTs)) {
          timeMap.set(roundedTs, {});
        }
        const row = timeMap.get(roundedTs)!;

        for (const metric of point.metrics) {
          const key = seriesKey(metric.name, metric.labels);
          allSeriesKeys.add(key);
          row[key] = metric.value;
        }
      }
    }

    // Sort by timestamp, limit to 8 series
    const sortedNames = Array.from(allSeriesKeys).slice(0, 8);
    const sortedData = Array.from(timeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, values]) => ({ ts, ...values }));

    return { chartData: sortedData, seriesNames: sortedNames };
  }, [prometheus.data, cfg.families, cfg.timeWindow]);

  // Compute Y-axis domain
  const yMax = useMemo(() => {
    if (chartData.length === 0) return 100;
    let max = 0;
    for (const row of chartData) {
      for (const key of seriesNames) {
        const val = (row as Record<string, number>)[key];
        if (typeof val === "number" && val > max) max = val;
      }
    }
    return max > 0 ? max * 1.1 : 100;
  }, [chartData, seriesNames]);

  // X-axis domain from data
  const xDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) {
      const now = Date.now();
      return [now - cfg.timeWindow, now];
    }
    return [chartData[0].ts, chartData[chartData.length - 1].ts];
  }, [chartData, cfg.timeWindow]);

  // ============================================================================
  // Empty / unavailable states
  // ============================================================================

  if (prometheus.status === "unavailable" || prometheus.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Prometheus not available</p>
        <p className="text-xs text-muted-foreground">
          Enable Prometheus on this VyOS instance to use time-series widgets
        </p>
      </div>
    );
  }

  if (cfg.families.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
        <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Configure metrics to display</p>
        <p className="text-xs text-muted-foreground">
          Open widget settings to select metric families
        </p>
      </div>
    );
  }

  if (prometheus.status === "checking") {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Checking Prometheus...
      </div>
    );
  }

  // ============================================================================
  // Chart
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 pb-2 shrink-0">
        {seriesNames.map((name, i) => (
          <div key={name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-4 rounded-sm opacity-80"
              style={{ backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length] }}
            />
            <span className="truncate max-w-[140px]" title={name}>
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 [&_.recharts-text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 8, bottom: 0 }}
          >
            <defs>
              {seriesNames.map((name, i) => (
                <linearGradient
                  key={name}
                  id={`ts-gradient-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#333" />

            <XAxis
              dataKey="ts"
              type="number"
              domain={xDomain}
              tickFormatter={formatTimeLabel}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />

            <YAxis
              domain={[0, yMax]}
              tickFormatter={(v: number) => formatYTick(v, cfg.unit)}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />

            <Tooltip
              content={
                <TimeSeriesCustomTooltip unit={cfg.unit} />
              }
              cursor={{
                stroke: "#94a3b8",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            {seriesNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name}
                stroke={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// Config Panel
// ============================================================================

export function PrometheusTimeSeriesConfig({
  config,
  onChange,
}: WidgetConfigPanelProps) {
  const { prometheus } = useDashboardData();
  const cfg = parseConfig(config);

  const availableFamilies = prometheus.availableFamilies;
  const [search, setSearch] = useState("");

  const filteredFamilies = useMemo(() => {
    if (!search) return availableFamilies;
    const lower = search.toLowerCase();
    return availableFamilies.filter((f) => f.toLowerCase().includes(lower));
  }, [availableFamilies, search]);

  function toggleFamily(family: string) {
    const next = cfg.families.includes(family)
      ? cfg.families.filter((f) => f !== family)
      : cfg.families.length < 8
        ? [...cfg.families, family]
        : cfg.families; // Max 8
    onChange({ ...config, families: next });
  }

  return (
    <div className="space-y-4">
      {/* Metric Families */}
      <FormField
        label="Metric Families"
        description={
          cfg.families.length >= 8
            ? "Maximum of 8 families reached"
            : `${cfg.families.length} selected — up to 8 allowed`
        }
      >
        {/* Selected families */}
        {cfg.families.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {cfg.families.map((f) => (
              <Badge
                key={f}
                variant="secondary"
                className="text-xs font-mono cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                onClick={() => toggleFamily(f)}
                title={`Remove ${f}`}
              >
                {f}
                <span className="ml-1 opacity-60">&times;</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Search + available list */}
        {prometheus.status === "available" && availableFamilies.length > 0 ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search families..."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="max-h-[160px] overflow-y-auto rounded-md border border-input bg-background">
              {filteredFamilies.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  No matching families
                </p>
              ) : (
                filteredFamilies.map((f) => {
                  const selected = cfg.families.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFamily(f)}
                      disabled={!selected && cfg.families.length >= 8}
                      className={
                        "w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-accent transition-colors " +
                        "disabled:opacity-40 disabled:cursor-not-allowed " +
                        (selected
                          ? "bg-primary/10 text-primary"
                          : "text-foreground")
                      }
                    >
                      <span className="flex items-center justify-between">
                        <span className="truncate">{f}</span>
                        {selected && (
                          <span className="text-primary shrink-0 ml-2">&#10003;</span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : prometheus.status === "checking" ? (
          <p className="text-xs text-muted-foreground">Loading families...</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No families available. Prometheus may not be enabled.
          </p>
        )}
      </FormField>

      {/* Time Window */}
      <FormField label="Time Window" htmlFor="ts-time-window">
        <Select
          value={String(cfg.timeWindow)}
          onValueChange={(v) =>
            onChange({ ...config, timeWindow: Number(v) })
          }
        >
          <SelectTrigger id="ts-time-window" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_WINDOW_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Unit */}
      <FormField label="Unit" htmlFor="ts-unit">
        <Select
          value={cfg.unit}
          onValueChange={(v) => onChange({ ...config, unit: v })}
        >
          <SelectTrigger id="ts-unit" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Refresh Interval */}
      <FormField label="Refresh Interval" htmlFor="ts-refresh">
        <Select
          value={String(cfg.refreshInterval)}
          onValueChange={(v) =>
            onChange({ ...config, refreshInterval: Number(v) })
          }
        >
          <SelectTrigger id="ts-refresh" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REFRESH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
