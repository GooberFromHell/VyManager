# Discovery Report — Simplified Router Onboarding

**Index tier:** TIER 1 (cached)
**Project index:** `.derpo/` (commit: 536af59)

## Project Patterns
See `.derpo/architecture.md` for full backend/frontend/RBAC patterns.

## Goal-Specific Research

### Current Provisioning Gaps
The current `provisioning.py` uses `asyncssh` and VyOS's Python ConfigSession API. It runs a **single monolithic command** with no step-by-step progress. It's also missing three VyOS configuration commands:
- `set service https listen-address 0.0.0.0` (listen on all interfaces)
- `set service https api rest` (enable REST API)
- `set service https api graphql` (enable GraphQL)

### VyOS CLI Commands Required
```
configure
set service https listen-address 0.0.0.0
set service https api keys id vymanager key <random_key>
set service https api rest
set service https api graphql
set system login user <user> authentication public-keys vymanager type ssh-ed25519
set system login user <user> authentication public-keys vymanager key <base64>
commit
save
exit
```

### Existing SSE Pattern (Backend)
`backend/routers/show.py:962-1003`: Uses `StreamingResponse` + async generator with `text/event-stream`. Events use `event: <type>\ndata: <json>\n\n` format.

### Existing SSE Pattern (Frontend)
`frontend/src/hooks/useDashboardSSE.ts`: Native `EventSource` API, connects through `/api/vyos/show/stream` proxy, registers per-event-type listeners.

### SSH Library
Current: `asyncssh==2.22.0`. User requests `paramiko` instead.

### Current CreateInstanceModal
3-tab form with 16+ state fields. Auto-provisioning hidden in a collapsible section. User wants this dramatically simplified.

## Gaps
1. No step-by-step provisioning progress (current is all-or-nothing)
2. Missing VyOS commands for REST/GraphQL/listen-address
3. No VyOS version auto-detection during provisioning
4. Form is too complex — needs simplification to 5 fields
