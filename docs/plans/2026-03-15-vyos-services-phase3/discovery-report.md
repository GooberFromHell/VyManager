# Discovery Report — VyOS Services Phase 3

**Goal:** Implement Router Advert, TFTP Server, Broadcast Relay, and Conntrack Sync across all architecture layers.
**Explored:** 2026-03-15
**Scope:** `backend/vyos_mappers/**`, `backend/vyos_builders/**`, `backend/routers/**`, `frontend/src/lib/api/**`, `frontend/src/components/services/**`, `frontend/src/app/(default)/(app)/system/services/**`

---

## Existing Patterns

### Backend Patterns

- **Router pattern:** FastAPI `APIRouter` with `prefix="/vyos/{feature}"`, three standard endpoints (`GET /capabilities`, `GET /config`, `POST /batch`). Uses `require_read_permission()`/`require_write_permission()` with `FeatureGroup` enum. Batch endpoint uses reflection (`inspect.signature`) to call builder methods dynamically. Internal methods blocked via `_INTERNAL_BUILDER_METHODS` frozenset.
- **Builder pattern:** Class with `__init__(version: str)`, gets mappers via `CommandMapperRegistry.get_all_mappers(version)`, stores `mapper_key` string. Required methods: `add_set`, `add_delete`, `clear`, `get_operations`, `is_empty`, `operation_count`, `get_capabilities`. Feature methods return `self` for chaining. Empty paths (from unsupported version features) are silently skipped.
- **Mapper pattern:** Class extending `BaseFeatureMapper(ABC)`. `__init__` selects version-specific mapper (`version_mapper`). Methods return `List[str]` CLI paths. Paired methods: `get_X(value)` for set, `get_X_path(value)` for delete. Version-specific features delegated via `hasattr(self.version_mapper, ...)` checks, returning `[]` if unsupported.
- **Version overrides:** `_versions/` subdirectory with `v1_4.py`, `v1_5.py`, `__init__.py` factory. V1.4 returns `False` for capability checks. V1.5 implements full feature set. Factory function creates main mapper class.
- **Registration:** `CommandMapperRegistry.register_feature("name", factory_fn)` in `vyos_mappers/__init__.py`. Builder exported in `vyos_builders/__init__.py`. Router imported and included via `app.include_router()` in `app.py`.

### Frontend Patterns

- **API service pattern:** Class-based singleton with `getCapabilities()`, `getConfig()`, `batchConfigure(request)`, `refreshConfig()`. Additional CRUD methods (create/update/delete) that build batch operations internally. Uses `apiClient` from `client.ts`.
- **Type pattern:** Separate types file per service with Config, Capabilities, BatchOperation, BatchRequest interfaces. Capabilities include field-level `supported` booleans.
- **Component pattern:** Modal-per-action (Edit, Create, Delete). Props: `open`, `onOpenChange`, `onSuccess`, plus service-specific data. State: form fields + loading + error. Submit: try/catch with `service.refreshConfig()` + `onSuccess()`.
- **Page pattern:** State for config/capabilities/loading/error + modal open states. `loadData` via `useCallback` with `Promise.all([getConfig, getCapabilities])`. Loading spinner → error card → empty state → populated view. Permission-gated action buttons via `usePermissions()`.
- **Services layout:** Two-pane layout in `layout.tsx`. Left sidebar (320px) with service list filtered by permissions. Right content area. Services defined in `allServices` array with `id`, `name`, `description`, `icon`, `href`, `permission`.

---

## Relevant Files

### Backend — Reference Implementations
| File | Purpose |
|------|---------|
| `backend/vyos_mappers/base.py` | BaseFeatureMapper ABC + CommandMapperRegistry |
| `backend/vyos_mappers/dns_forwarding/dns_forwarding.py` | DNS mapper (reference) |
| `backend/vyos_mappers/dns_forwarding/dns_forwarding_versions/` | Version overrides (reference) |
| `backend/vyos_builders/dns_forwarding/dns_forwarding.py` | DNS builder (reference) |
| `backend/routers/dns_forwarding/dns_forwarding.py` | DNS router (reference) |
| `backend/vyos_mappers/ntp/ntp.py` | NTP mapper (reference) |
| `backend/vyos_builders/ntp/ntp.py` | NTP builder (reference) |
| `backend/routers/ntp/ntp.py` | NTP router (reference) |
| `backend/vyos_mappers/ssh/ssh.py` | SSH mapper (reference) |
| `backend/vyos_builders/ssh/ssh.py` | SSH builder (reference) |
| `backend/routers/ssh/ssh.py` | SSH router (reference) |
| `backend/vyos_mappers/__init__.py` | Mapper registration |
| `backend/vyos_builders/__init__.py` | Builder exports |
| `backend/app.py` | Router inclusion |
| `backend/middleware/session.py` | Instance injection + require_active_instance |
| `backend/pyvyos/core/device.py` | VyDevice SDK (configure_set, configure_delete, configure_multiple_op) |

