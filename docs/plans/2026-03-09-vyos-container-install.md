# VyOS Container Installation Scripts — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Create two scripts — a bundler (dev machine) and an installer (VyOS router) — that deploy VyManager's three containers via VyOS CLI with offline support for air-gapped production environments.

**Architecture:** A two-script approach. `vyos_bundle.sh` runs on a dev machine to pull and save container images as tarballs. `vyos_install.sh` runs on the VyOS router, cleans up any broken config, optionally loads images from tarballs, configures all three containers via VyOS CLI `set container` commands with environment directives, and commits. No `.env` file mounting — all config via VyOS environment directives so it's visible in `show configuration`.

**Tech Stack:** Bash/vbash, VyOS CLI (Podman under the hood), Docker (dev machine only), SCP for transfer

**Key References:**
- `config.boot` — current running config showing existing broken containers + VyOS CLI syntax
- `docker-compose.yml` — canonical container definitions
- `backend/Dockerfile` — CMD: `uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers`
- `frontend/Dockerfile` — EXPOSE 3000, entrypoint runs prisma migrations then `npm start`
- `frontend/docker-entrypoint.sh` — needs DATABASE_URL, VYMANAGER_ENV at minimum
- `backend/app.py` — uses `os.getenv()` directly, NO python-dotenv auto-loading

**Port Mapping:**
| Container | Host Port | Container Port |
|-----------|-----------|----------------|
| vymanager-postgres | 5432 | 5432 |
| vymanager-backend | 8000 | 8000 |
| vymanager-frontend | 3001 | 3000 |

(Port 3000 occupied by Grafana with `allow-host-networks`)

---

### Task 0: Create `vyos_bundle.sh` — Offline Image Bundler

**Files:**
- Create: `container/vyos_bundle.sh`

**Context:** This script runs on a development machine with Docker installed and internet access. It pulls all three container images, saves them as `.tar` files, and packages everything needed for offline installation.

**Step 1: Write the bundle script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# VyManager — Offline Image Bundler
# ============================================================================
# Run this on a dev machine with Docker and internet access.
# It pulls images, saves them as tarballs, and creates a bundle directory
# ready to SCP to a VyOS router.
#
# Usage: ./vyos_bundle.sh [output_dir]
# ============================================================================

IMAGES=(
  "docker.io/postgres:16-alpine"
  "ghcr.io/community-vyprojects/vymanager-backend:beta"
  "ghcr.io/community-vyprojects/vymanager-frontend:beta"
)

OUTDIR="${1:-./vymanager-bundle}"

echo "=== VyManager Offline Bundler ==="
echo "Output directory: ${OUTDIR}"
mkdir -p "${OUTDIR}"

# Pull images
for img in "${IMAGES[@]}"; do
  echo ""
  echo "--- Pulling ${img} ---"
  docker pull --platform linux/amd64 "${img}"
done

# Save as tarballs
echo ""
echo "--- Saving images as tarballs ---"
docker save -o "${OUTDIR}/postgres-16-alpine.tar" "docker.io/postgres:16-alpine"
docker save -o "${OUTDIR}/vymanager-backend-beta.tar" "ghcr.io/community-vyprojects/vymanager-backend:beta"
docker save -o "${OUTDIR}/vymanager-frontend-beta.tar" "ghcr.io/community-vyprojects/vymanager-frontend:beta"

# Copy install script into bundle
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "${SCRIPT_DIR}/vyos_install.sh" "${OUTDIR}/vyos_install.sh"
chmod +x "${OUTDIR}/vyos_install.sh"

echo ""
echo "=== Bundle complete ==="
echo "Contents:"
ls -lh "${OUTDIR}"
echo ""
echo "Transfer to VyOS router:"
echo "  scp -r ${OUTDIR} vyos@<ROUTER_IP>:/tmp/vymanager-bundle"
echo ""
echo "Then on the router:"
echo "  cd /tmp/vymanager-bundle && sudo bash vyos_install.sh"
```

**Step 2: Make executable and verify syntax**

```bash
chmod +x container/vyos_bundle.sh
bash -n container/vyos_bundle.sh   # syntax check only
```

**Step 3: Commit**

```bash
git add container/vyos_bundle.sh
git commit -m "feat: add offline image bundler script for VyOS deployment"
```

---

### Task 1: Create `vyos_install.sh` — Phase 1: Header, Config Variables, and Cleanup

**Files:**
- Create: `container/vyos_install.sh`

**Context:** This is the main installation script that runs on the VyOS router. Phase 1 handles the script header with configurable variables, enters VyOS configure mode, and removes any existing broken VyManager container configuration.

**Step 1: Write the script header and cleanup phase**

The script must:
- Use `#!/bin/vbash` for VyOS
- Enter the `vyattacfg` group for VyOS CLI access
- Source the VyOS script template
- Define all configurable variables at the top
- Delete existing VyManager containers and network before reconfiguring

