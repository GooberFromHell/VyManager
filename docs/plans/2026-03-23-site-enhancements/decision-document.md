# Decision Document: Site Enhancements

**Goal:** Enhance the sites page with instance reachability status indicators, per-site proxy host designation, and per-site tools placeholder.

**Mode:** Fast-track (Tier 1 — index fresh, zero file delta)

---

## Discovery Notes

### Current State
- Sites page shows instances in a card/table grid with "Connected" and "Inactive" badges only
- No reachability/health checking — users must attempt connection to discover a device is down
- No proxy/jump host concept — all instances connect directly
- No site-level tooling section
- Session router (`backend/routers/session/session.py`) handles all site/instance CRUD
- `VyDevice` connects via `host:port` with API key — synchronous `requests` library
- Prisma schema has `Site` → `Instance[]` relationship, no proxy field

### Key Technical Findings
- `pyvyos` is synchronous — health checks need `run_in_threadpool()` wrapping
- Session router endpoints are under `/session/` prefix, which SessionMiddleware skips (no active instance required)
- `list_site_instances` already has RBAC filtering (ADMIN sees all, non-ADMIN sees permitted only)
- `InstanceCard` and `InstanceTableView` are the two display modes — both need status indicators
- `EditSiteModal` currently has only name/description fields — simple to extend with proxy host

---

## Design Decisions

### Feature 1: Instance Reachability Status

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Check method | Lightweight VyOS API call (`show system host-name`) | Full config fetch is too heavy; minimal call proves API reachability |
| Endpoint granularity | Batch per-site (`GET /sites/{id}/instances/status`) | One HTTP request instead of N; backend checks concurrently |
| Storage | No DB persistence — check on demand | Reachability is ephemeral; avoids staleness/cleanup complexity |
| Concurrency | `asyncio.gather` + `Semaphore(10)` with 3s timeout per instance | Prevents resource exhaustion for large sites |
| Auth | Requires login but NOT active VyOS session | Endpoint is under `/session/` prefix (skipped by SessionMiddleware) |

### Feature 2: Per-Site Proxy Host

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema | Nullable FK `proxyHostId` on Site → Instance | Simple, at most one proxy per site |
| Validation | Application-layer: proxy must belong to same site | DB can't enforce this; checked in update_site |
| Cascade | `onDelete: SetNull` — deleting proxy instance nullifies the field | Better than blocking deletion |
| Instance move | Clear proxy if moved instance was the proxy host | Prevents cross-site proxy references |

### Feature 3: Per-Site Tools (Placeholder)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Frontend-only placeholder | No backend needed for "Coming Soon" state |
| Placement | Below instances grid on sites page | Natural visual hierarchy |
| Content | 4 placeholder cards (Backup, Bulk Push, Health Report, Firmware) | Realistic future tools for network management |

---

## Task Plan

### Dependency Graph

```
Track A (status):   T2.1 ──→ T3.1 ──→ T3.2 ──→ T3.3 ─────┐
Track B (proxy):    T1.1 ──→ T2.2 ──→ T3.4 ──→ T3.5 ──────┤──→ T4.1
Track C (tools):    T3.6 ──→ T3.7 ────────────────────────-─┘
```

Three independent tracks execute concurrently via streaming phases.

### Phase 1: Database Schema (1 task)

| ID | Title | Depends On | Parallel |
|----|-------|-----------|----------|
| T1.1 | Add `proxyHostId` to Site model + migration | — | — |

### Phase 2: Backend (2 tasks, parallel)

| ID | Title | Depends On | Parallel |
|----|-------|-----------|----------|
| T2.1 | Instance reachability status endpoint | — | T2.2 |
| T2.2 | Proxy host support in site CRUD endpoints | T1.1 | T2.1 |

### Phase 3: Frontend (7 tasks, streaming)

| ID | Title | Depends On | Parallel |
|----|-------|-----------|----------|
| T3.1 | Reachability status types + API method | T2.1 | T3.4, T3.6 |
| T3.2 | Status indicators in InstanceCard + InstanceTableView | T3.1 | — |
| T3.3 | Wire status polling into sites page | T3.2 | — |
| T3.4 | Proxy host types + API methods | T2.2 | T3.1, T3.6 |
| T3.5 | Proxy host UI in EditSiteModal + site display | T3.4 | — |
| T3.6 | SiteToolsSection placeholder component | — | T3.1, T3.4 |
| T3.7 | Integrate SiteToolsSection into sites page | T3.6 | — |

### Phase 4: Validation (1 task)

| ID | Title | Depends On | Parallel |
|----|-------|-----------|----------|
| T4.1 | TypeScript check + lint + integration verification | T3.3, T3.5, T3.7 | — |

### Task Details Summary

**T1.1** — Schema: Add `proxyHostId String?` to Site, add `proxyHost` relation (SetNull cascade), add `proxiedSites` back-relation on Instance. Run `prisma migrate dev` + `prisma generate`.

**T2.1** — Backend: New `GET /session/sites/{site_id}/instances/status` endpoint. `InstanceStatusResponse` model (instance_id, status, latency_ms, error). Concurrent checks via `asyncio.gather` with `Semaphore(10)` and 3s timeout. Uses `VyDevice.retrieve_show_config(path=["system","host-name"])` as lightweight probe. RBAC: same instance filtering as list endpoint.

**T2.2** — Backend: Add `proxy_host_id` to `SiteResponse`, `SiteCreateRequest`, `SiteUpdateRequest`. Update `create_site`/`update_site`/`list_user_sites` queries. Validate proxy instance belongs to same site. Clear proxy on instance site-move.

**T3.1** — Frontend API: Add `InstanceStatus` interface + `checkSiteStatus()` method to SessionService.

**T3.2** — Frontend UI: Add colored status dot + label to InstanceCard header. Add status column to InstanceTableView. Props: `reachabilityStatus` / `statusMap`.

**T3.3** — Frontend wiring: Add `instanceStatuses` state to sites page. Call `checkSiteStatus()` after `loadInstances` (non-blocking). Pass status data to cards/table. Add "Refresh Status" button.

**T3.4** — Frontend API: Update `Site` interface with `proxy_host_id`. Update create/update request types.

**T3.5** — Frontend UI: Add proxy host Select dropdown to EditSiteModal (populated by site's instances). Show proxy badge on site card. Handle create modal (disabled hint). Clear proxy on instance move if applicable.

**T3.6** — Frontend UI: New `SiteToolsSection.tsx` — grid of 4 placeholder cards with icons, descriptions, "Coming Soon" badges. Muted styling.

**T3.7** — Frontend wiring: Import SiteToolsSection into sites page, render below instances grid with separator.

**T4.1** — Validation: `npx tsc --noEmit`, `npm run lint`, verify no regressions.

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Status check timeout accumulation (many offline instances) | `asyncio.Semaphore(10)` + 3s per-instance timeout |
| API keys in memory during health checks | Never returned in response; same pattern as connect flow |
| Proxy host referencing wrong-site instance | Application-layer validation in update_site |
| Instance move orphans proxy designation | Clear proxyHostId when proxy instance is moved to different site |
| Tools section creates expectation of functionality | Clear "Coming Soon" badge + muted styling |
