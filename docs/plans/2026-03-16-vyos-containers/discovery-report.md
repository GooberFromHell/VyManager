# Discovery Report — VyOS Container Management

## Existing Patterns

### Backend Three-Layer Architecture
Every VyOS feature follows: **Router → Builder → Mapper → pyvyos SDK**

1. **Mapper** (`backend/vyos_mappers/{feature}/`): Returns VyOS CLI command paths as `List[str]`. Base class = v1.5 features, version-specific subclasses override for v1.4. Registered via `CommandMapperRegistry.register_feature()`.

2. **Builder** (`backend/vyos_builders/{feature}/`): Wraps mapper, accumulates `_operations` list of set/delete commands. All methods return `self` for chaining. Exposes `get_capabilities()`. Core methods (`add_set`, `add_delete`, `get_operations`, `is_empty`, `operation_count`, `clear`) are blocked from batch API.

3. **Router** (`backend/routers/{feature}/`): FastAPI `APIRouter` with 3 standard endpoints:
   - `GET /capabilities` — version-aware feature flags
   - `GET /config` — parsed VyOS config
   - `POST /batch` — executes batch operations via builder
   - All endpoints use `require_read_permission` / `require_write_permission` with `FeatureGroup`

### Frontend Patterns
- **Types** (`frontend/src/lib/api/types/{service}.ts`): Config, Capabilities, BatchOperation, BatchRequest interfaces
- **API Service** (`frontend/src/lib/api/{service}.ts`): Singleton class with `getCapabilities()`, `getConfig()`, `batchConfigure()`, `refreshConfig()`
- **Page** (`frontend/src/app/(default)/(app)/system/services/{service}/page.tsx`): Client component, loads config+capabilities, renders tables/cards, permission-gated actions
- **Components** (`frontend/src/components/services/{service}/`): Create/Edit/Delete modals using Dialog, Fieldset, FormField, capability-aware field rendering
- **Services Layout** (`frontend/src/app/(default)/(app)/system/services/layout.tsx`): SplitLayout with sidebar nav, `allServices` array defines entries

### RBAC Pattern
- `FeatureGroup` enum in both `backend/rbac_permissions.py` and `frontend/src/lib/api/user-management.ts` (must stay in sync)
- `BUILT_IN_PERMISSIONS` dict grants ADMIN=WRITE, OPERATOR=WRITE, VIEWER=READ per feature
- Also update `get_user_permissions()` function lists

## VyOS Container CLI Command Tree

### Container Name Configuration
```
set container name <name> image <image>
set container name <name> entrypoint <entrypoint>
set container name <name> command <command>
set container name <name> arguments <arguments>
set container name <name> host-name <hostname>
set container name <name> description <text>
set container name <name> disable
set container name <name> allow-host-pid
set container name <name> allow-host-networks
set container name <name> network <networkname>
set container name <name> network <networkname> address <address>
set container name <name> name-server <address>
set container name <name> port <portname> source <port>
set container name <name> port <portname> destination <port>
set container name <name> port <portname> protocol [tcp|udp]
set container name <name> volume <volumename> source <path>
set container name <name> volume <volumename> destination <path>
set container name <name> volume <volumename> mode [ro|rw]
set container name <name> environment <key> value <value>
set container name <name> uid <number>
set container name <name> gid <number>
set container name <name> restart [no|on-failure|always]
set container name <name> cpu-quota <percentage>
set container name <name> memory <megabytes>
set container name <name> device <devicename> source <path>
set container name <name> device <devicename> destination <path>
set container name <name> capability <text>
set container name <name> label <label> value <value>
set container name <name> sysctl parameter <parameter> value <value>
set container name <name> log-driver [k8s-file|journald|none]
```

### Container Network Configuration
```
set container network <name> description <text>
set container network <name> prefix <ipv4|ipv6>
set container network <name> mtu <number>
set container network <name> no-name-server
set container network <name> vrf <name>
```

### Container Registry Configuration
```
set container registry <name> authentication username <username>
set container registry <name> authentication password <password>
set container registry <name> disable
set container registry <name> insecure
```

### Version Differences (v1.4 vs v1.5)
- **v1.4**: `cap-add <capability>` → **v1.5**: `capability <text>`
- **v1.5 only**: health-check, tmpfs, log-driver, sysctl, network no-name-server, registry mirror

## Relevant Files (Reference Implementations)

### Backend
- `backend/vyos_mappers/base.py` — BaseFeatureMapper
- `backend/vyos_mappers/ntp/ntp.py` — Simple service mapper (~150 lines)
- `backend/vyos_builders/ntp/ntp.py` — Simple service builder (~235 lines)
- `backend/routers/ntp/ntp.py` — Simple service router (~287 lines)
- `backend/vyos_mappers/__init__.py` — Mapper registration
- `backend/vyos_builders/__init__.py` — Builder exports
- `backend/app.py` — Router inclusion
- `backend/rbac_permissions.py` — FeatureGroup + role permissions

### Frontend
- `frontend/src/lib/api/types/ssh.ts` — Reference types
- `frontend/src/lib/api/ntp.ts` — Reference API service
- `frontend/src/app/(default)/(app)/system/services/ntp/page.tsx` — Reference page
- `frontend/src/components/services/ntp/` — Reference components
- `frontend/src/app/(default)/(app)/system/services/layout.tsx` — Services nav
- `frontend/src/lib/api/user-management.ts` — Frontend FeatureGroup enum

## Gaps
- No existing container-related code in the project
- Containers are more complex than NTP/SSH — they have sub-entities (networks, registries) and nested objects (ports, volumes, environment)
- Need to decide: single mapper/builder/router for all container features, or split per sub-entity

## Dependencies
- CommandMapperRegistry (shared)
- FeatureGroup enum (both backend and frontend)
- Services layout navigation (shared)
- `ensure_snapshot_before_change()` for write safety
- `apiClient` singleton for frontend API calls
