# New Features — Detailed Implementation Specification

---

## Feature 1: Background Instance Backup with Job Monitoring UI

### Overview

The existing site backup endpoint (`POST /session/sites/{site_id}/backup` in `backend/routers/site_tools/backup.py`) is **synchronous and blocking**. It holds the HTTP connection open while it concurrently connects to every VyOS instance in the site, fetches full configs, and only then returns. For sites with many instances or slow/unreachable devices—where the per-device timeout is already 15 s—this can easily time out at the proxy layer (Next.js → FastAPI). The goal of this feature is to:

1. Move backup execution **entirely off the request/response cycle** into a background task.
2. **Track one background job per router instance**, not one job per site. A site backup for a site with 4 routers creates 4 independent jobs — one per instance — so granular per-router progress and failure visibility is possible.
3. **Persist job state** so the user can close the browser or navigate away and return to see results.
4. Build a **frontend page** accessible from the `/sites` page navigation under a new **"Management"** section that lists all active and past background jobs with live status, progress, and log output.

---

### Backend Changes

#### 1. Background Job Registry (New Module)

Create `backend/background_jobs.py` (or `backend/routers/site_tools/jobs.py` to keep it beside backup). This module owns a shared in-process job store. Because FastAPI runs a single Python process, a plain `dict` keyed by `job_id` works without Redis for a first iteration, but must be thread-safe. Use `asyncio.Lock` for mutation.

**Job record shape:**

```python
@dataclasses.dataclass
class BackgroundJob:
    job_id: str                    # UUID4 string
    job_type: str                  # "instance_backup" (extensible for future job types)
    instance_id: str               # The specific VyOS router instance this job targets
    instance_name: str             # Display name of the instance (e.g. "router-01")
    site_id: str                   # Parent site — for grouping in the UI
    site_name: str                 # Parent site display name
    user_id: str
    status: str                    # "queued" | "running" | "success" | "partial" | "failed" | "cancelled"
    progress: int                  # 0-100 (meaningful for multi-step jobs like container backups)
    created_at: datetime
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    result: Optional[dict]         # Final InstanceBackupResult payload (JSON-serialisable)
    log: list[str]                 # Ordered list of timestamped status messages shown in the UI
    error: Optional[str]           # Top-level error if job itself failed to start
    cancel_event: asyncio.Event    # In-memory only — not persisted to DB; used to signal cancellation
```

> **Key design decision — one job per instance**: When the user triggers a site backup for a site with *N* instances, the backend creates *N* `BackgroundJob` records (one per instance) and launches *N* coroutines concurrently (still capped by the semaphore). This means the Management UI can show per-router status (`router-01: success`, `router-02: failed`, `router-03: running`) rather than a single opaque site-level job. Jobs for the same triggering action share a `trigger_id` (a common UUID stamped at trigger time) so they can be grouped in the UI.

Provide helper functions:
- `create_job(...)` → inserts record, returns `job_id`
- `get_job(job_id)` → returns record or `None`
- `list_jobs(user_id=None, site_id=None, trigger_id=None)` → returns job list, optionally filtered; supports grouping by `trigger_id`
- `update_job(job_id, **kwargs)` → mutates record fields atomically under `asyncio.Lock`
- `prune_old_jobs(max_age_hours=24)` → background cleanup task (run on app startup with `asyncio.create_task`)

> **Oversight**: If the FastAPI process restarts, all in-memory jobs are lost. For production robustness, persist rows in the existing PostgreSQL database instead of memory. The schema should be a `background_jobs` table with the same shape. For a first pass, in-memory is acceptable if there's a clear upgrade path comment in the code.

#### 2. New Job-Management Router

`backend/routers/site_tools/jobs.py` — prefix `/session/jobs`

Note the prefix is **not** scoped under a site because jobs are instance-level and the Management UI needs to list jobs across all sites in a single view.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all jobs visible to the current user. Supports `?site_id=` and `?trigger_id=` query params for filtering. ADMIN sees all users' jobs. |
| `GET` | `/{job_id}` | Get a single job record (used for polling a specific instance job). |
| `DELETE` | `/{job_id}` | Cancel a running job for a specific instance. Sets `status = "cancelled"` and signals the coroutine via its `cancel_event`. |

