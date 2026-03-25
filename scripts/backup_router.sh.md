This script and reference guide are designed to ensure your offline migration to Router B is seamless. Because Router B cannot reach the internet, this process prioritizes "bundling" every dependency—including the container images themselves.

---

### VyOS Migration Script (`backup_router.sh`)

This script automates the collection of the configuration, system identity, and container images. Run this on **Router A** as an admin user.

```bash
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
echo "Transfer this file to Router B via USB or local SFTP."
```

---

### VyOS Backup Inventory Reference

This table serves as your checklist for the archive contents to ensure Router B reaches the exact "running state" of Router A without an internet connection.

| Item | Path in Archive | Purpose | Criticality |
| :--- | :--- | :--- | :--- |
| **Boot Config** | `/config/config.boot` | The primary VyOS CLI state (Firewalls, Tunnels, Interfaces). | **Vital** |
| **Container Images** | `/container-images/*.tar` | Allows Router B to "pull" containers while offline. | **Vital** |
| **PKI / Secrets** | `/config/auth/` | Stores VPN certificates, SSH public keys, and API SSL keys. | **High** |
| **Custom Scripts** | `/config/scripts/` | Post-config scripts and automation logic. | **High** |
| **System Identity** | `/ssh_host_keys/` | Prevents "Remote Host Changed" errors for SSH clients. | **Medium** |
| **Container Data** | `/config/container-data/` | Persistent files/DBs mapped to containers (if used). | **Medium** |
| **Version Sync** | `N/A` | Ensure Router B is running the same VyOS ISO version. | **High** |

---

### Important Considerations for the Offline Swap

* **Version Parity:** If Router A is running VyOS 1.4-rolling and Router B is on 1.3-equuleus, the `config.boot` migration may fail or require manual syntax fixing. Check your version with `show version`.
* **Hardware Mapping:** The script above automatically deletes `hw-id` lines. When Router B boots with this config, it will detect its own NICs and assign them as `eth0`, `eth1`, etc., based on their physical bus order.
* **Restoration Steps:** Once you move the `.tar.gz` to Router B, you will need to:
    1.  Extract it.
    2.  Use `podman load -i <image_name>.tar` for every image.
    3.  Move the `/config` and `/ssh_host_keys` files to their proper system locations.
    4.  Run `load /config/config.boot` followed by `commit` and `save`.
