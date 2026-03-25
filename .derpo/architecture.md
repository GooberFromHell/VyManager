# VyManager — Project Architecture Reference

> Persistent project-level patterns. Loaded by DERPO instead of re-discovering each run.
> Only update this file when architectural patterns change (rare).

---

## Backend Three-Layer Architecture

Every VyOS feature follows: **Router → Builder → Mapper → pyvyos SDK**

### Mapper (`backend/vyos_mappers/{feature}/`)
- Extends `BaseFeatureMapper(ABC)` from `backend/vyos_mappers/base.py`
- `__init__` selects version-specific mapper based on version string
- Methods return `List[str]` representing VyOS CLI command path segments
- Paired methods: `get_X(value)` for set operations, `get_X_path(value)` for delete operations
- Version-specific features use `hasattr(self.version_mapper, ...)` delegation, returning `[]` if unsupported
- Registered via `CommandMapperRegistry.register_feature("name", factory_fn)` in `vyos_mappers/__init__.py`

### Version Overrides (`backend/vyos_mappers/{feature}/{feature}_versions/`)
- `__init__.py` — Factory function + `__all__` exports
- `v1_4.py` — Returns `False` for v1.5-only capability checks, minimal overrides
- `v1_5.py` — Full feature set implementation, extends v1.4 with additional methods

### Builder (`backend/vyos_builders/{feature}/`)
- `__init__(version: str)`: Gets mappers via `CommandMapperRegistry.get_all_mappers(version)`, stores `mapper_key`
- Internal methods (blocked from batch API): `add_set`, `add_delete`, `clear`, `get_operations`, `is_empty`, `operation_count`, `get_capabilities`
- Feature methods call mapper getters, delegate to `add_set`/`add_delete`, return `self` for chaining
- Empty paths from unsupported version features are silently skipped
- `get_capabilities()` returns version, feature flags, and field-level `supported`/`description` dicts
- Exported in `backend/vyos_builders/__init__.py`

### Router (`backend/routers/{feature}/`)
- FastAPI `APIRouter(prefix="/vyos/{feature}", tags=["{feature}"])`
- `_INTERNAL_BUILDER_METHODS` frozenset blocks internal methods from batch endpoint
- Three standard endpoints:
  - `GET /capabilities` → `require_read_permission` → build builder → return capabilities
  - `GET /config` → `require_read_permission` → `service.get_full_config()` → parse and return typed response
  - `POST /batch` → `require_write_permission` → `ensure_snapshot_before_change()` → build builder → iterate operations → `inspect.signature()` for dynamic dispatch → `execute_batch()` → return VyOSResponse
- Pydantic models defined inline: ConfigResponse, BatchOperation, BatchRequest, VyOSResponse
- Included in `backend/app.py` via `app.include_router()`

---

## RBAC System

- `FeatureGroup` enum in both `backend/rbac_permissions.py` AND `frontend/src/lib/api/user-management.ts` (must stay in sync)
- `BUILT_IN_PERMISSIONS` dict: ADMIN=WRITE, OPERATOR=WRITE, VIEWER=READ per feature
- Hierarchical: parent groups (e.g., ROUTING) contain child groups (e.g., BGP, OSPF)
- `require_read_permission(request, FeatureGroup.X)` / `require_write_permission(request, FeatureGroup.X)` in routers
- Frontend: `usePermissions()` hook → `canRead(FeatureGroup.X)` / `canWrite(FeatureGroup.X)`
- When adding a new feature: add to both enums, update `BUILT_IN_PERMISSIONS`, update `get_user_permissions()` function lists

---

## Frontend Architecture

### Request Flow
```
Browser → Next.js API Routes → catch-all proxy (src/app/api/vyos/[...path]/route.ts) → FastAPI Backend
```
- Proxy forwards `better-auth.session_token` cookie for auth
- SSE responses streamed with `X-Accel-Buffering: no`
- No per-feature API routes needed — catch-all handles all `/vyos/*` paths

### API Client (`frontend/src/lib/api/client.ts`)
- Singleton `apiClient` that resolves to `/api` in browser, `BACKEND_URL` on server

### API Service Pattern (`frontend/src/lib/api/{feature}.ts`)
- Class-based singleton with standard methods:
  - `getCapabilities()` → `apiClient.get<Capabilities>("/vyos/{feature}/capabilities")`
  - `getConfig()` → `apiClient.get<Config>("/vyos/{feature}/config")`
  - `batchConfigure(request)` → `apiClient.post<VyOSResponse>("/vyos/{feature}/batch", request)`
  - `refreshConfig()` → `apiClient.post("/vyos/config/refresh")`
- Additional CRUD convenience methods (create/update/delete) that build batch operations internally
- Exported as `const featureService = new FeatureService()`

### Type Pattern (`frontend/src/lib/api/types/{feature}.ts`)
- Config interface (mirrors backend response)
- Capabilities interface with `fields: { [key]: { supported: boolean; description: string } }`
- BatchOperation interface: `{ op: string; value?: string }`
- BatchRequest interface: feature-specific fields + `operations: BatchOperation[]`

