"""
Container Backup SSH Data Collection

Connects to VyOS instances via SSH to collect container runtime state,
image digests, and volume data for comprehensive container backups.
"""

import asyncio
import os
import logging
import shlex
import json
from typing import Optional

import asyncssh

from ssh_key_manager import decrypt_private_key
from routers.site_tools.models import (
    VolumeBackupData,
    ContainerImageManifest,
    ContainerRuntimeStatus,
    ContainerFullBackup,
)

logger = logging.getLogger(__name__)

CONTAINER_VOLUME_BACKUP_MAX_MB = int(
    os.getenv("CONTAINER_VOLUME_BACKUP_MAX_MB", "500")
)


async def open_ssh_connection(
    instance_row: dict,
) -> Optional[asyncssh.SSHClientConnection]:
    """Open an SSH connection to a VyOS instance.

    Decrypts the stored private key and connects using asyncssh.

    Args:
        instance_row: Database row dict with host, sshPort, sshUsername,
            sshEncryptedPrivKey, sshKeyNonce, and sshKeyConfigured fields.

    Returns:
        An open SSH connection, or None if SSH is not configured or the
        connection fails.
    """
    if not instance_row.get("sshKeyConfigured"):
        logger.debug(
            "SSH not configured for instance %s",
            instance_row.get("host", "unknown"),
        )
        return None

    encrypted_key = instance_row.get("sshEncryptedPrivKey")
    nonce = instance_row.get("sshKeyNonce")
    if not encrypted_key or not nonce:
        logger.warning(
            "SSH key data missing for instance %s",
            instance_row.get("host", "unknown"),
        )
        return None

    try:
        private_key_pem = decrypt_private_key(encrypted_key, nonce)
        private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))

        conn = await asyncssh.connect(
            instance_row["host"],
            port=instance_row.get("sshPort", 22),
            username=instance_row.get("sshUsername") or "vyos",
            client_keys=[private_key],
            known_hosts=None,
            connect_timeout=15,
        )
        return conn
    except Exception:
        logger.exception(
            "Failed to open SSH connection to %s",
            instance_row.get("host", "unknown"),
        )
        return None


async def collect_runtime_status(
    conn: asyncssh.SSHClientConnection,
) -> list[ContainerRuntimeStatus]:
    """Collect runtime status of all containers via podman.

    Runs ``sudo podman ps -a`` and parses each line of JSON output into
    a :class:`ContainerRuntimeStatus` model.

    Args:
        conn: An open asyncssh connection to the VyOS device.

    Returns:
        List of runtime status entries. Returns an empty list on total
        failure (individual line parse errors are logged and skipped).
    """
    cmd = (
        "sudo podman ps -a --format "
        "'{\"name\":\"{{.Names}}\",\"status\":\"{{.Status}}\","
        "\"exitcode\":{{.ExitCode}}}'"
    )

    try:
        result = await asyncio.wait_for(conn.run(cmd), timeout=30)
    except Exception:
        logger.exception("Failed to run podman ps")
        return []

    if result.exit_status != 0:
        logger.warning(
            "podman ps exited with status %s: %s",
            result.exit_status,
            (result.stderr or "").strip()[:200],
        )
        return []

    statuses: list[ContainerRuntimeStatus] = []
    stdout = (result.stdout or "").strip()
    if not stdout:
        return statuses

    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            status_str = data.get("status", "")
            running = status_str.startswith("Up")
            statuses.append(
                ContainerRuntimeStatus(
                    container_name=data["name"],
                    running=running,
                    exit_code=data.get("exitcode"),
                )
            )
        except Exception:
            logger.warning("Failed to parse podman ps line: %s", line[:200])
            continue

    return statuses