```bash
#!/bin/vbash
# ============================================================================
# VyManager — VyOS Container Installation Script
# ============================================================================
# Deploys VyManager (PostgreSQL + FastAPI backend + Next.js frontend) as
# native VyOS containers managed via the VyOS CLI.
#
# Usage:
#   Online:  sudo bash vyos_install.sh
#   Offline: Copy image tarballs to same directory, then run.
#
# All configuration is done via VyOS 'set container' commands so it appears
# in 'show configuration' and persists across reboots.
# ============================================================================

# --- Configurable Variables ------------------------------------------------
ROUTER_IP="172.16.100.2"
FRONTEND_PORT="3001"
BACKEND_PORT="8000"
POSTGRES_PORT="5432"

DB_USER="vymanager"
DB_PASS="vymanager"
DB_NAME="vymanager_auth"

CONTAINER_NETWORK="vymgr-net"
CONTAINER_NETWORK_PREFIX="172.18.200.0/24"

# Generate secrets if not provided (override by exporting before running)
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 44)}"
SSH_ENCRYPTION_KEY="${SSH_ENCRYPTION_KEY:-$(head -c 32 /dev/urandom | xxd -p -c 64)}"

IMAGE_POSTGRES="docker.io/postgres:16-alpine"
IMAGE_BACKEND="ghcr.io/community-vyprojects/vymanager-backend:beta"
IMAGE_FRONTEND="ghcr.io/community-vyprojects/vymanager-frontend:beta"
# ---------------------------------------------------------------------------

# Ensure we run under the vyattacfg group for VyOS CLI access
if [ "$(id -g -n)" != 'vyattacfg' ]; then
    exec sg vyattacfg -c "/bin/vbash $(readlink -f $0) $@"
fi

source /opt/vyatta/etc/functions/script-template

echo "=== VyManager Installation ==="

# ------------------------------------------------------------------
# Phase 1: Cleanup existing broken VyManager configuration
# ------------------------------------------------------------------
echo ""
echo "--- Phase 1: Cleaning up existing configuration ---"

configure

# Delete existing VyManager containers (ignore errors if they don't exist)
delete container name vymanager-postgres 2>/dev/null || true
delete container name vymanager-backend 2>/dev/null || true
delete container name vymanager-frontend 2>/dev/null || true
delete container network "${CONTAINER_NETWORK}" 2>/dev/null || true

commit
echo "Cleanup complete."
```

**Step 2: Verify vbash syntax is valid**

This can only be fully tested on a VyOS router, but verify no obvious bash errors:
```bash
# On dev machine, basic syntax check (won't catch vbash-specific issues)
bash -n container/vyos_install.sh || echo "Expected: vbash-specific syntax may warn"
```

**Step 3: Commit**

```bash
git add container/vyos_install.sh
git commit -m "feat: vyos_install.sh phase 1 — header, config vars, and cleanup"
```

---

### Task 2: `vyos_install.sh` — Phase 2: Prerequisites and Image Loading

**Files:**
- Modify: `container/vyos_install.sh` (append after Phase 1)

**Context:** Create the persistent data directory for PostgreSQL, load images from tarballs if present (offline mode), or pull from registries (online mode).

**Step 1: Append Phase 2 to the script**

```bash
# ------------------------------------------------------------------
# Phase 2: Prerequisites — data directory and container images
# ------------------------------------------------------------------
echo ""
echo "--- Phase 2: Prerequisites ---"

# Create persistent PostgreSQL data directory
# /config/ survives VyOS image upgrades
sudo mkdir -p /config/vymanager/postgres_data
sudo chown 70:70 /config/vymanager/postgres_data
echo "PostgreSQL data directory ready."

# Load or pull container images
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_or_pull_image() {
    local tarball="$1"
    local image="$2"
    local tarpath="${SCRIPT_DIR}/${tarball}"

    if [ -f "${tarpath}" ]; then
        echo "Loading ${image} from ${tarball}..."
        sudo podman load -i "${tarpath}"
    else
        echo "Pulling ${image} from registry..."
        add container image "${image}"
    fi
}

load_or_pull_image "postgres-16-alpine.tar" "${IMAGE_POSTGRES}"
load_or_pull_image "vymanager-backend-beta.tar" "${IMAGE_BACKEND}"
load_or_pull_image "vymanager-frontend-beta.tar" "${IMAGE_FRONTEND}"

echo "All images ready."
```