### Page Pattern (`frontend/src/app/(default)/(app)/.../page.tsx`)
- `"use client"` directive
- State: config, capabilities, loading, error, modal open states
- `loadData` via `useCallback` with `Promise.all([getConfig(), getCapabilities()])`
- `useEffect(() => { loadData() }, [loadData])`
- Render: loading spinner → error card → empty state → populated view
- Permission-gated action buttons via `usePermissions()`
- PageHeader with title, description, action buttons
- Modals receive `open`, `onOpenChange`, `onSuccess={loadData}`, `capabilities`

### Component/Modal Pattern (`frontend/src/components/{feature}/`)
- One modal per action (Create, Edit, Delete)
- Props: `open`, `onOpenChange`, `onSuccess`, plus feature-specific data and `capabilities`
- State: form fields + `loading` + `error`
- `resetForm()` clears all state, called on close
- `handleSubmit`: validate → build operations array (capability-aware) → call service → refreshConfig → onSuccess
- UI: Dialog → DialogContent → DialogHeader → form fieldsets → error display → DialogFooter (Cancel + Submit)
- Capability checks: `capabilities?.fields.fieldName.supported` conditionally renders fields

### Services Layout (`frontend/src/app/(default)/(app)/system/services/layout.tsx`)
- SplitLayout with sidebar navigation (320px) and content area
- `allServices` array defines entries: `{ id, name, description, icon, href, permission }`
- Sidebar filters entries by user permissions

---

## SSH Provisioning Pattern (Instance Bootstrap)

Separate from the standard three-layer pattern. Used for bootstrapping VyOS devices before the HTTP API is available.

### Provisioning Module (`backend/provisioning.py`)
- Standalone async module, NOT a router/builder/mapper
- `provision_vyos_device()` — connects via `asyncssh` with **password auth** (not keypair)
- Executes a single `vbash` configure-mode script on the VyOS device:
  - Sets API key: `set service https api keys id <name> key <value>`
  - Deploys SSH public key: `set system login user <user> authentication public-keys <name> type/key ...`
  - Commits and saves
- Returns `ProvisioningResult` dataclass with step-by-step success/failure flags
- API key generated via `secrets.token_urlsafe(32)`
- SSH keypair generated via existing `ssh_key_manager.generate_keypair()`
- SSH credentials (username/password) are **never persisted** — used transiently then discarded

### Integration Points
- **Session router** (`backend/routers/session/session.py`):
  - `InstanceCreateRequest.api_key` is now `Optional` — auto-generated when provisioning credentials provided
  - `provision_ssh_username` / `provision_ssh_password` optional fields trigger provisioning after DB insert
  - `POST /session/instances/{id}/provision` — standalone re-provisioning endpoint for existing instances
  - Provisioning failure never blocks instance creation (best-effort with error feedback)
- **Frontend** (`CreateInstanceModal.tsx`):
  - Collapsible "Auto-Provisioning" section in Connection tab
  - Conditional API Key validation (required only when provisioning disabled)
  - Provisioning result display (success/partial/failure)
- **Frontend API** (`session.ts`):
  - `ProvisioningResult` type, `provisionInstance()` method

### Key Difference from Feature Pattern
- Does NOT use the mapper/builder/router pipeline — runs raw CLI commands over SSH
- Does NOT require a connected VyOS instance (it IS the connection bootstrap)
- Does NOT have its own FeatureGroup — inherits site ADMIN permission from instance management
- VyOS CLI commands are identical across v1.4 and v1.5 — no version-specific handling needed

---

## Middleware Chain

Added in reverse order in `app.py` (Starlette bottom-up):
`CORS → AuthenticationMiddleware → SessionMiddleware`

- `middleware/auth.py`: Validates better-auth session tokens (signed cookies) against PostgreSQL
- `middleware/session.py`: Resolves active VyOS instance → `request.state.instance`
- `require_active_instance(request)` enforces connected instance before feature endpoints

---

## Key Shared Dependencies

| Dependency | Location | Purpose |
|------------|----------|---------|
| `CommandMapperRegistry` | `backend/vyos_mappers/base.py` | Factory for version-specific mappers |
| `BaseFeatureMapper` | `backend/vyos_mappers/base.py` | ABC for all mappers |
| `FeatureGroup` enum | `backend/rbac_permissions.py` + `frontend/src/lib/api/user-management.ts` | Permission groups (must stay in sync) |
| `ensure_snapshot_before_change()` | `backend/routers/` (imported) | Pre-mutation safety snapshot |
| `get_session_vyos_service()` | `backend/session_vyos_service.py` | Gets VyOS connection from request state |
| `apiClient` | `frontend/src/lib/api/client.ts` | Singleton HTTP client |
| `usePermissions()` | `frontend/src/hooks/usePermissions.ts` | RBAC hook for UI gating |
| `PageHeader` | `frontend/src/components/ui/page-header.tsx` | Standard page header component |
| `Fieldset` | `frontend/src/components/ui/fieldset.tsx` | Form section grouping component |
