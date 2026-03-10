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
