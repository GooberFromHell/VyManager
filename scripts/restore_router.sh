#!/bin/bash

# Configuration
ARCHIVE="vyos_migration_pack.tar.gz"
EXTRACT_DIR="/tmp/vyos_restore"

if [ ! -f "$ARCHIVE" ]; then
    echo "[!] Error: $ARCHIVE not found in current directory."
    exit 1
fi

echo "--- Starting VyOS Restoration ---"

# 1. Unpack the migration pack
mkdir -p "$EXTRACT_DIR"
tar -xzf "$ARCHIVE" -C "$EXTRACT_DIR"
echo "[*] Archive extracted."

# 2. Load Podman Images
echo "[*] Loading container images into Podman (Offline)..."
if [ -d "$EXTRACT_DIR/container-images" ]; then
    for img in "$EXTRACT_DIR/container-images"/*.tar; do
        echo "    -> Loading $img..."
        podman load -i "$img"
    done
else
    echo "[!] No container images found to load."
fi

# 3. Restore SSH Host Keys (Identify persistence)
echo "[*] Restoring SSH host keys..."
sudo cp "$EXTRACT_DIR/ssh_host_keys"/* /etc/ssh/
sudo systemctl restart ssh

# 4. Place Config and Scripts
echo "[*] Moving configuration and scripts to /config..."
sudo cp -rp "$EXTRACT_DIR/config/"* /config/

# Cleanup
rm -rf "$EXTRACT_DIR"

echo "--- Restoration Script Complete ---"
echo ""
echo "FINAL STEPS:"
echo "1. Enter the VyOS CLI: 'configure'"
echo "2. Load the new config: 'load /config/config.boot'"
echo "3. Verify interfaces (MAC addresses are auto-cleared)."
echo "4. Run: 'commit' then 'save'"