**Step 2: Commit**

```bash
git add container/vyos_install.sh
git commit -m "feat: vyos_install.sh phase 2 — prerequisites and image loading"
```

---

### Task 3: `vyos_install.sh` — Phase 3: Container Configuration

**Files:**
- Modify: `container/vyos_install.sh` (append after Phase 2)

**Context:** This is the core phase. Configure the container network, registry, and all three containers with their environment variables via VyOS CLI. No `.env` file mounting — everything via `set container name X environment`.

**Important details:**
- Backend `os.getenv("DATABASE_URL")` — must be set as environment directive
- Backend `os.getenv("FRONTEND_URL")` — internal container-to-container URL
- Frontend port: host 3001 → container 3000 (Dockerfile EXPOSE 3000)
- No `arguments` override — let Dockerfile CMD handle uvicorn startup
- Container names within `vymgr-net` are DNS-resolvable by Podman

**Step 1: Append Phase 3 to the script**

```bash
# ------------------------------------------------------------------
# Phase 3: VyOS container configuration
# ------------------------------------------------------------------
echo ""
echo "--- Phase 3: Configuring containers ---"

# Derived URLs (do not edit — computed from variables above)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@vymanager-postgres:${POSTGRES_PORT}/${DB_NAME}"
FRONTEND_INTERNAL_URL="http://vymanager-frontend:3000"
BACKEND_INTERNAL_URL="http://vymanager-backend:${BACKEND_PORT}"
EXTERNAL_URL="http://${ROUTER_IP}:${FRONTEND_PORT}"
TRUSTED_ORIGINS_VAL="${EXTERNAL_URL},http://localhost:${FRONTEND_PORT}"

# --- Network and Registry ---
set container network "${CONTAINER_NETWORK}" prefix "${CONTAINER_NETWORK_PREFIX}"
set container registry ghcr.io

# --- PostgreSQL ---
set container name vymanager-postgres image "${IMAGE_POSTGRES}"
set container name vymanager-postgres network "${CONTAINER_NETWORK}"
set container name vymanager-postgres restart on-failure
set container name vymanager-postgres port db source "${POSTGRES_PORT}"
set container name vymanager-postgres port db destination "${POSTGRES_PORT}"
set container name vymanager-postgres port db protocol tcp
set container name vymanager-postgres volume postgres-data source '/config/vymanager/postgres_data'
set container name vymanager-postgres volume postgres-data destination '/var/lib/postgresql/data'
set container name vymanager-postgres environment POSTGRES_USER value "${DB_USER}"
set container name vymanager-postgres environment POSTGRES_PASSWORD value "${DB_PASS}"
set container name vymanager-postgres environment POSTGRES_DB value "${DB_NAME}"

# --- Backend ---
set container name vymanager-backend image "${IMAGE_BACKEND}"
set container name vymanager-backend network "${CONTAINER_NETWORK}"
set container name vymanager-backend restart on-failure
set container name vymanager-backend port api source "${BACKEND_PORT}"
set container name vymanager-backend port api destination "${BACKEND_PORT}"
set container name vymanager-backend port api protocol tcp
set container name vymanager-backend environment DATABASE_URL value "${DATABASE_URL}"
set container name vymanager-backend environment FRONTEND_URL value "${FRONTEND_INTERNAL_URL}"
set container name vymanager-backend environment BETTER_AUTH_SECRET value "${BETTER_AUTH_SECRET}"
set container name vymanager-backend environment SSH_ENCRYPTION_KEY value "${SSH_ENCRYPTION_KEY}"
set container name vymanager-backend environment TRUSTED_ORIGINS value "${TRUSTED_ORIGINS_VAL}"
set container name vymanager-backend environment VYMANAGER_ENV value 'production'

# --- Frontend ---
set container name vymanager-frontend image "${IMAGE_FRONTEND}"
set container name vymanager-frontend network "${CONTAINER_NETWORK}"
set container name vymanager-frontend restart on-failure
set container name vymanager-frontend port web source "${FRONTEND_PORT}"
set container name vymanager-frontend port web destination '3000'
set container name vymanager-frontend port web protocol tcp
set container name vymanager-frontend environment DATABASE_URL value "${DATABASE_URL}"
set container name vymanager-frontend environment BACKEND_URL value "${BACKEND_INTERNAL_URL}"
set container name vymanager-frontend environment BETTER_AUTH_SECRET value "${BETTER_AUTH_SECRET}"
set container name vymanager-frontend environment BETTER_AUTH_URL value "${EXTERNAL_URL}"
set container name vymanager-frontend environment NEXT_PUBLIC_APP_URL value "${EXTERNAL_URL}"
set container name vymanager-frontend environment TRUSTED_ORIGINS value "${TRUSTED_ORIGINS_VAL}"
set container name vymanager-frontend environment NODE_ENV value 'production'
set container name vymanager-frontend environment VYMANAGER_ENV value 'production'

echo "Container configuration set."
```

