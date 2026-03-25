# Discovery Report — Dashboard Refactor with Prometheus Data Source

**Index tier:** TIER 1 (cached)
**Project index:** `.derpo/` (commit: 536af59)

## Project Patterns
See `.derpo/architecture.md` for full backend/frontend/RBAC patterns.
No deviations noted for this goal.

## Current Dashboard Implementation

### Page (`frontend/src/app/(default)/(app)/page.tsx`)
- 645 lines, `Home` component
- 3-column CSS grid with explicit row/column placement
- @dnd-kit for drag-and-drop (sensors, sortable, droppable)
- Cards defined by `DashboardCard` interface: `{id, type, column, position, span, config?}`
- `renderCard()` switches on `card.type` to render component
- Edit mode toggles DnD + column overlay drop targets
- Smart placement: occupancy-map-based positioning, span validation

### Existing Widget Types (4 total)
1. **InterfaceStatisticsCard** (19.5KB) — paginated interface counters, traffic bars, search/sort
2. **SystemInfoCard** (12KB) — memory/disk/CPU/version with progress bars
3. **NetworkSpeedCard** (16.4KB) — Recharts AreaChart, 2-min rolling window, per-interface selection
4. **WireGuardPeersCard** (9KB) — peer status, handshake times, transfer stats
5. **AddCardModal** (4.7KB) — card type picker with RBAC-gated options

### Data Flow
- `DashboardDataProvider` context wraps page, provides `useDashboardData()` hook
- `useDashboardSSE()` hook connects to `/api/vyos/show/stream` (SSE)
- Backend `DeviceDataBroadcaster` runs GraphQL queries:
  - Fast cycle (1s): interface counters
  - Slow cycle (5s): system info, disk, WireGuard
  - WireGuard peers: 15s minimum interval
- One broadcaster per VyOS instance (shared across all clients)

### Layout Persistence
- `DashboardLayout` Prisma model: JSONB `layout` field, unique on `(userId, instanceId)`
- `dashboardService.getLayout()` / `saveLayout()` via `/dashboard/layout` endpoints
- Backend upserts with `ON CONFLICT`

### Dependencies
- `recharts@^3.6.0` — charts
- `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0` — drag-and-drop
- `lucide-react` — icons
- Zustand `useSessionStore()` for active instance

## VyOS Prometheus API Research

### Endpoint
- URL: `http://<vyos-host>:9273/metrics` (Telegraf prometheus-client)
- Must be enabled separately: `set service monitoring telegraf prometheus-client`
- Optional auth: `authentication username/password`
- Available on both VyOS 1.4 and 1.5

### Metric Families
- `cpu_usage_*` — CPU usage by core
- `mem_*` — Memory statistics (used, free, buffered, cached, total)
- `disk_*` — Disk I/O metrics
- `diskio_*` — Disk I/O counters
- `interface_*` / `net_*` — Interface statistics (bytes, packets, errors, drops)
- `processes_*` — Process counts and states
- `system_*` — Uptime, load averages
- Additional metrics depend on configured Telegraf input plugins

### Current Monitoring Architecture
```
VyOS Device
├─ REST API (port 443)           ← pyvyos SDK (config operations)
├─ GraphQL API (port 443)        ← Dashboard SSE stream (real-time counters)
├─ SSH (port 22)                 ← WebSocket monitoring terminal
└─ Prometheus metrics (port 9273) ← NOT YET INTEGRATED
```

### Integration Approach
- Backend proxies Prometheus queries (no direct browser→VyOS)
- Parse Prometheus text format server-side, return JSON
- Need instance-level config for Prometheus port/auth
- Frontend fetches via standard proxy route

## Gaps

1. **No Prometheus integration** — no backend endpoint, no frontend hook, no instance config
2. **Only 4 widget types** — no gauges, no donut charts, no sparklines, no tables
3. **No widget configuration** — cards have minimal config (span, interface selection)
4. **No resize handles** — span changes only via dropdown menu
5. **Limited time-series** — only NetworkSpeedCard has a chart (single interface)
6. **No metric picker** — users can't choose which metrics to visualize
7. **No Prometheus availability detection** — can't know if device has Telegraf enabled
8. **Fixed 3-column grid** — no responsive column count or flexible sizing

## Dependencies for This Goal
- Need new npm packages for richer visualizations (or extend Recharts usage)
- Need Prisma migration if adding Prometheus config fields to Instance model
- Backend needs `httpx` or similar for Prometheus HTTP queries (already have `httpx` in deps)
- Prometheus text format parser needed (or use an existing Python library)
