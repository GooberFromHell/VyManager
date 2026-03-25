# Decision Document — SSH Terminal

## Approach Summary

Add a web-based interactive SSH terminal using a WebSocket endpoint on the FastAPI backend that bridges to an asyncssh PTY session, with xterm.js rendering on the frontend. The architecture follows the existing monitoring WebSocket pattern: cookie-based auth, SSH key decryption from the database, and session tracking. The key difference is that monitoring runs single commands with one-way output streaming, while the terminal opens a full interactive shell with bidirectional I/O and PTY resize support.

## Key Decisions

1. **New router, not extending monitoring** — The terminal is a separate `backend/routers/terminal/` router. Monitoring is 650+ lines with a specific concern (predefined commands, one-way streaming). The terminal has a fundamentally different interaction model (interactive shell, bidirectional I/O). Extract the shared `_authenticate_websocket()` helper to `backend/ws_auth.py` so both routers can use it.

2. **RBAC: Reuse `FeatureGroup.MONITORING` WRITE** — No new FeatureGroup. If you can stream live traffic, you should also be able to open a shell. Avoids Prisma migration and 6+ file changes for a new enum value. VIEWER role already has `MONITORING: NONE` which correctly blocks terminal access.

3. **Page at `/system/terminal`** — System-level tool, not a service configuration. Sidebar entry near Monitoring with `Terminal` icon.

4. **xterm.js v5** — Install `@xterm/xterm` + `@xterm/addon-fit`. Dynamic import (`ssr: false`) to avoid SSR issues and keep bundle impact isolated to the terminal page.

5. **Session limits: 10min idle, 1hr max** — More generous than monitoring (5min/30min) since interactive work takes longer. Configurable via env vars.

6. **asyncssh `create_process()` with PTY** — Call with `term_type='xterm-256color'` and `term_size=(cols, rows)` but NO command arg to open the default shell. Simpler than lower-level channel API.

7. **JSON message protocol** — Matches monitoring pattern. Client sends `input`/`resize`, server sends `ready`/`output`/`error`/`closed`.

8. **One terminal session per user** — Same constraint as monitoring. Tracked in module-level `_active_terminal_sessions` dict.

## What to Reuse

- `_authenticate_websocket()` from monitoring (extract to shared module)
- SSH key decryption (`decrypt_private_key` + `asyncssh.import_private_key`)
- Instance SSH config DB query pattern
- `FeatureGroup.MONITORING` + `check_permission()` for RBAC
- `monitoringService.getMonitoringStatus()` to check SSH readiness on terminal page
- `createMonitoringSocket()` pattern for `createTerminalSocket()`
- Cookie-based WebSocket auth (identical)

## What to Build

### Backend (4 files new, 3 modified)
- `backend/ws_auth.py` — Shared WebSocket auth utility (extracted from monitoring)
- `backend/routers/terminal/__init__.py` + `terminal.py` — WebSocket endpoint
- Modify: `backend/routers/monitoring/monitoring.py` (import shared auth)
- Modify: `backend/app.py` (register router)
- Modify: `backend/middleware/auth.py` (add to PUBLIC_PATHS)

### Frontend (4 files new, 2 modified)
- `frontend/src/lib/api/terminal.ts` — API service + types
- `frontend/src/hooks/useTerminalWebSocket.ts` — WebSocket hook
- `frontend/src/components/terminal/SSHTerminal.tsx` — xterm.js wrapper
- `frontend/src/app/(default)/(app)/system/terminal/page.tsx` — Page
- Modify: `frontend/src/components/layout/Sidebar.tsx` (nav entry)
- Modify: `frontend/package.json` (xterm packages)

## What NOT to Do

1. Do NOT create a new FeatureGroup — reuse MONITORING WRITE
2. Do NOT add audit logging of terminal content — security/privacy concern, future enhancement
3. Do NOT auto-reconnect — show a reconnect button instead (user should be aware of disconnection)
4. Do NOT buffer/record terminal history server-side
5. Do NOT support multiple concurrent terminal sessions per user

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Unrestricted shell access | Low | RBAC enforcement, SSH user is typically `vyos` with operational shell |
| Orphaned SSH sessions | Low | Idle timeout + max duration + cleanup in finally block + beforeunload |
| xterm.js bundle size (~250KB) | Low | Dynamic import, only loads on terminal page |
| WebSocket through proxies | Low | Same pattern as monitoring, already works |
| ANSI escape encoding | Low | asyncssh returns str, xterm.js interprets ANSI natively |

## Task Outline

| Phase | Tasks |
|-------|-------|
| 1: Backend | Extract ws_auth, create terminal router, register in app.py + auth.py |
| 2: Frontend Packages + API | Install xterm, create API service + types |
| 3: Frontend Hook + Component | useTerminalWebSocket hook, SSHTerminal xterm.js wrapper |
| 4: Frontend Page + Nav | Terminal page, sidebar entry |
| 5: Validation | TypeScript check, lint |
