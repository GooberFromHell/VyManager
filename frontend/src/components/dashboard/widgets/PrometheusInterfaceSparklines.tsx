"use client";

import { useEffect, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { WidgetShell } from "../WidgetShell";
import { WidgetProps } from "../widget-registry";
import { MetricTimeSeries } from "@/hooks/usePrometheusData";

// ============================================================================
// Constants
// ============================================================================

const SUBSCRIBED_FAMILIES = [
  "net_bytes_recv",
  "net_bytes_sent",
  "interface_rx_bytes",
  "interface_tx_bytes",
];

const RX_COLOR = "#3b82f6";
const TX_COLOR = "#22c55e";

/** Maximum sparkline data points to retain per interface */
const MAX_SPARKLINE_POINTS = 60;

// ============================================================================
// Types
// ============================================================================

interface InterfaceRate {
  rx: number; // bytes/sec
  tx: number; // bytes/sec
}

interface SparklinePoint {
  t: number;
  rx: number;
  tx: number;
}

interface InterfaceSparklineData {
  name: string;
  current: InterfaceRate;
  points: SparklinePoint[];
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytesPerSec(bps: number): string {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} GB/s`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} MB/s`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

/**
 * Extract metrics grouped by interface from a MetricTimeSeries.
 * Returns a map: interface name -> array of { timestamp, value }.
 */
function extractByInterface(
  series: MetricTimeSeries | undefined
): Map<string, Array<{ timestamp: number; value: number }>> {
  const result = new Map<string, Array<{ timestamp: number; value: number }>>();
  if (!series) return result;

  for (const point of series.points) {
    for (const metric of point.metrics) {
      const ifaceName =
        metric.labels.interface ??
        metric.labels.name ??
        metric.labels.device ??
        "unknown";
      if (!result.has(ifaceName)) {
        result.set(ifaceName, []);
      }
      result.get(ifaceName)!.push({
        timestamp: point.timestamp,
        value: metric.value,
      });
    }
  }

  return result;
}

/**
 * Calculate rates (bytes/sec) from counter values. Handles counter resets by
 * clamping negative deltas to zero.
 */
function calculateRates(
  points: Array<{ timestamp: number; value: number }>
): Array<{ timestamp: number; rate: number }> {
  const rates: Array<{ timestamp: number; rate: number }> = [];
  for (let i = 1; i < points.length; i++) {
    const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;
    const dv = points[i].value - points[i - 1].value;
    rates.push({
      timestamp: points[i].timestamp,
      rate: Math.max(0, dv / dt),
    });
  }
  return rates;
}

/**
 * Merge RX and TX rate arrays into sparkline points, aligning by timestamp.
 */
function mergeRates(
  rxRates: Array<{ timestamp: number; rate: number }>,
  txRates: Array<{ timestamp: number; rate: number }>
): SparklinePoint[] {
  // Build a map of TX rates indexed by timestamp for quick lookup
  const txMap = new Map<number, number>();
  for (const p of txRates) {
    txMap.set(p.timestamp, p.rate);
  }

  // Use RX timestamps as the base, filling TX from the map
  const points: SparklinePoint[] = [];
  for (const p of rxRates) {
    points.push({
      t: p.timestamp,
      rx: p.rate,
      tx: txMap.get(p.timestamp) ?? 0,
    });
  }

  // Add any TX-only timestamps not covered by RX
  const rxTimestamps = new Set(rxRates.map((r) => r.timestamp));
  for (const p of txRates) {
    if (!rxTimestamps.has(p.timestamp)) {
      points.push({ t: p.timestamp, rx: 0, tx: p.rate });
    }
  }

  points.sort((a, b) => a.t - b.t);
  return points.slice(-MAX_SPARKLINE_POINTS);
}

// ============================================================================
// Mini Sparkline Card
// ============================================================================

interface MiniCardProps {
  data: InterfaceSparklineData;
  gradientIdPrefix: string;
}

function MiniSparklineCard({ data, gradientIdPrefix }: MiniCardProps) {
  const isZeroTraffic = data.current.rx === 0 && data.current.tx === 0;
  const rxId = `${gradientIdPrefix}-rx`;
  const txId = `${gradientIdPrefix}-tx`;

  return (
    <div
      className="rounded-md border bg-card px-3 py-2 flex flex-col gap-1 min-w-0"
      style={{ opacity: isZeroTraffic ? 0.45 : 1 }}
    >
      {/* Interface name */}
      <span className="text-xs font-mono text-foreground truncate">
        {data.name}
      </span>

      {/* Sparkline chart */}
      <div className="w-full" style={{ height: 50 }}>
        {data.points.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.points}
              margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={rxId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RX_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={RX_COLOR} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={txId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={TX_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TX_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <Area
                type="monotone"
                dataKey="rx"
                stroke={RX_COLOR}
                strokeWidth={1.5}
                fill={`url(#${rxId})`}
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="tx"
                stroke={TX_COLOR}
                strokeWidth={1.5}
                fill={`url(#${txId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">
              Collecting...
            </span>
          </div>
        )}
      </div>

      {/* Current speed */}
      <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums leading-tight">
        <span style={{ color: RX_COLOR }}>
          &#x2193; {formatBytesPerSec(data.current.rx)}
        </span>
        <span style={{ color: TX_COLOR }}>
          &#x2191; {formatBytesPerSec(data.current.tx)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Widget Component
// ============================================================================

export default function PrometheusInterfaceSparklines({
  id,
  config,
  span,
  height,
  editMode,
  onConfigChange,
}: WidgetProps) {
  const { prometheus } = useDashboardData();

  // Subscribe to network interface metric families
  useEffect(() => {
    if (prometheus.status !== "available") return;
    const interval =
      typeof config.refreshInterval === "number"
        ? config.refreshInterval
        : 5000;
    const unsubscribe = prometheus.subscribe(SUBSCRIBED_FAMILIES, interval);
    return unsubscribe;
  }, [prometheus.status, prometheus.subscribe, config.refreshInterval]);

  // Build sparkline data for each interface
  const interfaces = useMemo((): InterfaceSparklineData[] => {
    const data = prometheus.data;

    // Gather RX data — try both metric name conventions
    const rxSeriesA = data.get("net_bytes_recv");
    const rxSeriesB = data.get("interface_rx_bytes");
    const txSeriesA = data.get("net_bytes_sent");
    const txSeriesB = data.get("interface_tx_bytes");

    const rxByIface = extractByInterface(rxSeriesA);
    const rxByIfaceB = extractByInterface(rxSeriesB);
    const txByIface = extractByInterface(txSeriesA);
    const txByIfaceB = extractByInterface(txSeriesB);

    // Merge both naming conventions into a single map
    for (const [iface, points] of rxByIfaceB) {
      if (!rxByIface.has(iface)) {
        rxByIface.set(iface, points);
      }
    }
    for (const [iface, points] of txByIfaceB) {
      if (!txByIface.has(iface)) {
        txByIface.set(iface, points);
      }
    }

    // Build the union of all interface names
    const allNames = new Set([...rxByIface.keys(), ...txByIface.keys()]);

    const result: InterfaceSparklineData[] = [];

    for (const name of allNames) {
      // Filter out loopback
      if (name === "lo" || name === "lo0") continue;

      const rxPoints = rxByIface.get(name) ?? [];
      const txPoints = txByIface.get(name) ?? [];

      const rxRates = calculateRates(rxPoints);
      const txRates = calculateRates(txPoints);

      const sparkPoints = mergeRates(rxRates, txRates);

      const lastRx = rxRates.length > 0 ? rxRates[rxRates.length - 1].rate : 0;
      const lastTx = txRates.length > 0 ? txRates[txRates.length - 1].rate : 0;

      result.push({
        name,
        current: { rx: lastRx, tx: lastTx },
        points: sparkPoints,
      });
    }

    // Sort by interface name (default) or traffic volume
    const sortBy = config.sortBy as string | undefined;
    if (sortBy === "traffic") {
      result.sort(
        (a, b) =>
          b.current.rx + b.current.tx - (a.current.rx + a.current.tx)
      );
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    return result;
  }, [prometheus.data, config.sortBy]);

  const isUnavailable =
    prometheus.status === "unavailable" || prometheus.status === "error";
  const isChecking = prometheus.status === "checking";

  return (
    <WidgetShell
      title="Interface Sparklines"
      icon={BarChart3}
      editMode={editMode}
      span={span}
      height={height}
      loading={isChecking}
    >
      {isUnavailable ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Enable Prometheus</p>
          <p className="text-xs text-muted-foreground/60">
            Prometheus metrics are not available on this device
          </p>
        </div>
      ) : interfaces.length === 0 && !isChecking ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <p className="text-sm text-muted-foreground">Waiting for data...</p>
          <p className="text-xs text-muted-foreground/60">
            Collecting interface traffic metrics
          </p>
        </div>
      ) : (
        <div
          className="overflow-y-auto"
          style={{ maxHeight: 360 }}
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
          >
            {interfaces.map((iface) => (
              <MiniSparklineCard
                key={iface.name}
                data={iface}
                gradientIdPrefix={`${id}-${iface.name}`}
              />
            ))}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
