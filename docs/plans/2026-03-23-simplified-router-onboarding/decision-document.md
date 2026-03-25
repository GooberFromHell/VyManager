# Decision Document — Simplified Router Onboarding

## Approach Summary

Rewrite the instance creation + provisioning flow to be a two-phase UX: a minimal form followed by a real-time provisioning progress view. The backend uses paramiko to SSH into the router and executes VyOS CLI commands one-by-one, streaming status events to the frontend via SSE. The form is reduced to 5 essential fields.

## Key Decisions

1. **Use paramiko** (per user request) instead of asyncssh. Wrap synchronous paramiko calls in `asyncio.to_thread()` for the SSE endpoint. Use paramiko's `invoke_shell()` for an interactive configure session where commands are sent one at a time.

2. **Two-phase UX**: (1) Minimal form collects info → creates instance in DB. (2) Immediately starts SSE-streamed provisioning that shows step-by-step progress. If provisioning fails, the instance still exists and can be re-provisioned.

3. **Simplified form fields**:
   - Instance name (required)
   - Description (optional)
   - Host / IP (required)
   - SSH Username (required)
   - SSH Password (required)
   - SSH Port (default 22, advanced toggle)
   - Site ID (inherited from context)

4. **Auto-detect VyOS version**: During provisioning, run `show version` to detect 1.4 vs 1.5 and store it. Removes one field from the form.

5. **SSE provisioning endpoint**: `GET /session/instances/{id}/provision-stream?ssh_username=X&ssh_password=Y` returns an SSE stream. SSH credentials passed as query params (over HTTPS) and never stored. The endpoint creates the paramiko connection, sends commands one-by-one, and yields status events.

   Actually, better: `POST /session/instances/{id}/provision` that returns SSE. POST body contains SSH credentials (more secure than query params).

6. **Provisioning steps** (each yields an SSE event):
   - `connecting` — SSH connection to router
   - `detecting_version` — Run `show version`, parse VyOS version
   - `entering_configure` — Enter configure mode
   - `enabling_https` — `set service https listen-address 0.0.0.0`
   - `configuring_api_key` — `set service https api keys id vymanager key <random>`
   - `enabling_rest_api` — `set service https api rest`
   - `enabling_graphql` — `set service https api graphql`
   - `configuring_ssh_key` — Set SSH public key for user
   - `committing` — `commit`
   - `saving` — `save`
   - `verifying` — Test HTTPS API connectivity with the new key
   - `complete` or `failed`

7. **Defaults set automatically**: protocol=https, port=443, verify_ssl=false, is_active=true. These are stored on the instance after provisioning.

## What to Reuse
- `ssh_key_manager.generate_keypair()` for SSH key generation
- SSE pattern from `show.py` (StreamingResponse + async generator)
- Instance DB creation logic from session router
- Frontend session API types

## What to Build
- **Backend**: New `provisioning.py` using paramiko with step-by-step execution
- **Backend**: SSE provision endpoint in session router
- **Frontend**: Simplified CreateInstanceModal with provisioning progress UI
- **Frontend**: SSE client for provisioning events in session.ts

## What NOT to Do
- Don't change the EditInstanceModal (out of scope)
- Don't change the onboarding page
- Don't remove asyncssh from the project (still used by monitoring WebSocket)
- Don't add version-specific mapper handling (VyOS provisioning commands are identical across versions)

## Risk Assessment
- **paramiko in async context**: Paramiko is synchronous. Wrapping in `asyncio.to_thread()` works but means the provisioning runs in a thread. This is fine for a one-off operation.
- **VyOS CLI output parsing**: Interactive shell output can be noisy. Need robust prompt detection to know when a command finishes.

## Task Outline
1. Add paramiko to backend requirements
2. Rewrite `backend/provisioning.py` with paramiko + step-by-step yields
3. Add SSE provision endpoint to session router
4. Simplify CreateInstanceModal form + add progress UI
5. Update frontend session API types/methods
