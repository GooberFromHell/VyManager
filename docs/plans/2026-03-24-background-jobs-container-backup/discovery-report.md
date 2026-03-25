# Discovery Report — Background Jobs + Container Backup

> Tier 1 Cached Discovery. Existing patterns: see `.derpo/architecture.md`.

---

## Goal-Specific Discoveries

### Feature 1: Background Job System

**Current backup flow** (`backend/routers/site_tools/backup.py`):
- `POST /session/sites/{site_id}/backup` — synchronous, blocks HTTP connection
- Uses `asyncio.Semaphore(5)` for concurrent per-instance backups within the request
- `_backup_instance()` connects via VyDevice, calls `retrieve_show_config()`, converts to flat `set` commands
- Returns `SiteBackupResponse` with metadata + `List[InstanceBackupResult]`
- Models: `InstanceBackupResult` (status, config, config_commands, error, backed_up_at)

**Site tools router**:
- Prefix: `/session/sites` (mounted in `app.py` line 329)
- Only has backup endpoint currently
- SiteToolsSection component shows backup button + 3 disabled placeholder buttons

**App lifespan** (`backend/app.py`):
- Startup: creates asyncpg pool (min=5, max=20), starts `cleanup_inactive_sessions` task
- Shutdown: cancels cleanup task, closes pool
- Pattern for adding background tasks at startup is established

**Sites page** (`frontend/src/app/(default)/sites/page.tsx`):
- `NavSection = "sites" | "user-management" | "authentication"`
- Sidebar uses conditional rendering per section
- Components: SiteToolsSection, UserManagement, AuthenticationSettings

**SiteToolsSection** (`frontend/src/components/sites/SiteToolsSection.tsx`):
- Calls `sessionService.backupSite(siteId)` → downloads ZIP via JSZip
- Currently blocks UI with loading state during backup
- Props: siteId, siteName, userRole

**Findings for implementation:**
- No background job infrastructure exists — must build from scratch
- Job router should mount at `/session/jobs` (not under `/session/sites`) per spec
- App lifespan pattern is in place for startup tasks (job pruning)
- `_backup_instance()` logic can be extracted and reused in job coroutine
- Frontend needs new "management" NavSection + components

### Feature 2: Container Backup Enhancement

**SSH infrastructure already exists:**
- Instance model has: `sshPort`, `sshUsername`, `sshPublicKey`, `sshEncryptedPrivKey`, `sshKeyNonce`, `sshKeyConfigured`
- AES-256-GCM encryption via `ssh_key_manager.py` (decrypt_private_key, generate_keypair)
- Terminal uses `asyncssh.connect()` with Ed25519 private key from encrypted storage
- **No SSH password field on Instance** — only keypair-based auth

**Key insight: SSH auth already solved for provisioned instances**
- Any instance that went through provisioning has SSH keys configured
- The existing `asyncssh` + `decrypt_private_key()` pattern can be reused directly
- No need to add SSH password storage for container backup IF instances are provisioned
- Spec mentions SSH password option — this is only needed for un-provisioned instances
- Decision needed: require provisioning for container backup, or add password support?

**Container mapper/builder/router complete:**
- `ContainerEntry` model has: name, image, networks, ports, volumes, environment, labels, devices, capabilities, restart, memory, etc.
- Volume model has `source` (host path), `destination` (container path), and `mode` (rw/ro)
- Container networks and registries fully modeled
- `_config_to_commands()` handles containers as generic config

**Container config parsing** (`container router`):
- Full JSON config → structured `ContainerConfigResponse` with containers, networks, registries
- Parsing handles nested dicts and flexible data types

**Gaps for container backup:**
- No volume data capture (paths only, not file content)
- No image digest pinning
- No runtime status collection
- No restore endpoint
- No container-specific backup models (VolumeBackupData, ContainerFullBackup, etc.)

**SSH connection pattern to reuse** (from terminal router):
```python
# Decrypt stored key
key_pem = ssh_key_manager.decrypt_private_key(encrypted_b64, nonce_b64)
key = asyncssh.import_private_key(key_pem)
# Connect
conn = await asyncssh.connect(host, port=ssh_port, username=ssh_username,
                               client_keys=[key], known_hosts=None)
```

### Database Schema

**Existing Prisma Instance model already has SSH fields** — no schema changes needed for SSH credentials.

**New table needed:** `background_jobs` for job persistence (spec says in-memory first, DB later, but spec also says "persist rows in PostgreSQL" is preferred). Decision: start with DB persistence since Prisma migration is straightforward.

### Frontend API Patterns

**Session service** (`frontend/src/lib/api/session.ts`):
- `backupSite(siteId)` → `apiClient.post<SiteBackupResponse>(...)`
- Instance type already includes SSH fields (sshPort, sshUsername, sshKeyConfigured)
- `ProvisioningResult` type exists with step-by-step results

---

## Reference Implementations

| Domain | Reference Feature | Files |
|--------|------------------|-------|
| Backend service | NTP (mapper/builder/router) | See `.derpo/feature-registry.yaml` |
| Frontend service | DNS Forwarding (types/service/page/modals) | See `.derpo/feature-registry.yaml` |
| Background task | `cleanup_inactive_sessions` in `app.py` | Startup asyncio task pattern |
| SSH connection | Terminal WebSocket router | `backend/routers/terminal/terminal.py` |
| Backup | Site tools backup | `backend/routers/site_tools/backup.py` |
| Encrypted storage | SSH key manager | `backend/ssh_key_manager.py` |

---

## Open Decisions

1. **In-memory vs DB for jobs:** Spec says in-memory is OK for first pass, but also says DB is preferred. Recommend: **DB persistence** — Prisma migration is trivial and prevents data loss on restart.
2. **SSH password storage for container backup:** Existing instances may not have SSH keys configured. Options: (a) require provisioning first, (b) add SSH password field. Recommend: (a) require `sshKeyConfigured` and show warning if not.
3. **Polling vs SSE for job updates:** Spec says polling is OK first. Existing SSE pattern in dashboard could be reused. Recommend: **polling first** per spec.
4. **Air-gap image export:** Spec says opt-in flag `?include_image_archives=true`. Recommend: defer to future iteration — focus on config + volumes + digests.
