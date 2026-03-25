# Discovery Report — SSH Terminal

## Existing Patterns

### Backend SSH Infrastructure (ALREADY EXISTS)
- **asyncssh 2.22.0** already in `backend/requirements.txt`
- **SSH key management** (`backend/ssh_key_manager.py`): Ed25519 keypair generation, AES-256-GCM encryption at rest
- **WebSocket-to-SSH bridge** (`backend/routers/monitoring/monitoring.py`): Complete pattern at lines 322-571
  - Cookie-based WebSocket auth (validates `better-auth.session_token`)
  - SSH connection via `asyncssh.connect()` using encrypted keys from DB
  - Output streaming in 4KB chunks
  - Session tracking via `_active_sessions` dict
  - Cleanup on disconnect, idle timeout (300s), max duration (1800s)
- **Monitoring uses `create_process()`** — runs single commands, NOT an interactive shell
- For terminal we need **`create_session()` with PTY** — interactive shell with bidirectional I/O

### Frontend WebSocket Pattern
- **useMonitoringWebSocket hook** (`frontend/src/hooks/useMonitoringWebSocket.ts`): Full WebSocket lifecycle management
- **WebSocket URL**: Direct connection to backend (bypasses Next.js proxy): `ws://hostname:8000/vyos/monitoring/ws/monitor`
- **URL config**: `NEXT_PUBLIC_WS_URL` env var or auto-detect `ws://${window.location.hostname}:8000`
- **Auth**: Browser cookies sent automatically (no explicit headers needed)
- **MonitoringTerminal component**: Display-only terminal (no xterm.js, no input), green-on-black styling
- **No xterm.js** currently installed — needs to be added

### Database Schema (SSH fields on Instance model)
- `sshPort` (Int, default 22), `sshUsername` (String?), `sshPublicKey` (Text)
- `sshEncryptedPrivKey` (Text, AES-256-GCM), `sshKeyNonce` (String), `sshKeyConfigured` (Boolean)

### RBAC
- Monitoring uses `FeatureGroup.MONITORING` with WRITE permission for WebSocket
- Existing `FeatureGroup.MONITORING` or `FeatureGroup.SSH` could gate the terminal
- `FeatureGroup.SSH` already exists in the enum (used for SSH service config)

### Navigation
- Sidebar has flat items (Monitoring, Services, System, etc.)
- Terminal could be a new top-level nav item or nested under System

## Relevant Files

### Backend
- `backend/routers/monitoring/monitoring.py` — WebSocket SSH reference (lines 322-571, 585-652)
- `backend/ssh_key_manager.py` — Key generation + decryption
- `backend/middleware/auth.py` — Auth middleware, PUBLIC_PATHS
- `backend/middleware/session.py` — Session resolution, _SecureStr
- `backend/session_vyos_service.py` — VyOS service factory
- `backend/app.py` — Router registration

### Frontend
- `frontend/src/hooks/useMonitoringWebSocket.ts` — WebSocket hook reference
- `frontend/src/lib/api/monitoring.ts` — `createMonitoringSocket()` pattern
- `frontend/src/components/monitoring/MonitoringTerminal.tsx` — Display-only terminal
- `frontend/src/store/session-store.ts` — Active instance tracking
- `frontend/src/components/layout/Sidebar.tsx` — Navigation
- `frontend/src/hooks/usePermissions.ts` — Permission checks

## Gaps
- No interactive shell endpoint (only single-command `create_process()`)
- No xterm.js or terminal emulator library installed
- No PTY resize support in current WebSocket protocol
- No bidirectional I/O (monitoring is output-only after initial command)

## Dependencies
- `asyncssh` (already installed) — for SSH connection + PTY
- `xterm` + `@xterm/addon-fit` (NEW) — frontend terminal emulator
- Existing SSH key infrastructure (no changes needed)
- Existing WebSocket auth pattern (reusable)
