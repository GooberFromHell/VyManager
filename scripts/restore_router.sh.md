This script acts as the "re-entry" process for Router B. Since the environment is offline, it handles the manual heavy lifting of importing images and placing system identity files before you initialize the final configuration.

---

### VyOS Restoration Script (`restore_router.sh`)

Upload the `vyos_migration_pack.tar.gz` to the `/home/vyos/` directory on **Router B**, then run this script with `sudo`.

```bash
#!/bin/bash

# Configuration
ARCHIVE="/home/vyos/vyos_migration_pack.tar.gz"
RESTORE_TEMP="/tmp/vyos_restore_data"

if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (sudo)"
  exit
fi

echo "--- Starting VyOS Restoration Process ---"

# 1. Extract the archive
echo "[*] Extracting migration pack..."
mkdir -p "$RESTORE_TEMP"
tar -xzf "$ARCHIVE" -C "$RESTORE_TEMP"

# 2. Restore System Identity (SSH Host Keys)
echo "[*] Restoring SSH host keys..."
cp -v "$RESTORE_TEMP/ssh_host_keys/ssh_host_*" /etc/ssh/
chmod 600 /etc/ssh/ssh_host_*_key
systemctl restart ssh

# 3. Restore Config Directory
echo "[*] Restoring /config directory (scripts, auth, boot)..."
cp -rp "$RESTORE_TEMP/config/"* /config/

# 4. Load Podman Images (Offline Import)
echo "[*] Importing container images to Podman..."
if [ -d "$RESTORE_TEMP/container-images" ]; then
    for IMG_TAR in "$RESTORE_TEMP/container-images/"*.tar; do
        echo "    -> Loading $IMG_TAR..."
        podman load -i "$IMG_TAR"
    done
else
    echo "[!] No container images found in archive."
fi

# 5. Cleanup
rm -rf "$RESTORE_TEMP"

echo "--- Restoration Script Complete ---"
echo ""
echo "FINAL STEPS:"
echo "1. Enter VyOS configuration mode: 'conf'"
echo "2. Load the new config: 'load /config/config.boot'"
echo "3. Review any interface errors (due to hardware differences)."
echo "4. Commit and save: 'commit' then 'save'"
```

---

### VyOS Backup Archive Inventory (Reference)

This is the definitive checklist of what must be inside your `vyos_migration_pack.tar.gz` to ensure Router B reaches a "Running State" identical to Router A.

| Category | Item | Path (System) | Requirement |
| :--- | :--- | :--- | :--- |
| **Logic** | `config.boot` | `/config/config.boot` | Contains all firewall, routing, and interface CLI rules. |
| **Identity** | SSH Host Keys | `/etc/ssh/ssh_host_*` | Maintains the unique fingerprint of the router for SSH clients. |
| **Security** | PKI & Keys | `/config/auth/` | Essential for API access, VPN tunnels (OpenVPN/IPsec), and certificates. |
| **Compute** | Container Images | `podman save` output | **Vital for offline use:** Provides the binaries for services running in containers. |
| **Persistence** | Container Data | `/config/container-data/` | Any databases or config files mounted into the containers. |
| **Automation** | Scripts | `/config/scripts/` | Includes boot-up hooks (`vyos-postconfig-bootup.script`) and custom tools. |
| **System** | ISO Version | `show version` | Router B must be on the same major/minor release to avoid config syntax errors. |

---



### Pro-Tips for the Offline Swap
* **The "First Boot" Hang:** When you first `load` the config on Router B, it might hang for a moment while it tries to initialize interfaces. This is normal as it maps the physical NICs to the logical `ethX` names.
* **API Availability:** Since the restoration script restarts the SSH service and places the API certificates in `/config/auth/`, your API should become reachable as soon as the `commit` command is successful.
* **Image Verification:** After running the restoration script, you can verify your containers are ready by running `show container image` to see the imported layers.