Each endpoint enforces authentication (`request.state.user` must exist) but does **not** need a VyOS RBAC check — these are VyManager app-level operations.

Register the new router in `backend/main.py` (wherever `site_tools` routers are currently mounted).

#### 3. Refactor `backup.py` — Fire-and-Forget Pattern (Per-Instance Jobs)

Change the existing `POST /{site_id}/backup` endpoint to:

1. Validate the user is platform ADMIN (same DB query as today).
2. Look up the site and its instances (same DB query as today).
3. Generate a shared `trigger_id = str(uuid.uuid4())` — this groups all the jobs from this single backup request together.
4. For **each instance**, call `create_job(...)` to register an individual `BackgroundJob` with `status="queued"`, `instance_id`, `instance_name`, `site_id`, `site_name`, and the shared `trigger_id`.
5. Launch one coroutine per instance via `asyncio.create_task(run_instance_backup_job(job_id, instance_row, db_pool))`.
6. **Immediately** return `HTTP 202 Accepted` with `{ "trigger_id": "...", "job_ids": ["...", "..."] }` so the frontend can either poll by `trigger_id` (to see the group) or by individual `job_id` (to zoom in on one router).

The `run_instance_backup_job(job_id, instance_row, db_pool)` coroutine (one per instance):
- Sets `status = "running"`, `started_at = now()`.
- Appends log: `"Backup started for instance '{instance_name}' ({host})"`.
- Calls the existing `_backup_instance(instance_row)` logic (config fetch, container enrichment if applicable).
- Updates `progress` incrementally as multi-step tasks complete (e.g., 33% after config fetch, 66% after image digest, 100% after volume data).
- On completion, sets `result = InstanceBackupResult.dict()`, `status = "success"` or `"failed"`, `finished_at`.
- Checks `cancel_event.is_set()` between each major step; if set, sets `status = "cancelled"` and returns early.
- Catches all exceptions and sets `status = "failed"`, `error = str(e)`.

> **Oversight — cancellation**: When `DELETE /{job_id}` is called, the coroutine needs a way to check. Pass an `asyncio.Event` into `run_backup_job`; check `cancel_event.is_set()` after each instance loop iteration. If set, abort and set `status = "cancelled"`.

> **Oversight — app shutdown**: Register a `lifespan` handler on the FastAPI app that awaits all running job tasks (or cancels them gracefully) before shutdown to avoid zombie coroutines.

#### 4. Download Endpoint (for Completed Instance Backups)

Add `GET /session/jobs/{job_id}/download` that:
- Looks up the job by `job_id` and validates ownership (user owns the job OR user is ADMIN).
- Validates `job.status == "success"` — do not serve partially-complete results.
- Serialises `job.result` to JSON (`orjson.dumps` for speed).
- Returns `Response(content=json_bytes, media_type="application/json", headers={"Content-Disposition": f"attachment; filename=backup_{instance_name}_{timestamp}.json"})`.

A bulk download — downloading all instance backups from a trigger group as a single archive — can be added later as `GET /session/jobs/trigger/{trigger_id}/download` which zips all successful job results into a `.zip` file using Python's `zipfile` module.

---

### Database Schema Addition (If Persisting Jobs)

```sql
CREATE TABLE background_jobs (
  id               TEXT PRIMARY KEY,   -- UUID (job_id)
  trigger_id       TEXT NOT NULL,      -- UUID shared by all jobs from one backup trigger
  job_type         TEXT NOT NULL,      -- e.g. "instance_backup"
  instance_id      TEXT NOT NULL,      -- the specific VyOS router instance
  instance_name    TEXT NOT NULL,
  site_id          TEXT NOT NULL,
  site_name        TEXT NOT NULL,
  user_id          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'queued',
  progress         INT  NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ,
  result           JSONB,              -- InstanceBackupResult as JSON
  log              JSONB NOT NULL DEFAULT '[]',
  error            TEXT,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_background_jobs_user       ON background_jobs(user_id);
CREATE INDEX idx_background_jobs_trigger    ON background_jobs(trigger_id);
CREATE INDEX idx_background_jobs_instance   ON background_jobs(instance_id);
CREATE INDEX idx_background_jobs_status     ON background_jobs(status);
```