**Step 2: Commit**

```bash
git add container/vyos_install.sh
git commit -m "feat: vyos_install.sh phase 3 — container configuration with env directives"
```

---

### Task 4: `vyos_install.sh` — Phase 4: Commit, Save, and Status Output

**Files:**
- Modify: `container/vyos_install.sh` (append after Phase 3)

**Context:** Commit the VyOS configuration, save to persistent storage, exit configure mode, and print a status summary with access URLs.

**Step 1: Append Phase 4 to the script**

```bash
# ------------------------------------------------------------------
# Phase 4: Commit, save, and verify
# ------------------------------------------------------------------
echo ""
echo "--- Phase 4: Committing configuration ---"

commit
save
exit

echo ""
echo "=== VyManager Installation Complete ==="
echo ""
echo "Access VyManager at: http://${ROUTER_IP}:${FRONTEND_PORT}"
echo ""
echo "Container status:"
sudo podman ps --filter "name=vymanager" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "If containers are not running yet, wait 30-60 seconds for startup."
echo "The frontend runs database migrations on first boot."
echo ""
echo "To check logs:"
echo "  sudo podman logs vymanager-postgres"
echo "  sudo podman logs vymanager-backend"
echo "  sudo podman logs vymanager-frontend"
echo ""
echo "To verify in VyOS CLI:"
echo "  show container"
echo "  show configuration commands | match vymanager"
```

**Step 2: Make executable**

```bash
chmod +x container/vyos_install.sh
```

**Step 3: Commit**

```bash
git add container/vyos_install.sh
git commit -m "feat: vyos_install.sh phase 4 — commit, save, and status output"
```

---

### Task 5: Update Documentation and Clean Up Old Files

**Files:**
- Modify: `vyos_install.md` — rewrite to reference new scripts
- Delete: `vyos_install.sh` (root-level, replaced by `container/vyos_install.sh`)

**Step 1: Update `vyos_install.md`**

Rewrite the markdown guide to document the new two-script approach: how to use `vyos_bundle.sh` for offline preparation, how to transfer and run `vyos_install.sh`, and the configurable variables at the top of the script.

**Step 2: Remove old broken script**

```bash
git rm vyos_install.sh
```

**Step 3: Commit**

```bash
git add vyos_install.md container/
git commit -m "docs: update VyOS install guide for new two-script approach"
```

---

### Task 6: Test on VyOS Router

**Context:** SSH into the test router at 172.16.100.2 and validate the installation.

**Step 1: Transfer and run**

```bash
# From dev machine
scp container/vyos_install.sh vyos@172.16.100.2:/tmp/vyos_install.sh

# On the router
ssh vyos@172.16.100.2
cd /tmp && sudo bash vyos_install.sh
```

**Step 2: Verify containers are running**

```bash
sudo podman ps --filter "name=vymanager"
# Expected: 3 containers (postgres, backend, frontend) with status "Up"
```

**Step 3: Verify port mapping**

```bash
# Frontend on 3001
curl -s -o /dev/null -w "%{http_code}" http://172.16.100.2:3001
# Expected: 200 or 307 (redirect to login)

# Backend on 8000
curl -s -o /dev/null -w "%{http_code}" http://172.16.100.2:8000/docs
# Expected: 200 (FastAPI docs page)
```

**Step 4: Verify VyOS config visibility**

```bash
show configuration commands | match vymanager
# Expected: all container set commands visible
```

**Step 5: Check container logs for errors**

```bash
sudo podman logs vymanager-postgres 2>&1 | tail -5
# Expected: "database system is ready to accept connections"

sudo podman logs vymanager-backend 2>&1 | tail -5
# Expected: "Uvicorn running on http://0.0.0.0:8000"

sudo podman logs vymanager-frontend 2>&1 | tail -10
# Expected: "Starting Next.js..." and "Ready on http://0.0.0.0:3000"
```

**Step 6: Verify container-to-container DNS**

```bash
sudo podman exec vymanager-backend python3 -c "
import socket
print(socket.gethostbyname('vymanager-postgres'))
print(socket.gethostbyname('vymanager-frontend'))
"
# Expected: two IPs in the 172.18.200.0/24 range
```