### Frontend — Reference Implementations
| File | Purpose |
|------|---------|
| `frontend/src/lib/api/client.ts` | API client singleton |
| `frontend/src/lib/api/types/dns-forwarding.ts` | DNS types (reference) |
| `frontend/src/lib/api/dns-forwarding.ts` | DNS service (reference) |
| `frontend/src/lib/api/types/ntp.ts` | NTP types (reference) |
| `frontend/src/lib/api/ntp.ts` | NTP service (reference) |
| `frontend/src/lib/api/types/ssh.ts` | SSH types (reference) |
| `frontend/src/lib/api/ssh.ts` | SSH service (reference) |
| `frontend/src/components/services/dns-forwarding/` | DNS modals (reference) |
| `frontend/src/components/services/ntp/` | NTP modals (reference) |
| `frontend/src/components/services/ssh/` | SSH modals (reference) |
| `frontend/src/app/(default)/(app)/system/services/layout.tsx` | Services sidebar layout |
| `frontend/src/app/(default)/(app)/system/services/dns-forwarding/page.tsx` | DNS page (reference) |
| `frontend/src/app/(default)/(app)/system/services/ntp/page.tsx` | NTP page (reference) |
| `frontend/src/app/(default)/(app)/system/services/ssh/page.tsx` | SSH page (reference) |
| `frontend/src/hooks/usePermissions.ts` | Permission hook |

---

## Available APIs / Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/vyos/dns-forwarding/capabilities` | DNS feature flags |
| GET | `/vyos/dns-forwarding/config` | DNS current config |
| POST | `/vyos/dns-forwarding/batch` | DNS batch operations |
| GET | `/vyos/ntp/capabilities` | NTP feature flags |
| GET | `/vyos/ntp/config` | NTP current config |
| POST | `/vyos/ntp/batch` | NTP batch operations |
| GET | `/vyos/ssh/capabilities` | SSH feature flags |
| GET | `/vyos/ssh/config` | SSH current config |
| POST | `/vyos/ssh/batch` | SSH batch operations |

**Needed for Phase 3:** Same 3-endpoint pattern for each of: `router-advert`, `tftp-server`, `broadcast-relay`, `conntrack-sync`.

---

## UI Patterns

- **Layout:** Two-pane services view with sidebar navigation and content area
- **Data display:** Cards with Badges for scalar/list fields, Tables for collections (servers, interfaces)
- **Forms:** Modal dialogs with shadcn Dialog/Input/Checkbox/Select. List management via add/remove helpers.
- **Loading states:** Centered Loader2 spinner with animate-spin
- **Error handling:** Destructive-colored Alert with AlertCircle icon, retry button on pages, inline errors in modals
- **Capabilities:** Fields conditionally rendered based on `capabilities?.fields.fieldName.supported`
- **Permissions:** `canWrite(FeatureGroup.X)` gates edit/create/delete buttons. Layout filters sidebar items by `canRead`.

---

## Gaps

1. No backend mappers/builders/routers exist for Router Advert, TFTP, Broadcast Relay, or Conntrack Sync
2. No frontend types/services/components/pages exist for these 4 services
3. Services layout `allServices` array needs 4 new entries
4. `FeatureGroup` enum may need new entries for these services (or they may use existing groups)
5. No `register_feature()` calls for these services in `vyos_mappers/__init__.py`
6. No router inclusions in `app.py` for these services

---

## Dependencies

- `FeatureGroup` enum must include entries for each new service (check if already defined from Phase 2 planning)
- Services layout `allServices` array must be updated with new service entries
- VyOS CLI command paths must be accurate for v1.4 and v1.5 — need to verify exact paths against VyOS documentation
- pyvyos SDK is stable and requires no changes (same `configure_set`/`configure_delete`/`configure_multiple_op` interface)

---

## Reference Patterns

### Backend Router Pattern
```python
# From: backend/routers/ntp/ntp.py
router = APIRouter(prefix="/vyos/ntp", tags=["ntp"])

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities"
})

@router.get("/capabilities")
async def get_ntp_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.NTP)
    service = get_session_vyos_service(request)
    version = service.get_version()
    builder = NTPBatchBuilder(version=version)
    return builder.get_capabilities()

@router.get("/config", response_model=NTPConfigResponse)
async def get_ntp_config(request: Request, refresh: bool = False):
    await require_read_permission(request, FeatureGroup.NTP)
    service = get_session_vyos_service(request)
    full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
    # Parse and return config...

@router.post("/batch")
async def ntp_batch_configure(request: Request, body: NTPBatchRequest):
    await require_write_permission(request, FeatureGroup.NTP)
    service = get_session_vyos_service(request)
    version = service.get_version()
    instance_id = request.state.instance["id"]
    current_config = await run_in_threadpool(service.get_full_config)
    ensure_snapshot_before_change(instance_id, current_config)
    builder = NTPBatchBuilder(version=version)
    # Execute operations via reflection...
```

### Frontend API Service Pattern
```typescript
// From: frontend/src/lib/api/ntp.ts
class NTPService {
  async getCapabilities(): Promise<NTPCapabilities> {
    return apiClient.get<NTPCapabilities>("/vyos/ntp/capabilities");
  }
  async getConfig(): Promise<NTPConfig> {
    const response = await apiClient.get<{ data: NTPConfig }>("/vyos/ntp/config");
    return response.data;
  }
  async batchConfigure(request: NTPBatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/ntp/batch", request);
  }
  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.get("/vyos/ntp/config", { refresh: "true" });
  }
}
export const ntpService = new NTPService();
```

### Frontend Page Pattern
```tsx
// State management
const [config, setConfig] = useState<NTPConfig | null>(null);
const [capabilities, setCapabilities] = useState<NTPCapabilities | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Parallel data loading
const loadData = useCallback(async () => {
  try {
    const [configData, capabilitiesData] = await Promise.all([
      ntpService.getConfig(),
      ntpService.getCapabilities(),
    ]);
    setConfig(configData);
    setCapabilities(capabilitiesData);
  } catch (err) { setError(...); }
  finally { setLoading(false); }
}, []);

useEffect(() => { loadData(); }, [loadData]);
```