Add a corresponding Prisma model in `prisma/schema.prisma` so Next.js can query job metadata too if needed. A Prisma migration (`npx prisma migrate dev`) must be run. The FK on `instance_id` can be a soft reference (no enforced FK) since instances can be deleted after a job completes.

---

### Frontend Changes

#### 1. API Service Layer

Create `frontend/src/lib/api/background-jobs.ts`:

```ts
export interface BackgroundJob {
  job_id: string;
  trigger_id: string;
  job_type: string;
  instance_id: string;
  instance_name: string;
  site_id: string;
  site_name: string;
  user_id: string;
  status: "queued" | "running" | "success" | "partial" | "failed" | "cancelled";
  progress: number;           // 0-100
  created_at: string;         // ISO timestamp
  started_at: string | null;
  finished_at: string | null;
  result: InstanceBackupResult | null;
  log: string[];
  error: string | null;
}

export interface TriggerBackupResponse {
  trigger_id: string;
  job_ids: string[];
}

export class BackgroundJobsService {
  async listJobs(opts?: { siteId?: string; triggerId?: string }): Promise<BackgroundJob[]>
  async getJob(jobId: string): Promise<BackgroundJob>
  async cancelJob(jobId: string): Promise<void>
  async downloadJobBackup(jobId: string): Promise<Blob>       // single instance
  async downloadTriggerBackup(triggerId: string): Promise<Blob> // all instances as zip
}

export const backgroundJobsService = new BackgroundJobsService();
```

#### 2. Trigger Point Change

The existing "Backup Site" button in `SiteToolsSection` must be updated:
- On click → `POST /session/sites/{site_id}/backup` → receives `{ trigger_id, job_ids }` in the `202` response.
- Show a toast notification: `"Backup started for {n} instance(s) — view progress in Management → Jobs"`.
- Do **not** block the UI or show a spinner on the button for the full duration anymore.

#### 3. Management Section — Jobs Page

The jobs UI lives as a **new navigation section** within the existing `/sites` page, not as a global overlay or a route inside the `(app)` shell (which requires an active VyOS instance connection and is unsuitable for administrative tasks like monitoring backup jobs).

##### 3a. Add "Management" to the Sites Page NavSection

In `frontend/src/app/(default)/sites/page.tsx`, extend the `NavSection` type:

```ts
// Before:
type NavSection = "sites" | "user-management" | "authentication";
// After:
type NavSection = "sites" | "user-management" | "authentication" | "management";
```

Add a new nav button in the left sidebar — styled identically to the existing "Sites", "User Management", and "Authentication" buttons — using the `Layers` or `BriefcaseBusiness` icon from `lucide-react`:

```tsx
<button
  onClick={() => setSelectedSection("management")}
  className={cn(
    "w-full text-left rounded-lg px-3 py-3 transition-all duration-200 ease-[var(--ease-out-quart)]",
    selectedSection === "management"
      ? "bg-accent text-accent-foreground shadow-sm"
      : "hover:bg-accent/50"
  )}
>
  <div className="flex items-center gap-3">
    <div className={cn("rounded-md p-1.5", selectedSection === "management" ? "bg-primary/10" : "bg-muted")}>
      <Layers className={cn("h-4 w-4", selectedSection === "management" ? "text-primary" : "text-muted-foreground")} />
    </div>
    <span className="font-medium text-sm">Management</span>
    {runningJobCount > 0 && (
      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
        {runningJobCount}
      </span>
    )}
    {selectedSection === "management" && <ChevronRight className="h-4 w-4 text-primary ml-auto" />}
  </div>
</button>
```

The `runningJobCount` badge is a live count of jobs where `status === "running"`. It uses `animate-pulse` to indicate live activity. When there are no running jobs it is hidden.

##### 3b. Management Section Main Content

When `selectedSection === "management"`, render `<ManagementView />` (a new component at `frontend/src/components/management/ManagementView.tsx`) in the main content area, exactly as `<UserManagement />` and `<AuthenticationSettings />` are rendered for their sections.

The `ManagementView` contains a tab bar at the top:

```
[Jobs]   [Audit Log (future)]   [System Health (future)]
```

The **Jobs** tab (default and only tab initially) renders `<BackgroundJobsView />`.

##### 3c. BackgroundJobsView Layout

Create `frontend/src/components/management/BackgroundJobsView.tsx`.

```
┌────────────────────────────────────────────────────────────────┐
│  Background Jobs                     [↻ Refresh]  [Filter ▾]  │
├──────────────────────┬─────────────────────────────────────────┤
│  Filter by site:     │  [All Sites ▾]                          │
│  Status filter:      │  [All]  [Running]  [Completed]  [Failed] │
├──────────────────────┴─────────────────────────────────────────┤
│                                                                  │
│  ── Trigger: Site Backup — prod-site  (started 3 min ago) ──   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  router-01   prod-site   [RUNNING]  ████████░░  80%      │  │
│  │  Started 3 min ago                    [▸ Logs] [■ Cancel]│  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  router-02   prod-site   [SUCCESS]  ██████████ 100%      │  │
│  │  Finished 2 min ago                 [↓ Download] [▸ Logs]│  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  router-03   prod-site   [FAILED]   ██░░░░░░░░  20%      │  │
│  │  Failed 1 min ago — SSH timeout     [▸ Logs]             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ── Trigger: Site Backup — lab-site  (finished 1 hr ago) ──    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  lab-router-01  lab-site  [SUCCESS]  ████████████  100%  │  │
│  │  Finished 1 hr ago                  [↓ Download] [▸ Logs]│  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Jobs are kept for 24 hours                                     │
└────────────────────────────────────────────────────────────────┘
```

**Key UI behaviours:**
- Jobs are grouped visually by `trigger_id` under a section header showing the trigger's site name and when it was started.
- Within a trigger group, jobs are sorted by `instance_name` alphabetically.
- Across trigger groups, groups are sorted by the most recent `created_at` descending.
- Each instance job card shows: instance name, site name, status badge, progress bar, elapsed/finished time, and action buttons.
- The filter dropdown lets the user filter to a specific site using a `<Select>` populated from the unique `site_name` values in the jobs list.
- The status filter tabs narrow to `running`, `success/partial`, or `failed/cancelled` jobs. The badge count on the "Running" tab updates live.

**Polling strategy:** Use a custom hook `useJobPolling(pollIntervalMs = 2500)` that calls `backgroundJobsService.listJobs()` on an interval whenever the Management section is active AND there are running jobs in the list. Stop polling when all visible jobs reach a terminal state (`success`, `failed`, `cancelled`). This avoids constant network traffic when idle.

> **Oversight — SSE alternative**: Rather than polling, consider a SSE endpoint `GET /session/jobs/events` that streams `text/event-stream` with `data: {job_id, field, value}\n\n` for each field change. This matches the existing SSE pattern used by the dashboard (`useDashboardSSE`). This is strictly better UX but adds implementation complexity; polling is a safe first iteration.

**Log expansion:** Clicking "Expand Logs" on a job card expands an inline collapsible panel (not a modal) below the card showing a scrollable, monospace log view. Each log entry is timestamped and colour-coded: info = muted white, success = green, warning = yellow, error = red.

**Download actions:**
- "↓ Download" on an individual instance job card → calls `backgroundJobsService.downloadJobBackup(jobId)` → triggers a browser download of `backup_{instance_name}_{timestamp}.json`.
- A "↓ Download All" button on the trigger group header (only when all jobs in the group are complete) → calls `downloadTriggerBackup(triggerId)` → triggers a zip download of all instance backups in the group.

#### 4. No Global Top-Bar Integration Required

The Management section in the `/sites` page sidebar is the **sole** entry point for the jobs UI. There is no floating badge, sheet, or indicator in the `(app)` shell top bar. This is intentional: the `(app)` shell is scoped to a single active VyOS instance, while backup jobs are cross-instance administrative operations. Mixing the two concerns would be confusing.

> **Rationale**: The `/sites` page already serves as the administrative hub of VyManager (it hosts User Management, Authentication Settings, and Site/Instance management). Adding Management here keeps all cross-instance administrative tools in one consistent place.

#### 5. RBAC Consideration