async def collect_image_digests(
    conn: asyncssh.SSHClientConnection,
    containers: dict,
) -> list[ContainerImageManifest]:
    """Collect image digests for each container's image.

    For each container in *containers*, inspects the image with podman to
    retrieve its pinned digest.

    Args:
        conn: An open asyncssh connection to the VyOS device.
        containers: Mapping of container name to its VyOS config dict.
            Each config dict is expected to have an ``"image"`` key with the
            image reference string.

    Returns:
        List of :class:`ContainerImageManifest` entries, one per container.
    """
    manifests: list[ContainerImageManifest] = []

    for container_name, config in containers.items():
        image_ref = config.get("image", "")
        if not image_ref:
            manifests.append(
                ContainerImageManifest(
                    container_name=container_name,
                    image_ref="unknown",
                    error="No image reference found in config",
                )
            )
            continue

        safe_ref = shlex.quote(image_ref)
        cmd = f"sudo podman inspect {safe_ref} --format '{{{{.Digest}}}}'"

        try:
            result = await asyncio.wait_for(conn.run(cmd), timeout=30)
            if result.exit_status == 0:
                digest = (result.stdout or "").strip()
                manifests.append(
                    ContainerImageManifest(
                        container_name=container_name,
                        image_ref=image_ref,
                        image_digest=digest if digest else None,
                    )
                )
            else:
                error_msg = (result.stderr or "").strip()[:200]
                manifests.append(
                    ContainerImageManifest(
                        container_name=container_name,
                        image_ref=image_ref,
                        error=f"podman inspect failed: {error_msg}",
                    )
                )
        except Exception as exc:
            manifests.append(
                ContainerImageManifest(
                    container_name=container_name,
                    image_ref=image_ref,
                    error=f"Failed to inspect image: {str(exc)[:200]}",
                )
            )

    return manifests


async def backup_volumes(
    conn: asyncssh.SSHClientConnection,
    container_name: str,
    volumes: list[dict],
) -> list[VolumeBackupData]:
    """Back up volume data for a single container.

    For each volume, checks its size and then creates a compressed tar
    archive encoded as base64.  Volumes exceeding the configured size limit
    are skipped with an error note.

    Args:
        conn: An open asyncssh connection to the VyOS device.
        container_name: Name of the container that owns the volumes.
        volumes: List of volume dicts, each with ``"source"`` (host path)
            and ``"destination"`` keys.

    Returns:
        List of :class:`VolumeBackupData` entries, one per volume.
    """
    max_bytes = CONTAINER_VOLUME_BACKUP_MAX_MB * 1024 * 1024
    results: list[VolumeBackupData] = []

    for vol in volumes:
        source = vol.get("source", "")
        destination = vol.get("destination", "")
        volume_name = destination or source

        if not source:
            results.append(
                VolumeBackupData(
                    volume_name=volume_name,
                    source_path=source,
                    error="No source path specified",
                )
            )
            continue

        safe_source = shlex.quote(source)

        # -----------------------------------------------------------------
        # Check volume size
        # -----------------------------------------------------------------
        size_cmd = f"sudo du -sb {safe_source} 2>/dev/null | cut -f1"
        try:
            size_result = await asyncio.wait_for(conn.run(size_cmd), timeout=30)
            size_str = (size_result.stdout or "").strip()
            size_bytes = int(size_str) if size_str.isdigit() else None
        except Exception as exc:
            results.append(
                VolumeBackupData(
                    volume_name=volume_name,
                    source_path=source,
                    error=f"Failed to check volume size: {str(exc)[:200]}",
                )
            )
            continue

        if size_bytes is not None and size_bytes > max_bytes:
            results.append(
                VolumeBackupData(
                    volume_name=volume_name,
                    source_path=source,
                    size_bytes=size_bytes,
                    error=(
                        f"Volume too large ({size_bytes} bytes, "
                        f"limit {CONTAINER_VOLUME_BACKUP_MAX_MB} MB)"
                    ),
                )
            )
            continue

        # -----------------------------------------------------------------
        # Create compressed tar and encode as base64
        # -----------------------------------------------------------------
        tar_cmd = (
            f"sudo tar -czf - -C {safe_source} . 2>/dev/null | base64 -w 0"
        )
        try:
            tar_result = await asyncio.wait_for(conn.run(tar_cmd), timeout=300)
            if tar_result.exit_status != 0:
                error_msg = (tar_result.stderr or "").strip()[:200]
                results.append(
                    VolumeBackupData(
                        volume_name=volume_name,
                        source_path=source,
                        size_bytes=size_bytes,
                        error=f"tar failed: {error_msg}",
                    )
                )
                continue

            data_b64 = (tar_result.stdout or "").strip()
            results.append(
                VolumeBackupData(
                    volume_name=volume_name,
                    source_path=source,
                    size_bytes=size_bytes,
                    data_base64=data_b64 if data_b64 else None,
                )
            )
        except Exception as exc:
            results.append(
                VolumeBackupData(
                    volume_name=volume_name,
                    source_path=source,
                    size_bytes=size_bytes,
                    error=f"Failed to archive volume: {str(exc)[:200]}",
                )
            )

    return results


