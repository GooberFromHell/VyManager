# Decision Document — Auto-Provisioning of VyOS Router Instances

## Approach Summary

Auto-provisioning adds an optional "Auto-Provisioning" path to instance creation that SSHes into a VyOS device using temporary username/password credentials, then provisions the HTTP API key and SSH public key in a single configure-mode session. The provisioning logic lives in a new standalone backend module (`backend/provisioning.py`) called by an extended endpoint on the session router. The frontend's `CreateInstanceModal` gains a collapsible "Auto-Provisioning" section in the Connection tab with SSH credential fields and a progress indicator.

The core technical approach: `asyncssh.connect()` with password auth → execute a single `vbash` configure-mode script that sets the API key, deploys the SSH public key, commits, and saves. The script runs as a single `conn.run()` call with a 30-second timeout, and stdout/stderr is parsed for success/failure indicators.

The design ensures provisioning failure never blocks instance creation. The endpoint first creates the instance in the database, then attempts provisioning. If it succeeds, the instance record is updated with the generated API key and SSH key data. If it fails, the instance still exists and the user receives a clear error explaining what went wrong.

## Key Decisions

1. **Standalone provisioning module (`backend/provisioning.py`), not a new router.** The provisioning logic is a one-shot operation, not a full feature with its own REST prefix. A single async function `provision_vyos_device()` keeps it clean. The session router gains one new endpoint for re-provisioning.

2. **Single `vbash` script execution, not interactive SSH session.** A compound configure-mode script runs as a single `conn.run()` call — more reliable than sending individual commands to an interactive PTY. The script sources VyOS environment functions, enters configure mode, runs set commands, commits, and saves.

3. **asyncssh password authentication.** The whole point is bootstrapping before keypair auth exists. asyncssh natively supports `password=` parameter. After provisioning, the password is discarded.

4. **API key generation via `secrets.token_urlsafe(32)`.** Produces a 43-character URL-safe string with 256 bits of entropy. Simple, secure, consistent with existing patterns.

5. **`api_key` field becomes `Optional[str]` on `InstanceCreateRequest`.** When auto-provisioning is enabled, API key is auto-generated. Backend validates that either `api_key` OR provisioning credentials are provided.

6. **Synchronous request with 30-second timeout.** Provisioning takes 3-8 seconds typically. No SSE/WebSocket needed — a loading spinner with descriptive message is sufficient.

7. **Do NOT configure the full HTTPS service on VyOS.** Provisioning only adds the API key. The HTTPS API service must already be running on the device. Attempting to configure the entire service (listen addresses, ports, certificates) is out of scope and risky.

8. **Collapsible section in existing Connection tab.** Not a new tab or wizard. When expanded, shows SSH username/password. When enabled, API Key becomes optional. Keeps the modal compact and the manual path unchanged.

9. **Step-by-step provisioning result.** Response includes `{ ssh_connected, api_key_provisioned, ssh_key_provisioned, committed, saved }` so the frontend can show partial success.

10. **Standalone re-provisioning endpoint.** `POST /session/instances/{instance_id}/provision` allows re-provisioning existing instances (e.g., after VyOS reinstall).

## What to Reuse

| Component | Location | How Used |
|-----------|----------|----------|
| `generate_keypair()` | `backend/ssh_key_manager.py` | SSH key generation during provisioning |
| `asyncssh.connect()` pattern | `backend/routers/monitoring/monitoring.py:440-476` | SSH connection model (use password= instead of client_keys=) |
| `vbash -ic` execution model | `backend/routers/monitoring/monitoring.py:472` | Command execution on VyOS |
| Instance DB schema | `prisma/schema.prisma` | All needed columns exist: apiKey, sshPublicKey, sshEncryptedPrivKey, sshKeyNonce, sshKeyConfigured |
| `Collapsible` UI component | `frontend/src/components/ui/collapsible.tsx` | Expandable provisioning section |
| `Fieldset` UI component | `frontend/src/components/ui/fieldset.tsx` | Form layout for provisioning fields |
| `secrets` module | Already imported in session router | API key generation |

## What to Build

### Backend
1. **`backend/provisioning.py`** — New module:
   - `ProvisioningResult` dataclass with step-by-step status
   - `provision_vyos_device()` async function — core provisioning logic
   - Configure-mode script builder with proper escaping
   - Output parser for commit success/failure

2. **Extended session router** (`backend/routers/session/session.py`):
   - `api_key` becomes optional on `InstanceCreateRequest`
   - New optional fields: `provision_ssh_username`, `provision_ssh_password`
   - Validation: either api_key OR provisioning credentials required
   - Modified `create_instance()`: calls provisioning after DB insert if credentials provided
   - New `POST /session/instances/{instance_id}/provision` endpoint

### Frontend
3. **Extended CreateInstanceModal** (`frontend/src/components/sites/CreateInstanceModal.tsx`):
   - Collapsible auto-provisioning section with SSH username/password fields
   - Conditional API Key validation
   - Provisioning-in-progress loading state
   - Provisioning result display (success/partial/failure)

4. **Extended API types** (`frontend/src/lib/api/` or inline):
   - `api_key` optional on instance create request
   - Provisioning fields on request
   - `ProvisioningResult` type on response

## What NOT to Do

- **Do NOT persist SSH username/password.** Used transiently, discarded after provisioning.
- **Do NOT configure `service https` from scratch.** Only add the API key to an existing HTTPS service.
- **Do NOT use SSE/WebSocket for provisioning.** Synchronous POST is sufficient for a 3-8 second operation.
- **Do NOT make provisioning a blocking prerequisite.** Instance is always created first; provisioning is best-effort.
- **Do NOT create version-specific mappers.** Provisioning runs raw CLI over SSH, not through the mapper pipeline. The commands are identical across VyOS 1.4 and 1.5.
- **Do NOT add new FeatureGroup permissions.** Instance creation already requires site ADMIN role.
- **Do NOT verify API key works via HTTP after provisioning.** Parse commit output instead.

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| VyOS configure-mode script may fail in edge cases (concurrent configure sessions, etc.) | Medium | Error checking per command, comprehensive timeout, detailed output parsing |
| SSH password auth may be disabled on the device | Low | Clear error message suggesting `disable-password-authentication` setting |
| API key field becoming optional could break CSV import or other flows | Low | Validate either api_key OR provisioning credentials; field is only optional with provisioning |
| Request timeout while VyOS actually committed changes | Low | API key generated before SSH call; DB updated only on confirmed success |
| SSH host key verification disabled | Low | Consistent with all other SSH in codebase; acceptable for internal network tool |

## Task Outline

1. **Backend Provisioning Module** — Create `backend/provisioning.py` with core provisioning logic
2. **Backend Session Router Changes** — Extend instance creation endpoint + add standalone provision endpoint
3. **Frontend API Types** — Extend request/response types for provisioning
4. **Frontend CreateInstanceModal** — Add auto-provisioning UI section
5. **Validation & Testing** — Type checking, linting, edge case verification
