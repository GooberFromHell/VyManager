# Decision Document — Background Instance Backup with Job Monitoring UI & Container Backup with Full Redeploy State

## Document Metadata

- **Date**: 2026-03-24
- **Branch**: `refactor/route-group-layouts`
- **Features**: Background Job System + Container Backup Enhancement
- **Spec Source**: `/new_features.md`
- **Discovery**: `/docs/plans/2026-03-24-background-jobs-container-backup/discovery-report.md`

---

## 1. Architecture Decisions

### AD-1: Database persistence for job state (not in-memory)

**Decision**: Persist all `BackgroundJob` records in PostgreSQL via a new `background_jobs` table, managed through a Prisma migration.

**Alternatives considered**:
- **In-memory `dict` with `asyncio.Lock`**: Simpler to implement, but all job history is lost on process restart.
- **Redis**: Durable and fast, but adds an infrastructure dependency.

**Rationale**: Prisma migration is trivial. DB persistence means users can trigger a backup, close their browser, and check back later even after a server restart. The `cancel_event` (`asyncio.Event`) remains in-memory only (in-process signaling) — a `cancel_requested` boolean column in the DB is the durable equivalent.

### AD-2: SSH authentication reuses existing SSH key infrastructure

**Decision**: Require instances to have SSH keys configured (via existing provisioning flow) before container-enriched backups can run. Do NOT add SSH password storage fields.

**Rationale**: The Instance model already has `sshPort`, `sshUsername`, `sshPublicKey`, `sshEncryptedPrivKey`, `sshKeyNonce`, `sshKeyConfigured`. The terminal router demonstrates the exact SSH connection pattern. If `sshKeyConfigured` is false, the backup logs a warning and proceeds with config-only backup (graceful degradation).

### AD-3: Polling for job updates (not SSE)

**Decision**: Client-side polling at 2.5s intervals via `useJobPolling` hook. Stops when all visible jobs reach terminal state.

**Rationale**: Simpler than SSE, spec recommends it as first iteration, backups are infrequent. SSE can be added later.

### AD-4: Air-gap image export deferred

**Decision**: Capture image digests only. Defer `?include_image_archives=true` to future iteration.

**Rationale**: `podman save` output can be hundreds of MB per image — too large for DB/JSON storage.

### AD-5: Job router at `/session/jobs`

**Decision**: Mount at `/session/jobs`. Goes through existing `session` catch-all proxy, requiring no new Next.js API routes.

### AD-6: Management section in `/sites` page sidebar

**Decision**: Fourth nav item alongside "Sites", "User Management", "Authentication".

### AD-7: Restore endpoint

**Decision**: `POST /session/sites/{site_id}/instances/{instance_id}/container-restore` accepts `ContainerFullBackup` payload.

---

## 2. Implementation Approach

### Feature 1: Background Job System

**Backend**: New `BackgroundJob` Prisma model + `background_jobs.py` module (CRUD via asyncpg) + `jobs.py` router at `/session/jobs` + refactor `backup.py` to return 202 with per-instance jobs + job pruning in lifespan.

**Frontend**: `background-jobs.ts` API service + `ManagementView`/`BackgroundJobsView` components + update `SiteToolsSection` for non-blocking backup + "Management" nav section in sites page.

### Feature 2: Container Backup Enhancement

**Backend**: Container backup Pydantic models + `container_backup.py` SSH data collection module + integrate into backup job coroutine + restore endpoint.

**Frontend**: Container backup detail types + `BackupDetailModal` + `ContainerRestoreWizard`.

---

## 3. Task Plan

### Phase 1: Database Schema + Backend Models

| ID | Title | Archetype | Depends On | Parallel With |
|----|-------|-----------|------------|---------------|
| task-001 | Prisma migration for background_jobs table | custom | - | task-002 |
| task-002 | Container backup Pydantic models | custom | - | task-001 |

### Phase 2: Backend Implementation

| ID | Title | Archetype | Depends On | Parallel With |
|----|-------|-----------|------------|---------------|
| task-003 | Background jobs registry module | custom | task-001 | task-005 |
| task-004 | Job management API router | custom | task-003 | task-005 |
| task-005 | Container backup SSH data collection | custom | task-002 | task-003, task-004 |
| task-006 | Refactor backup endpoint to fire-and-forget | custom | task-003, task-005 | - |
| task-007 | Container restore API endpoint | custom | task-005 | task-006 |

### Phase 3: Frontend Implementation

| ID | Title | Archetype | Depends On | Parallel With |
|----|-------|-----------|------------|---------------|
| task-008 | Frontend API service and types | custom | task-004 | task-009 (streaming) |
| task-009 | ManagementView + BackgroundJobsView components | custom | task-008 | - |
| task-010 | Update sites page + SiteToolsSection | custom | task-009, task-008 | task-011 |
| task-011 | Backup detail modal | custom | task-008 | task-010 |
| task-012 | Container restore wizard | custom | task-011, task-007 | - |

### Phase 4: Integration & Wiring

| ID | Title | Archetype | Depends On | Parallel With |
|----|-------|-----------|------------|---------------|
| task-013 | Register jobs router + update lifespan | registration | task-004, task-006 | task-014 |
| task-014 | Add job polling to POLLING_ENDPOINTS | custom | task-004 | task-013 |

### Phase 5: Validation

| ID | Title | Archetype | Depends On | Parallel With |
|----|-------|-----------|------------|---------------|
| task-015 | TypeScript + lint validation | validation | all phase 3-4 tasks | - |

---

## 4. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large volume data in JSON backup results | High | `CONTAINER_VOLUME_BACKUP_MAX_MB` env var (default 500) caps per-volume size |
| SSH connection failures during backup | Medium | Per-item try/except, graceful degradation to config-only (status "partial") |
| Orphaned jobs after server restart | Low | `prune_old_jobs` marks stale "running" jobs as "failed" at startup |
| Concurrent backup triggers | Medium | Existing semaphore(5) limits concurrent ops |
| Polling traffic | Low | Auto-stops when no running jobs, only active on Management tab |

---

## 5. Scope Deferral

1. **Air-gap image export** (`?include_image_archives=true`) — payload too large
2. **Bulk trigger download** (zip all jobs in a trigger group) — individual download implemented
3. **SSE for real-time updates** — polling first, SSE later
4. **Audit Log & System Health tabs** — Management tab container is extensible
5. **Fine-grained container:restore RBAC** — ADMIN role required for now
6. **SSH password auth** — only keypair (provisioned instances)
7. **VyOS version-specific podman commands** — test and adjust if needed