The Management → Jobs view should only show jobs belonging to the current user — unless the user is a platform ADMIN, in which case all jobs across all users and sites are visible (useful for ops teams monitoring shared infrastructure). This is enforced by the `GET /session/jobs/` backend endpoint based on `user.role`.

---

---

## Feature 2: Container Backup with Full Redeploy State

### Overview

When a VyOS instance in a site has containers configured (the `container` section in the VyOS running config), the backup must capture **everything necessary to redeploy those containers to an identical running state** on a fresh VyOS instance. This is significantly more than what the current backup captures (which is only the VyOS `set` command tree — it does capture container config, but not the associated external state).

The problem: VyOS stores container *configuration* (image name, network, volumes, environment, ports) in its config tree, but the actual **image layers**, **named volume data**, and **registry credentials** may need to be captured separately. The `set` commands alone are enough to *reconfigure* containers on a VyOS that already has the images pulled — but on a fresh device, they are not enough to redeploy without network access to the original registry.

---

### What "Full Redeploy State" Means

To redeploy a container identically, you need:

| Category | What to Capture | How |
|----------|----------------|-----|
| **Container configuration** | All `set container name <n> ...` commands | Already done via `_config_to_commands` |
| **Container network config** | `set container network <n> ...` commands | Already done |
| **Registry credentials** | `set container registry <url> authentication ...` | Already captured (but password may be masked in config output) |
| **Image reference** | `image` field per container (`ContainerEntry.image`) | Already in config — but image must be pullable on restore |
| **Named volume data** | The actual file contents at the volume source path on the VyOS device | **Not captured** — needs SSH/SFTP access |
| **Image layers (air-gap)** | Docker image tar archive for offline redeploy | **Not captured** — requires `docker save`/`podman save` via SSH |
| **Runtime state** | Whether container was running or stopped at backup time | **Not captured** — available via VyOS `show container status` |

---

### Backend Implementation

#### 1. Extend `InstanceBackupResult` Model

Add a new nested model `ContainerBackupDetail`:

```python
class VolumeBackupData(BaseModel):
    volume_name: str
    source_path: str         # Path on the VyOS host
    size_bytes: Optional[int]
    data_base64: Optional[str]  # base64-encoded tar.gz of the volume's source path
    error: Optional[str]

class ContainerImageManifest(BaseModel):
    container_name: str
    image_ref: str           # e.g. "ghcr.io/foo/bar:latest"
    image_digest: Optional[str]  # sha256:... pinned digest at time of backup
    image_archive_path: Optional[str]  # Path to exported .tar on VyManager server (for air-gap)
    error: Optional[str]

class ContainerRuntimeStatus(BaseModel):
    container_name: str
    running: bool
    exit_code: Optional[int]
    uptime_seconds: Optional[int]

class ContainerFullBackup(BaseModel):
    config_commands: str              # The set commands for this container
    volumes: list[VolumeBackupData]
    image_manifest: ContainerImageManifest
    runtime_status: Optional[ContainerRuntimeStatus]

class InstanceBackupResult(BaseModel):
    # ... (all existing fields) ...
    containers: Optional[list[ContainerFullBackup]] = None  # NEW
    container_backup_errors: list[str] = []                  # NEW
```

#### 2. SSH Access Requirement

Fetching volume data and runtime status requires **SSH access** to the VyOS device — not just the HTTP API. The VyOS REST API cannot execute arbitrary shell commands or read the filesystem.

**Options:**

a. **Use the existing terminal WebSocket** — the app already establishes SSH sessions via a backend WebSocket (`useTerminalWebSocket`). Reuse the SSH credentials used for the terminal feature.

b. **Store SSH credentials per instance** — the `Instance` model in the DB and the `instances` table currently stores `host`, `port`, `apiKey`, `protocol`, `verifySsl`, `vyosVersion`. You must add SSH credential fields:
   - `ssh_port` (default `22`)
   - `ssh_username` (e.g. `vyos`)
   - `ssh_password` (encrypted at rest) OR `ssh_key_id` (FK to a stored SSH key)

