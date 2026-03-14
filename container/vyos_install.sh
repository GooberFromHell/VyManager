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

source /opt/vyatta/etc/functions/script-template
WRAP=/opt/vyatta/sbin/vyatta-cfg-cmd-wrapper

# --- Configurable Variables ------------------------------------------------
read -rp "Enter Router IP: " ROUTER_IP
FRONTEND_PORT="3001"
BACKEND_PORT="8000"
POSTGRES_PORT="5432"

DB_USER="vymanager"
DB_PASS="vymanager"
DB_NAME="vymanager_auth"

CONTAINER_NETWORK="vymgr-net"
CONTAINER_NETWORK_PREFIX="172.16.200.0/24"

# Generate secrets if not provided (override by exporting before running)
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 44)}"
SSH_ENCRYPTION_KEY="${SSH_ENCRYPTION_KEY:-$(head -c 32 /dev/urandom | od -A n -t x1 | tr -d ' \n')}"
read -rp "Enter VyOS API key (leave blank to auto-generate): " USER_API_KEY
VYOS_API_KEY="${USER_API_KEY:-$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 44)}"

IMAGE_POSTGRES="docker.io/postgres:16-alpine"
IMAGE_BACKEND="ghcr.io/community-vyprojects/vymanager-backend:beta"
IMAGE_FRONTEND="ghcr.io/community-vyprojects/vymanager-frontend:beta"
# ---------------------------------------------------------------------------

# Derived URLs (do not edit — computed from variables above)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@vymanager-postgres:${POSTGRES_PORT}/${DB_NAME}"
FRONTEND_INTERNAL_URL="http://vymanager-frontend:3000"
BACKEND_INTERNAL_URL="http://vymanager-backend:${BACKEND_PORT}"
EXTERNAL_URL="http://${ROUTER_IP}:${FRONTEND_PORT}"
TRUSTED_ORIGINS_VAL="${EXTERNAL_URL},http://localhost:${FRONTEND_PORT}"

echo "=== VyManager Installation ==="

# ------------------------------------------------------------------
# Phase 0: Configure VyOS HTTPS API (REST + GraphQL)
# ------------------------------------------------------------------
echo ""
echo "--- Phase 0: Configuring VyOS HTTPS API ---"

$WRAP begin

# Register the API key VyManager will use to talk to VyOS
$WRAP set service https api keys id vymanager key "${VYOS_API_KEY}"

# Enable REST API (VyOS 1.5+)
$WRAP set service https api rest

# Enable GraphQL (required for dashboard streaming)
$WRAP set service https api graphql

# Use the API key defined above for GraphQL authentication
$WRAP set service https api graphql authentication type key

$WRAP commit
$WRAP save
$WRAP end

echo "VyOS API configured."
echo "  API Key: ${VYOS_API_KEY}"
echo "  (Save this — you will need it to configure VyManager)"

# ------------------------------------------------------------------
# Phase 1: Cleanup existing broken VyManager configuration
# ------------------------------------------------------------------
echo ""
echo "--- Phase 1: Cleaning up existing configuration ---"

# Stop running VyManager containers before modifying config
for ctr in vymanager-frontend vymanager-backend vymanager-postgres; do
    sudo podman stop "${ctr}" 2>/dev/null || true
    sudo podman rm -f "${ctr}" 2>/dev/null || true
done

$WRAP begin

# Delete existing VyManager container config (ignore errors if absent)
$WRAP delete container name vymanager-postgres 2>/dev/null || true
$WRAP delete container name vymanager-backend 2>/dev/null || true
$WRAP delete container name vymanager-frontend 2>/dev/null || true
$WRAP delete container network "${CONTAINER_NETWORK}" 2>/dev/null || true

$WRAP commit
$WRAP save
$WRAP end

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

    # Extract just the container name: strip registry/org prefix and tag
    # e.g. ghcr.io/community-vyprojects/vymanager-backend:beta -> vymanager-backend
    local image_name="${image##*/}"
    image_name="${image_name%%:*}"

    if [ -f "${tarpath}" ]; then
        echo "Loading ${image} from ${tarball}..."
        sudo podman load -i "${tarpath}"
    elif sudo podman image exists "${image}" 2>/dev/null; then
        echo "Image ${image_name} already exists locally, skipping pull."
    else
        echo "Pulling ${image} from registry..."
        if ! sudo podman pull "${image}"; then
            echo "ERROR: Failed to pull ${image}. If this router has no internet access,"
            echo "use vyos_bundle.sh on a dev machine to create offline tarballs."
            exit 1
        fi
    fi
}

load_or_pull_image "postgres-16-alpine.tar" "${IMAGE_POSTGRES}"
load_or_pull_image "vymanager-backend-beta.tar" "${IMAGE_BACKEND}"
load_or_pull_image "vymanager-frontend-beta.tar" "${IMAGE_FRONTEND}"

