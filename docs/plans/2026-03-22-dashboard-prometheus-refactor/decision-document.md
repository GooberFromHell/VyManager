# Decision Document — Dashboard Refactor with Prometheus Data Source

## Approach Summary

This refactor evolves the VyManager dashboard from a fixed 3-column grid with 4 card types into a flexible, Grafana-inspired monitoring dashboard that supports both the existing SSE-based GraphQL data and a new Prometheus metrics data source. The approach preserves the existing @dnd-kit drag-and-drop interaction model and SSE data architecture, while adding a Prometheus proxy backend, new time-series-oriented widgets, and per-widget configuration. The grid system shifts to a 12-column CSS grid (not a new dependency) with configurable card widths and heights, giving users meaningfully better density control without introducing pixel-based layout complexity.

## Key Decisions

### 1. Grid System — 12-Column CSS Grid (No New Dependency)

Replace the fixed 3-column grid with a 12-column CSS grid, retaining @dnd-kit for drag-and-drop. Do NOT adopt react-grid-layout.

- 12-column grid enables card widths of 1/12 through 12/12 in increments covering every practical layout: 3-col (span-4), 4-col (span-3), 2-col (span-6), mixed (span-4 + span-8)
- Preserves the existing `DashboardCard` data model with range changes: `span` becomes 1-12, `column` becomes 0-11
- Cards get a configurable `height` property (1=compact ~260px, 2=standard ~520px, 3=tall ~780px) for time-series charts that benefit from vertical space
- Existing layouts migrate trivially: old span 1→4, span 2→8, span 3→12
- Drop zones kept coarser (4 zones of 3 columns) rather than 12 individual targets for usability

### 2. Prometheus Backend — New Dedicated Router

Create `backend/routers/prometheus/prometheus.py` at `/vyos/prometheus/`. Do NOT extend the existing monitoring router.

- Backend acts as server-side proxy: fetches from VyOS `:9273/metrics`, parses, serves JSON
- Endpoints: `GET /status`, `GET /metrics?families=...`, `GET /capabilities`
- Uses `httpx.AsyncClient` (already a dependency)
- Lightweight custom Prometheus text format parser (~50 lines), no new pip dependency
- Connection details from `request.state.instance` (host + new Prometheus fields)

### 3. New Widget Types — 5 Prometheus-Powered Widgets

1. **CPU & Memory Gauge** (`prometheus-system-gauge`) — Dual radial gauge, Recharts PieChart in gauge mode. Span 3, height 1.
2. **Time-Series Multi-Line Chart** (`prometheus-timeseries`) — Configurable metric selector, rolling window (1m-30m), up to 8 series. Span 6, height 2.
3. **Disk Usage Donut** (`prometheus-disk-donut`) — Donut chart of disk partitions. Span 3, height 1.
4. **Interface Traffic Sparklines** (`prometheus-interface-sparklines`) — Grid of small sparklines per interface. Span 6, height 2.
5. **Metric Table** (`prometheus-metric-table`) — Sortable table with monospace values and threshold coloring. Span 6, height 2.

### 4. Widget Configuration — Settings Drawer

Use a Sheet (right-side drawer) triggered from each widget's settings gear in edit mode. Each widget type defines its own `ConfigPanel` component and `defaultConfig`.

Widget registration pattern replaces hardcoded switch/array:
```typescript
interface WidgetRegistration {
  type: string; name: string; description: string; icon: LucideIcon;
  component: React.ComponentType<WidgetProps>;
  configPanel?: React.ComponentType<WidgetConfigPanelProps>;
  defaultConfig: Record<string, unknown>;
  defaultSpan: number; defaultHeight: number;
  dataSource: 'sse' | 'prometheus' | 'hybrid';
  requiredPermission?: FeatureGroup;
}
```

### 5. Data Architecture — Separate Hooks, Extended Context

Keep SSE unchanged. Add `usePrometheusData` hook for HTTP polling. Extend `DashboardDataContext` to provide both.

- Widgets register metric subscriptions → hook unions and batches into single request per interval
- Rolling time-series buffer (configurable, default 5min, capped at 1000 points per metric)
- When no widgets are subscribed, polling stops entirely
- SSE data (push, 1s) and Prometheus data (pull, 5s) remain independent

### 6. Instance-Level Prometheus Config — Fields on Instance Model

Add to existing Instance Prisma model:
- `prometheusEnabled` (Boolean, default false)
- `prometheusPort` (Int, default 9273)
- `prometheusAuth` (Boolean, default false)
- `prometheusUsername` (String?)
- `prometheusPassword` (String?)

UI: Add "Prometheus" section to Edit Instance modal.