async def collect_container_backup(
    instance_row: dict,
    container_config: dict,
    config_commands_map: dict,
) -> tuple[list[ContainerFullBackup], list[str]]:
    """Collect a full container backup from a VyOS instance via SSH.

    Orchestrates SSH connection, runtime status collection, image digest
    retrieval, and volume backup for every container defined in
    *container_config*.

    Args:
        instance_row: Database row dict for the VyOS instance (must include
            SSH fields).
        container_config: The ``container`` section of the VyOS config,
            expected to have a ``"name"`` key mapping container names to
            their config dicts.  Each container config may contain a
            ``"volume"`` dict whose values have ``"source"`` and
            ``"destination"`` keys.
        config_commands_map: Mapping of container name to the VyOS
            ``set container name <name> ...`` command block (string).

    Returns:
        A tuple of (backups, errors) where *backups* is a list of
        :class:`ContainerFullBackup` models and *errors* is a list of
        human-readable error strings.
    """
    errors: list[str] = []
    backups: list[ContainerFullBackup] = []

    containers = container_config.get("name", {})
    if not containers:
        return (backups, ["No containers found in config"])

    conn = await open_ssh_connection(instance_row)
    if conn is None:
        return (backups, ["SSH not available"])

    try:
        # -----------------------------------------------------------------
        # Collect runtime statuses
        # -----------------------------------------------------------------
        runtime_statuses = await collect_runtime_status(conn)
        status_by_name: dict[str, ContainerRuntimeStatus] = {
            s.container_name: s for s in runtime_statuses
        }

        # -----------------------------------------------------------------
        # Collect image digests
        # -----------------------------------------------------------------
        image_manifests = await collect_image_digests(conn, containers)
        manifest_by_name: dict[str, ContainerImageManifest] = {
            m.container_name: m for m in image_manifests
        }

        # -----------------------------------------------------------------
        # Per-container: volume backup + assemble full backup
        # -----------------------------------------------------------------
        for container_name, config in containers.items():
            try:
                # Gather volume definitions
                volume_defs: list[dict] = []
                volume_section = config.get("volume", {})
                if isinstance(volume_section, dict):
                    for vol_dest, vol_cfg in volume_section.items():
                        if isinstance(vol_cfg, dict):
                            volume_defs.append({
                                "source": vol_cfg.get("source", ""),
                                "destination": vol_dest,
                            })

                # Backup volumes
                volume_backups = await backup_volumes(
                    conn, container_name, volume_defs
                )

                # Get or create image manifest
                manifest = manifest_by_name.get(container_name)
                if manifest is None:
                    image_ref = config.get("image", "unknown")
                    manifest = ContainerImageManifest(
                        container_name=container_name,
                        image_ref=image_ref,
                        error="Image digest not collected",
                    )

                # Look up config commands for this container
                config_commands = config_commands_map.get(container_name, "")

                backups.append(
                    ContainerFullBackup(
                        container_name=container_name,
                        config_commands=config_commands,
                        volumes=volume_backups,
                        image_manifest=manifest,
                        runtime_status=status_by_name.get(container_name),
                    )
                )
            except Exception as exc:
                errors.append(
                    f"Failed to backup container '{container_name}': "
                    f"{str(exc)[:200]}"
                )
                logger.exception(
                    "Error backing up container %s", container_name
                )

    except Exception as exc:
        errors.append(f"Container backup collection failed: {str(exc)[:200]}")
        logger.exception("Unhandled error during container backup collection")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return (backups, errors)