echo "All images ready."

# ------------------------------------------------------------------
# Phase 3: VyOS container configuration
# ------------------------------------------------------------------
echo ""
echo "--- Phase 3: Configuring containers ---"

$WRAP begin

# --- Firewall: enable conntrack for container port mappings ---
# VyOS disables conntrack (notrack) for all traffic by default when no
# firewall/state-policy rules exist.  Podman's DNAT/masquerade for
# container port mappings requires conntrack, so without state-policy
# the published ports are unreachable.
$WRAP set firewall global-options state-policy established action accept
$WRAP set firewall global-options state-policy related action accept
$WRAP set firewall ipv4 input filter default-action accept
$WRAP set firewall ipv4 forward filter default-action accept

# --- Network and Registry (set twice — VyOS CLI quirk) ---
$WRAP set container network "${CONTAINER_NETWORK}" prefix "${CONTAINER_NETWORK_PREFIX}"
$WRAP set container network "${CONTAINER_NETWORK}" prefix "${CONTAINER_NETWORK_PREFIX}"
$WRAP set container registry ghcr.io

# --- Set images first (run twice — VyOS sometimes requires a repeat) ---
$WRAP set container name vymanager-postgres image "${IMAGE_POSTGRES}"
$WRAP set container name vymanager-backend image "${IMAGE_BACKEND}"
$WRAP set container name vymanager-frontend image "${IMAGE_FRONTEND}"
$WRAP set container name vymanager-postgres image "${IMAGE_POSTGRES}"
$WRAP set container name vymanager-backend image "${IMAGE_BACKEND}"
$WRAP set container name vymanager-frontend image "${IMAGE_FRONTEND}"

# --- PostgreSQL ---
$WRAP set container name vymanager-postgres network "${CONTAINER_NETWORK}"
$WRAP set container name vymanager-postgres restart on-failure
$WRAP set container name vymanager-postgres volume postgres-data source '/config/vymanager/postgres_data'
$WRAP set container name vymanager-postgres volume postgres-data destination '/var/lib/postgresql/data'
$WRAP set container name vymanager-postgres environment POSTGRES_USER value "${DB_USER}"
$WRAP set container name vymanager-postgres environment POSTGRES_PASSWORD value "${DB_PASS}"
$WRAP set container name vymanager-postgres environment POSTGRES_DB value "${DB_NAME}"

# --- Backend ---
$WRAP set container name vymanager-backend network "${CONTAINER_NETWORK}"
$WRAP set container name vymanager-backend restart on-failure
$WRAP set container name vymanager-backend environment DATABASE_URL value "${DATABASE_URL}"
$WRAP set container name vymanager-backend environment FRONTEND_URL value "${FRONTEND_INTERNAL_URL}"
$WRAP set container name vymanager-backend environment BETTER_AUTH_SECRET value "${BETTER_AUTH_SECRET}"
$WRAP set container name vymanager-backend environment SSH_ENCRYPTION_KEY value "${SSH_ENCRYPTION_KEY}"
$WRAP set container name vymanager-backend environment TRUSTED_ORIGINS value "${TRUSTED_ORIGINS_VAL}"
$WRAP set container name vymanager-backend environment VYMANAGER_ENV value 'production'

# --- Frontend ---
$WRAP set container name vymanager-frontend network "${CONTAINER_NETWORK}"
$WRAP set container name vymanager-frontend restart on-failure
$WRAP set container name vymanager-frontend port web source "${FRONTEND_PORT}"
$WRAP set container name vymanager-frontend port web destination '3000'
$WRAP set container name vymanager-frontend port web protocol tcp
$WRAP set container name vymanager-frontend environment DATABASE_URL value "${DATABASE_URL}"
$WRAP set container name vymanager-frontend environment BACKEND_URL value "${BACKEND_INTERNAL_URL}"
$WRAP set container name vymanager-frontend environment BETTER_AUTH_SECRET value "${BETTER_AUTH_SECRET}"
$WRAP set container name vymanager-frontend environment BETTER_AUTH_URL value "${EXTERNAL_URL}"
$WRAP set container name vymanager-frontend environment NEXT_PUBLIC_APP_URL value "${EXTERNAL_URL}"
$WRAP set container name vymanager-frontend environment TRUSTED_ORIGINS value "${TRUSTED_ORIGINS_VAL}"
$WRAP set container name vymanager-frontend environment NODE_ENV value 'production'
$WRAP set container name vymanager-frontend environment VYMANAGER_ENV value 'production'

echo "Container configuration set."

# ------------------------------------------------------------------
# Phase 4: Commit, save, and verify
# ------------------------------------------------------------------
echo ""
echo "--- Phase 4: Committing configuration ---"

$WRAP commit
$WRAP save
$WRAP end

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