> **Oversight — Key Management**: Storing SSH passwords in plaintext in the DB is a security risk. The existing pattern wraps API keys in `_SecureStr` to prevent leakage in logs. SSH passwords must be encrypted at rest (use Fernet from `cryptography` package, with the key stored in an environment variable). Provide a migration that adds the new columns as `NULLABLE` (so existing instances without SSH config are not broken).

c. **Add SSH config to Instance settings UI** — the frontend instance creation/edit form (in `frontend/src/components/sites/`) must gain SSH credential fields. These fields should be clearly labelled as "Required for container volume backups".

#### 3. Volume Data Collection

```python
async def _backup_volumes(ssh_client, container: ContainerEntry) -> list[VolumeBackupData]:
    """For each volume with a source path, tar.gz and base64-encode the data."""
    results = []
    for vol in container.volumes:
        if not vol.source:
            continue
        try:
            # Run: tar -czf - -C /path/to/source . | base64
            stdin, stdout, stderr = ssh_client.exec_command(
                f"tar -czf - -C {shlex.quote(vol.source)} . 2>/dev/null | base64 -w 0"
            )
            data_b64 = stdout.read().decode("utf-8").strip()
            err = stderr.read().decode("utf-8").strip()
            size = len(data_b64) * 3 // 4  # approximate decoded bytes
            results.append(VolumeBackupData(
                volume_name=vol.name,
                source_path=vol.source,
                size_bytes=size,
                data_base64=data_b64 if data_b64 else None,
                error=err if err and not data_b64 else None,
            ))
        except Exception as e:
            results.append(VolumeBackupData(
                volume_name=vol.name,
                source_path=vol.source or "",
                error=str(e),
            ))
    return results
```

> **Oversight — size limits**: Volume directories can be very large (databases, etc.). Enforce a configurable max size per volume (e.g., 500 MB by default, configurable in `.env` as `CONTAINER_VOLUME_BACKUP_MAX_MB`). If the directory exceeds this limit, store the size, skip the data, and record a warning in `VolumeBackupData.error`.

#### 4. Image Digest Pinning

After connecting via SSH, run:

```bash
podman inspect <image_name> --format '{{.Digest}}'
```

This returns the `sha256:...` digest of the **exact** image layer that is running. Store this in `ContainerImageManifest.image_digest`. On restore, use `podman pull <image_ref>@sha256:<digest>` to guarantee you pull the exact same image version, not just the latest tagged version.

#### 5. Runtime Status Collection

Run via SSH:

```bash
podman ps -a --format '{"name":"{{.Names}}","status":"{{.Status}}","exitcode":{{.ExitCode}}}'
```

Parse the output to populate `ContainerRuntimeStatus`. The `"running"` field is `True` if the status string starts with `"Up"`.

#### 6. Optional: Image Export (Air-Gap Restore)

For environments without internet access on the restore target, export each image:

```bash
podman save <image_ref> | gzip | base64 -w 0
```

This can be very large (hundreds of MB per image). This should be an **opt-in** backup flag (`?include_image_archives=true`) passed to the backup endpoint, not enabled by default. The resulting base64 blobs are stored in `ContainerImageManifest.image_archive_path` — or, more practically, saved to a temporary file on the VyManager server and a download URL returned.

#### 7. Backup Sequence for Instances with Containers

When `_backup_instance` detects that the parsed config has containers (i.e., `container_config.get("name")` is non-empty), it should:

1. Attempt to open an SSH connection using the stored SSH credentials.
2. If SSH credentials are missing → skip container extended backup, append warning to log: `"SSH credentials not configured — container volume data skipped"`.
3. If SSH connection fails → append warning, continue with config-only backup.
4. Collect runtime status for all containers (one SSH call).
5. For each container, collect volume data (multiple SSH calls, rate-limit to avoid overwhelming device).
6. Collect image digests for all containers.
7. Close SSH session.
8. Populate `InstanceBackupResult.containers` list.

All of this must happen **inside** the background job coroutine so it doesn't block anything.

#### 8. Restore Tooling (New Endpoint)

The backup is only half the story. Add:
`POST /session/sites/{site_id}/instances/{instance_id}/container-restore`

Accepts the `ContainerFullBackup` payload for a single container and:

1. Applies the `config_commands` via the VyOS REST batch API (`/vyos/container/batch`).
2. If `image_archive_path` is provided (air-gap), streams the archived image to the device via SSH (`cat archive.tar.gz | base64 -d | podman load`).
3. Pushes volume data: for each `VolumeBackupData` with `data_base64`, creates the directory and extracts the tar via SSH (`echo <b64> | base64 -d | tar -xzf - -C <source_path>`).
4. If the container was `running` at backup time, issues a VyOS config command to `restart container <name>`.
5. Returns a structured result with success/failure per step.

> **Oversight — config commit required**: After applying `set` commands via VyOS REST API, VyOS requires a `commit` + `save` to make the configuration persistent. The existing `ContainerBatchBuilder` / `execute_batch` flow handles this. The restore endpoint must use the same pattern.

---

### Frontend Changes for Container Backups

#### 1. Backup Detail View

In the completed job card (in the `BackgroundJobsView`), add a "View Details" button that opens a modal showing the full `InstanceBackupResult` for that specific router. Since jobs are now per-instance, each job card directly represents one router — no need for a sub-list of instances inside the card. For an instance that had containers, the detail modal shows:

```
Instance Backup — router-01 (prod-site)  [SUCCESS]
  ✓ VyOS config captured — 1,247 set commands
  Containers (3):
  ├── nginx       ✓ config  ✓ image digest pinned  ✓ /data/nginx (12 MB)   [Running]
  ├── prometheus  ✓ config  ✓ image digest pinned  ✗ volume too large      [Running]
  └── grafana     ✓ config  ✗ SSH unreachable       —                       [Stopped]
```

Each row uses a colour-coded status badge and an expand arrow to reveal the raw `set` commands for that container.

#### 2. Restore UI

Add a "Restore Container" button per container row in the detail view. Clicking it opens a wizard:
- **Step 1**: Select the target instance (dropdown of available instances in the site).
- **Step 2**: Confirm what will be restored (config, volumes, image archive if available).
- **Step 3**: Confirm and execute (calls the restore endpoint, shows a progress indicator).

#### 3. SSH Credential UI

In `frontend/src/components/sites/` (the instance edit panel), add a collapsible "SSH Access" section:
- SSH Port (number input, default `22`)
- SSH Username (text input)
- SSH Authentication: radio between "Password" and "Private Key"
  - Password: password input (sent to backend, stored encrypted)
  - Private Key: textarea for PEM content OR file upload
- A "Test SSH Connection" button that calls a new `GET /session/sites/{site_id}/instances/{instance_id}/test-ssh` endpoint and returns a toast with success/failure.

---

### Shared Considerations & Oversights

#### Security
- **Registry passwords** in the VyOS config output are often masked/redacted by VyOS. The backup may not capture actual registry passwords. Document this limitation clearly.
- **SSH private keys** stored in the DB must be encrypted with the same Fernet key as SSH passwords. Never log them.
- **Backup files** (downloaded JSON) may contain sensitive credentials or volume data. The download endpoint must validate session ownership before serving.

#### RBAC
- Only platform ADMIN users can trigger a site backup (already enforced).
- Container restore should also require ADMIN or a new `container:restore` feature permission via the existing `UserFeaturePermission` RBAC system.

#### Error Handling & Partial Success
- The backup should never fully fail because one container or one volume had an error. Use per-item error fields and a top-level status of `"partial"` when some succeeded and some failed.
- All errors must be human-readable and included in the job log (not just in structured data).

#### Testing
- Unit-test `_config_to_commands` with containers that have volumes, ports, environment vars to ensure round-trip fidelity.
- Integration test the job lifecycle: create → running → success → download.
- Mock SSH connections in tests using `unittest.mock.patch` on `paramiko.SSHClient`.
- Add a Playwright/Cypress E2E test for the Jobs panel polling behaviour.

#### VyOS Version Compatibility
- Container support in VyOS is available in `1.4+`. The backup code must check `instance.vyos_version` and skip the `ContainerFullBackup` enrichment for instances running `1.3.x` or earlier.
- `podman save`/`podman inspect` syntax may differ between VyOS 1.4 (OCI runtime v1) and 1.5 (newer Podman). Test against both.