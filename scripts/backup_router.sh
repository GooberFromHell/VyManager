#!/bin/bash

# Configuration
BACKUP_DIR="/tmp/vyos_backup_$(date +%Y%m%d)"
ARCHIVE_NAME="vyos_migration_pack.tar.gz"
CONTAINER_EXPORT_DIR="$BACKUP_DIR/container-images"

echo "--- Starting VyOS Migration Backup ---"

# 1. Create directory structure
mkdir -p "$CONTAINER_EXPORT_DIR"

# 2. Copy the entire /config directory (Boot config, Scripts, Auth/PKI)
echo "[*] Backing up /config directory..."
cp -rp /config "$BACKUP_DIR/"

# 3. Backup SSH Host Keys (System Identity)
echo "[*] Backing up SSH host keys..."
mkdir -p "$BACKUP_DIR/ssh_host_keys"
cp /etc/ssh/ssh_host_* "$BACKUP_DIR/ssh_host_keys/"

# 4. Export Podman Images (The Offline Requirement)
echo "[*] Exporting container images (this may take a few minutes)..."
IMAGES=$(podman images --format "{{.Repository}}:{{.Tag}}")

for IMAGE in $IMAGES; do
    # Clean name for filename (replace colon/slash with underscore)
    SAFE_NAME=$(echo "$IMAGE" | tr ': /' '___')
    echo "    -> Saving $IMAGE..."
    podman save -o "$CONTAINER_EXPORT_DIR/$SAFE_NAME.tar" "$IMAGE"
done

# 5. Clean config for hardware (Optional but Recommended)
# This removes the 'hw-id' lines so Router B can assign interfaces to its own MACs
echo "[*] Preparing config.boot for new hardware..."
sed -i '/hw-id/d' "$BACKUP_DIR/config/config.boot"

# 6. Create final compressed archive
echo "[*] Compressing archive..."
tar -czf "$HOME/$ARCHIVE_NAME" -C "$BACKUP_DIR" .

# Cleanup
rm -rf "$BACKUP_DIR"

echo "--- Backup Complete! ---"
echo "File location: $HOME/$ARCHIVE_NAME"