### 7. Dependencies — No New NPM Packages

- **Recharts** (already installed): handles all viz types (line, area, pie, donut, gauge, sparkline)
- **@dnd-kit** (already installed): unchanged
- **httpx** (already installed on backend): Prometheus HTTP fetching
- **No new packages required**

## What to Reuse

| Component | How Used |
|-----------|----------|
| @dnd-kit system | Same DnD logic, column IDs change |
| `DeviceDataBroadcaster` SSE | Untouched, Prometheus is a separate path |
| `DashboardDataProvider` | Extended with Prometheus state |
| `DashboardLayout` Prisma model | JSONB field already stores arbitrary card configs |
| Dashboard API service | `getLayout`/`saveLayout` unchanged |
| Dashboard backend router | No changes, already handles arbitrary JSONB |
| RBAC `DASHBOARD` FeatureGroup | Prometheus widgets use same permission |
| Catch-all proxy | Automatically handles `/vyos/prometheus/*` |
| Recharts patterns from NetworkSpeedCard | AreaChart gradients, tooltips, rolling windows |
| Card component patterns | Header, controls, span selector → formalized in WidgetShell |

## What to Build

### Backend
1. `backend/routers/prometheus/prometheus.py` — status, metrics, capabilities endpoints
2. `backend/prometheus_parser.py` — lightweight text format parser
3. Prisma migration — Prometheus fields on Instance
4. Session middleware update — include Prometheus fields in request state

### Frontend
5. `usePrometheusData` hook — subscription-based polling with batching
6. `frontend/src/lib/api/prometheus.ts` — API service
7. `widget-registry.ts` — centralized widget registration
8. `WidgetShell.tsx` — shared wrapper (header, edit controls, loading/error)
9. `WidgetConfigDrawer.tsx` — Sheet-based config UI
10. 5 new widget components in `frontend/src/components/dashboard/widgets/`
11. Refactored `page.tsx` — from 645-line monolith to registry-based composition
12. Updated `AddCardModal` — grouped by data source, Prometheus availability badges
13. Layout migration utility (3-col → 12-col)
14. Edit Instance modal update — Prometheus config section

## What NOT to Do

1. **Do NOT adopt react-grid-layout** — CSS grid approach is simpler, aligns with existing code
2. **Do NOT replace the SSE pipeline** — It works. Prometheus is additive.
3. **Do NOT add time-series storage** — Browser rolling buffer only, not Grafana
4. **Do NOT create per-widget connections** — One batched HTTP poll serves all
5. **Do NOT make Prometheus a prerequisite** — Graceful degradation required
6. **Do NOT introduce D3 directly** — Recharts handles everything needed
7. **Do NOT add a new FeatureGroup** — DASHBOARD permission covers Prometheus
8. **Do NOT allow direct frontend→VyOS connections** — All through backend

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Prometheus not enabled on some devices | Medium | Status check on load, clear "not enabled" UI state, docs link |
| Prometheus text format edge cases | Medium | Start with gauges/counters only (what Telegraf exports), skip histograms |
| 12-column DnD complexity | Medium | Keep drop zones coarser (4 zones), snap to nearest valid column |
| Layout migration for existing users | Medium | Migrate on read (not DB migration), idempotent, preserves original JSONB |
| Browser memory for time-series buffers | Low | Cap at 1000 points/metric, max 30min window |
| Prometheus credential storage | Low | Reuse existing encryption pattern for passwords |

## Task Outline

**Phase 1: Backend Prometheus Infrastructure**
- Prisma migration (Prometheus fields on Instance)
- Session middleware update
- Prometheus text parser
- Prometheus router (status, metrics, capabilities)
- Register in app.py

**Phase 2: Dashboard Grid & Widget Registry Refactor**
- Widget registry + WidgetShell wrapper
- Refactor page.tsx to 12-column grid + registry
- Layout migration utility
- Update AddCardModal
- Configurable card height

**Phase 3: Prometheus Data Layer (Frontend)**
- Prometheus API service
- usePrometheusData hook
- Expand DashboardDataContext
- Prometheus status check in dashboard load

**Phase 4: Widget Configuration System**
- WidgetConfigDrawer (Sheet component)
- Config panels for existing widgets
- Edit Instance modal Prometheus section

**Phase 5: New Prometheus Widgets**
- PrometheusSystemGauge
- PrometheusTimeSeries (+ metric selector config)
- PrometheusDiskDonut
- PrometheusInterfaceSparklines
- PrometheusMetricTable

**Phase 6: Validation**
- TypeScript type check + lint
- Graceful degradation testing
- Layout persistence + migration testing
