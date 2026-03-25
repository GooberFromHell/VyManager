# Discovery Report — Auto-Provisioning of VyOS Router Instances

**Index tier:** TIER 1 (cached)
**Project index:** `.derpo/` (commit: 536af59)

## Project Patterns
See `.derpo/architecture.md` for full backend/frontend/RBAC patterns.

**Important deviation:** This goal does NOT follow the standard mapper/builder/router pattern for VyOS features. It introduces a new **provisioning/bootstrap workflow** — a backend service that uses SSH to configure a bare VyOS device before the HTTP API is available.

## Goal-Specific Research

### Current Instance Creation Flow
1. **Frontend** (`CreateInstanceModal.tsx`): Collects name, host, port, protocol, API key (REQUIRED), SSH port, SSH username, VyOS version
2. **Backend** (`POST /session/instances`): Stores all fields in DB. API key stored in plaintext. No connection test at creation time.
3. **Connection** (`POST /session/connect`): Tests API key against VyOS HTTP API. Fails if key is invalid.
4. **SSH Keys** (`POST /vyos/monitoring/instances/{id}/ssh-key/generate`): Generates Ed25519 keypair SEPARATELY, post-creation. User must manually install public key on VyOS device.

### Chicken-and-Egg Problem
- VyOS HTTP API requires a pre-configured API key on the device
- pyvyos SDK communicates via HTTP only — cannot bootstrap itself
- The only way to configure the initial API key is via SSH to the device
- Currently, users must manually SSH into VyOS, configure the API, and generate a key before they can add the router to VyManager

### VyOS CLI Commands for Provisioning
```bash
# Enable HTTP API and set API key
set service https api keys id <key-name> key <key-value>

# Deploy SSH public key for a user
set system login user <username> authentication public-keys <key-name> type ssh-ed25519
set system login user <username> authentication public-keys <key-name> key <base64-key-data>

# Commit and save
commit
save
```

### What Already Exists (Reusable)

| Component | Location | Status |
|-----------|----------|--------|
| SSH library (asyncssh 2.22.0) | `requirements.txt` | Ready |
| SSH key generation (Ed25519) | `backend/ssh_key_manager.py` | `generate_keypair()` implemented |
| SSH key encryption (AES-256-GCM) | `backend/ssh_key_manager.py` | `encrypt/decrypt_private_key()` implemented |
| SSH key DB fields | `prisma/schema.prisma` | `sshPublicKey`, `sshEncryptedPrivKey`, `sshKeyNonce`, `sshKeyConfigured` |
| VyOS public-key mapper | `backend/vyos_mappers/system/system_mapper.py:73-80` | `get_user_public_key_path()` etc. |
| VyOS public-key builder | `backend/vyos_builders/system/system_batch_builder.py:125-135` | `set_user_public_key()` etc. |
| Raw SSH execution pattern | `backend/routers/monitoring/monitoring.py` + `terminal/terminal.py` | asyncssh `create_process()` |
| API key redaction | `backend/middleware/session.py` | `_SecureStr` wrapper |

### What's Missing

| Component | Description |
|-----------|-------------|
| SSH provisioning service | Backend service that SSHes into VyOS with username/password, runs configure commands |
| API key generation | `secrets.token_urlsafe()` or similar — trivial |
| API key configuration commands | `set service https api keys id ...` — NOT in any existing mapper |
| Provisioning endpoint | New API endpoint to orchestrate the bootstrap workflow |
| Frontend provisioning UI | Optional SSH username/password fields in CreateInstanceModal |
| API key at-rest encryption | Currently stored plaintext (SSH keys are encrypted) |

### Security Considerations
- SSH username/password must NEVER be stored — used transiently during provisioning only
- Generated API key should ideally be encrypted at rest (like SSH keys) — but this is a separate concern
- asyncssh uses `known_hosts=None` (deliberate for managed infrastructure)
- VyOS configure mode requires `vbash` shell wrapping for non-interactive execution

## Reference Implementations
- **SSH key management endpoints**: `backend/routers/monitoring/monitoring.py:75-191` — closest pattern for key generation + DB storage
- **SSH command execution**: `backend/routers/monitoring/monitoring.py:322-500` — asyncssh connection pattern with username + private key
- **Instance creation**: `backend/routers/session/session.py:882-990` — current creation endpoint to extend
- **CreateInstanceModal**: `frontend/src/components/sites/CreateInstanceModal.tsx` — form to extend

## Gaps
1. No existing mechanism to SSH with username/password (all current SSH uses keypair auth)
2. No VyOS configure-mode command execution (current SSH executes operational commands only)
3. No API key VyOS configuration mapper/builder
4. CreateInstanceModal makes API key mandatory — needs to be optional when provisioning is used

## Dependencies
- asyncssh already in requirements — no new dependencies needed
- cryptography library already available for key generation
- ssh_key_manager.py provides encryption utilities
