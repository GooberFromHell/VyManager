import { LucideIcon, Activity, Cpu, Gauge, CircleGauge, HardDrive, Shield, BarChart3, Table2, TrendingUp } from "lucide-react";
import { ComponentType } from "react";
import { InterfaceStatisticsCard } from "./InterfaceStatisticsCard";
import { SystemInfoCard } from "./SystemInfoCard";
import { NetworkSpeedCard } from "./NetworkSpeedCard";
import { WireGuardPeersCard } from "./WireGuardPeersCard";
import PrometheusSystemGauge from "./widgets/PrometheusSystemGauge";
import PrometheusInterfaceSparklines from "./widgets/PrometheusInterfaceSparklines";
import PrometheusDiskDonut from "./widgets/PrometheusDiskDonut";
import { PrometheusMetricTable, PrometheusMetricTableConfig } from "./widgets/PrometheusMetricTable";
import { PrometheusTimeSeries, PrometheusTimeSeriesConfig } from "./widgets/PrometheusTimeSeries";

// ============================================================================
// Types
// ============================================================================

export interface WidgetProps {
  id: string;
  config: Record<string, unknown>;
  span: number;
  height: number;
  editMode: boolean;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

export interface WidgetConfigPanelProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export interface WidgetRegistration {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  component: ComponentType<WidgetProps>;
  configPanel?: ComponentType<WidgetConfigPanelProps>;
  defaultConfig: Record<string, unknown>;
  defaultSpan: number;
  defaultHeight: number;
  dataSource: "sse" | "prometheus" | "hybrid";
  requiredPermission?: string;
}

// ============================================================================
// Registry
// ============================================================================

const widgets = new Map<string, WidgetRegistration>();

export function registerWidget(reg: WidgetRegistration): void {
  widgets.set(reg.type, reg);
}

export function getWidget(type: string): WidgetRegistration | undefined {
  return widgets.get(type);
}

export function getAllWidgets(): WidgetRegistration[] {
  return Array.from(widgets.values());
}

export function getWidgetsByDataSource(
  source: "sse" | "prometheus" | "hybrid"
): WidgetRegistration[] {
  return Array.from(widgets.values()).filter(
    (reg) => reg.dataSource === source
  );
}

// ============================================================================
// Built-in widget registrations
// ============================================================================

registerWidget({
  type: "interface-statistics",
  name: "Interface Statistics",
  description: "Real-time traffic counters for all network interfaces",
  icon: Activity,
  component: InterfaceStatisticsCard,
  defaultConfig: {},
  defaultSpan: 12,
  defaultHeight: 2,
  dataSource: "sse",
});

registerWidget({
  type: "system-info",
  name: "System Information",
  description: "CPU load, memory usage, disk utilization, and version info",
  icon: Cpu,
  component: SystemInfoCard,
  defaultConfig: {},
  defaultSpan: 4,
  defaultHeight: 2,
  dataSource: "sse",
});

registerWidget({
  type: "network-speed",
  name: "Network Speed",
  description: "Live download and upload speed chart for a selected interface",
  icon: Gauge,
  component: NetworkSpeedCard,
  defaultConfig: {},
  defaultSpan: 8,
  defaultHeight: 2,
  dataSource: "sse",
});

registerWidget({
  type: "wireguard-peers",
  name: "WireGuard Peers",
  description: "Connection status and handshake times for WireGuard peers",
  icon: Shield,
  component: WireGuardPeersCard,
  defaultConfig: {},
  defaultSpan: 6,
  defaultHeight: 2,
  dataSource: "sse",
  requiredPermission: "WIREGUARD",
});

registerWidget({
  type: "prometheus-system-gauge",
  name: "CPU & Memory Gauge",
  description: "Dual radial gauge showing current CPU and memory utilization",
  icon: CircleGauge,
  component: PrometheusSystemGauge,
  defaultConfig: { refreshInterval: 5000 },
  defaultSpan: 4,
  defaultHeight: 1,
  dataSource: "prometheus",
});

registerWidget({
  type: "prometheus-interface-sparklines",
  name: "Interface Sparklines",
  description: "Grid of mini charts showing per-interface throughput",
  icon: BarChart3,
  component: PrometheusInterfaceSparklines,
  defaultConfig: { timeWindow: 300000, sortBy: "name", refreshInterval: 5000 },
  defaultSpan: 6,
  defaultHeight: 2,
  dataSource: "prometheus",
});

registerWidget({
  type: "prometheus-disk-donut",
  name: "Disk Usage",
  description: "Donut chart showing disk partition usage",
  icon: HardDrive,
  component: PrometheusDiskDonut,
  defaultConfig: { refreshInterval: 30000 },
  defaultSpan: 4,
  defaultHeight: 1,
  dataSource: "prometheus",
});

registerWidget({
  type: "prometheus-metric-table",
  name: "Metric Table",
  description: "Tabular display of metrics with threshold coloring",
  icon: Table2,
  component: PrometheusMetricTable,
  configPanel: PrometheusMetricTableConfig,
  defaultConfig: { families: [], thresholds: { warning: 70, critical: 90 }, refreshInterval: 10000 },
  defaultSpan: 6,
  defaultHeight: 2,
  dataSource: "prometheus",
});

registerWidget({
  type: "prometheus-timeseries",
  name: "Time Series Chart",
  description: "Configurable multi-line chart for any Prometheus metric",
  icon: TrendingUp,
  component: PrometheusTimeSeries,
  configPanel: PrometheusTimeSeriesConfig,
  defaultConfig: { families: [], timeWindow: 300000, unit: "raw", refreshInterval: 5000 },
  defaultSpan: 6,
  defaultHeight: 2,
  dataSource: "prometheus",
});
