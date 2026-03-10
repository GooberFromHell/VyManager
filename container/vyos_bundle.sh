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
