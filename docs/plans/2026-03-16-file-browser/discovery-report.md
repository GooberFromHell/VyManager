# Discovery Report — VyOS File Browser

## Existing Patterns

### Backend Architecture
- **Three-layer pattern**: Router → Builder → Mapper → pyvyos SDK
- **Router structure**: `/capabilities`, `/config`, `/batch` endpoints per feature
- **Auth**: `require_read_permission()` / `require_write_permission()` decorators using `FeatureGroup` enum
- **Instance access**: `get_session_vyos_service(request)` returns version-aware `VyOSService`
- **Streaming**: `StreamingResponse` available for file content delivery
- **Registration**: Routers added in `app.py` via `app.include_router()`
- **RBAC**: `FeatureGroup` enum in `rbac_permissions.py`, with `ADMIN`/`OPERATOR`/`VIEWER` built-in roles
- **Admin gating**: `require_super_admin(request)` for platform-admin-only operations; instance-level admin via `check_permission()`

### Frontend Architecture
- **Pages**: Route groups `(auth)`, `(default)/(app)` with feature pages under system/services/
- **Components**: Feature-specific directories under `src/components/`, shared UI in `src/components/ui/`
- **API services**: Class-based singletons in `src/lib/api/`, one per feature domain
- **Types**: Defined in `src/lib/api/types/`, one file per feature
- **Navigation**: `Sidebar.tsx` with hierarchical NavItem entries, permission-gated rendering
- **UI library**: 37+ shadcn/ui components including breadcrumb, table, dialog, scroll-area, skeleton, empty-state, error-alert, split-layout
- **File handling precedent**: `ImportCSVModal.tsx` shows file upload via FormData + file download via Blob/URL.createObjectURL

### VyOS Communication Channels
1. **HTTP API** (via pyvyos SDK): Config save/load, image add/delete, show commands, generate commands. **No file listing or arbitrary file access.**
2. **SSH PTY** (via asyncssh): Full shell access. Used by terminal and monitoring features. Can execute `ls`, `cat`, `stat`, etc. **Most viable for file operations.**
3. **GraphQL**: Read-only dashboard data. Not relevant for file operations.

### SSH Infrastructure Already In Place
- `asyncssh` library used by terminal (`routers/terminal/terminal.py`) and monitoring (`routers/monitoring/monitoring.py`)
- SSH credentials stored encrypted in PostgreSQL, decrypted on-demand via `ssh_key_manager.py`
- Instance SSH config available from database (host, port, username, key/password)
- WebSocket-based terminal already demonstrates bidirectional SSH I/O

## Relevant Files

### Backend
| File | Purpose |
|------|---------|
| `backend/pyvyos/core/device.py` | VyDevice class — HTTP API to VyOS |
| `backend/pyvyos/core/rest_client.py` | REST client base |
| `backend/routers/terminal/terminal.py` | SSH PTY shell (asyncssh reference) |
| `backend/routers/monitoring/monitoring.py` | SSH command execution (asyncssh reference) |
| `backend/routers/ntp/ntp.py` | Simple router pattern reference |
| `backend/routers/config/config.py` | Config save/load (file path operations) |
| `backend/middleware/auth.py` | Auth middleware, PUBLIC_PATHS |
| `backend/middleware/session.py` | Session middleware, instance injection |
| `backend/rbac_permissions.py` | FeatureGroup enum, permission functions |
| `backend/session_vyos_service.py` | VyOS service getter |
| `backend/vyos_service.py` | VyOSService class |
| `backend/app.py` | Router registration |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/app/(default)/(app)/system/terminal/page.tsx` | Terminal page (complex page reference) |
| `frontend/src/app/(default)/(app)/system/services/ntp/page.tsx` | NTP page (simple page reference) |
| `frontend/src/components/layout/Sidebar.tsx` | Navigation sidebar |
| `frontend/src/components/session/ImportCSVModal.tsx` | File upload precedent |
| `frontend/src/components/ui/breadcrumb.tsx` | Breadcrumb navigation |
| `frontend/src/components/ui/table.tsx` | Table component |
| `frontend/src/components/ui/scroll-area.tsx` | Scrollable content area |
| `frontend/src/components/ui/empty-state.tsx` | Empty state display |
| `frontend/src/components/ui/split-layout.tsx` | Split panel layout |
| `frontend/src/lib/api/client.ts` | ApiClient singleton |
| `frontend/src/lib/api/monitoring.ts` | WebSocket service reference |
| `frontend/src/hooks/useTerminalWebSocket.ts` | Terminal WS hook reference |

## Gaps

1. **No file listing API**: pyvyos SDK has no `ls` or directory enumeration method. Must use SSH commands or extend the SDK.
2. **No file download API**: No way to retrieve arbitrary file content via HTTP API. Must use SSH/SFTP or encode content via SSH command output.
3. **No file upload API**: VyOS HTTP API only supports config file load (from device paths) and image add. Must use SFTP or SSH-based workaround.
4. **No `FILE_BROWSER` FeatureGroup**: Must be added to the RBAC enum.
5. **No file browser page/components**: Entirely new UI to build.
6. **No file-related API service module**: Must create `frontend/src/lib/api/file-browser.ts`.

## Dependencies

- **asyncssh**: Already a dependency (used by terminal/monitoring). Supports SFTP natively via `asyncssh.SFTPClient`.
- **SSH credentials**: Already stored and managed per-instance. Accessible from database.
- **RBAC infrastructure**: Fully established. Just needs new FeatureGroup entry.
- **Proxy route**: Catch-all proxy at `src/app/api/vyos/[...path]/route.ts` handles all `/vyos/*` paths — no per-feature route needed.
- **File streaming through proxy**: The proxy already supports streaming responses (`X-Accel-Buffering: no`). File download can use this.
