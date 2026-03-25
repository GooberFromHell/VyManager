"""
Site Backup Router

Backs up VyOS running configurations from all instances in a site.
Connects to each instance concurrently, fetches full configs, and
returns a structured JSON backup.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import uuid4
import asyncpg
import asyncio
import shlex
from pyvyos import VyDevice
import logging

import background_jobs
from routers.site_tools.container_backup import collect_container_backup
from routers.site_tools.models import (
    VolumeBackupData,
    ContainerImageManifest,
    ContainerRuntimeStatus,
    ContainerFullBackup,
    ContainerRestoreRequest,
    RestoreStepResult,
    ContainerRestoreResponse,
    InstanceBackupResult,
    SiteBackupResponse,
    TriggerBackupResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/session/sites", tags=["site-tools"])

# Track fire-and-forget tasks so they aren't garbage-collected
_running_job_tasks: set[asyncio.Task] = set()


# ============================================================================
# Helpers
# ============================================================================


def _config_to_commands(node: Any, path: List[str] = None) -> List[str]:
    """Convert a VyOS JSON config tree into flat 'set' command lines.

    Walks the nested dict structure and produces one ``set ...`` line per
    leaf value, matching the output of ``show configuration commands``.
    """
    if path is None:
        path = []

    lines: List[str] = []

    if isinstance(node, dict):
        for key, value in sorted(node.items()):
            lines.extend(_config_to_commands(value, path + [key]))
    elif isinstance(node, list):
        for item in node:
            if isinstance(item, dict):
                lines.extend(_config_to_commands(item, path))
            else:
                lines.append("set " + " ".join(path + [str(item)]))
    else:
        # Leaf value (str, int, bool, etc.)
        val = str(node)
        if val:
            # Quote values containing spaces
            if " " in val:
                val = f"'{val}'"
            lines.append("set " + " ".join(path + [val]))
        else:
            # Empty-value node (e.g. a flag like "set firewall ... enable")
            lines.append("set " + " ".join(path))

    return lines


async def _backup_instance(instance_row) -> InstanceBackupResult:
    """Fetch full running config from a single VyOS instance."""
    instance_id = instance_row["id"]
    instance_name = instance_row["name"]
    host = instance_row["host"]
    vyos_version = instance_row.get("vyosVersion")
    api_key = instance_row.get("apiKey")

    if not api_key:
        return InstanceBackupResult(
            instance_id=instance_id,
            instance_name=instance_name,
            host=host,
            vyos_version=vyos_version,
            status="skipped",
            error="No API key configured",
        )

    try:
        device = VyDevice(
            hostname=host,
            apikey=api_key,
            port=instance_row["port"],
            protocol=instance_row.get("protocol") or "https",
            verify=instance_row.get("verifySsl") or False,
            timeout=15,
        )

        response = await run_in_threadpool(
            device.retrieve_show_config,
            path=[],
        )

        if response.status != 200:
            return InstanceBackupResult(
                instance_id=instance_id,
                instance_name=instance_name,
                host=host,
                vyos_version=vyos_version,
                status="failed",
                error=response.error or f"HTTP {response.status}",
            )

        config = response.result if isinstance(response.result, dict) else {}

        # Generate flat set-commands from the JSON config tree
        config_commands = "\n".join(_config_to_commands(config)) if config else None

        return InstanceBackupResult(
            instance_id=instance_id,
            instance_name=instance_name,
            host=host,
            vyos_version=vyos_version,
            status="success",
            config=config,
            config_commands=config_commands,
            backed_up_at=datetime.utcnow().isoformat(),
        )

    except Exception as e:
        return InstanceBackupResult(
            instance_id=instance_id,
            instance_name=instance_name,
            host=host,
            vyos_version=vyos_version,
            status="failed",
            error=str(e)[:200],
        )


# ============================================================================
# Background Job Helpers
# ============================================================================


async def _finish_cancelled(db_pool, job_id: str) -> None:
    """Mark a job as cancelled in the database."""
    await background_jobs.update_job(
        db_pool, job_id, status="cancelled", finished_at=datetime.utcnow()
    )
    await background_jobs.append_log(db_pool, job_id, "Job cancelled by user")


def _task_done_callback(task: asyncio.Task) -> None:
    """Remove a completed task from the tracking set."""
    _running_job_tasks.discard(task)


async def run_instance_backup_job(
    job_id: str,
    instance_row: dict,
    db_pool: asyncpg.Pool,
) -> None:
    """Background coroutine that backs up a single VyOS instance.

    Updates progress in the background_jobs table as it proceeds through:
      1. Config fetch via VyOS API  (→ 33%)
      2. Container backup via SSH   (→ 66%)
      3. Finalisation               (→ 100%)
    """
    try:
        # -- Mark running -------------------------------------------------------
        await background_jobs.update_job(
            db_pool, job_id, status="running", started_at=datetime.utcnow()
        )
        await background_jobs.append_log(
            db_pool, job_id,
            f"Starting backup for {instance_row['name']} ({instance_row['host']})",
        )

        # -- Step 1: Config fetch -----------------------------------------------
        result = await _backup_instance(instance_row)
        await background_jobs.update_job(db_pool, job_id, progress=33)
        await background_jobs.append_log(
            db_pool, job_id,
            f"Config fetch complete — status={result.status}",
        )

        if result.status in ("failed", "skipped"):
            await background_jobs.update_job(
                db_pool, job_id,
                status="failed",
                progress=100,
                finished_at=datetime.utcnow(),
                result=result.model_dump(),
                error=result.error or f"Config fetch {result.status}",
            )
            return

        # -- Check cancellation -------------------------------------------------
        if background_jobs.is_cancelled(job_id):
            await _finish_cancelled(db_pool, job_id)
            return

        # -- Step 2: Container backup via SSH -----------------------------------
        container_config = (result.config or {}).get("container", {})
        containers = container_config.get("name", {})
        ssh_configured = bool(instance_row.get("sshKeyConfigured"))

        if containers:
            if ssh_configured:
                # Build config_commands_map from the fetched config
                config_commands_map: Dict[str, str] = {}
                for cname, cdata in containers.items():
                    cmds = _config_to_commands(cdata, ["container", "name", cname])
                    config_commands_map[cname] = "\n".join(cmds)

                await background_jobs.append_log(
                    db_pool, job_id,
                    f"Collecting container backups for {len(containers)} container(s)",
                )

                container_backups, container_errors = await collect_container_backup(
                    instance_row, container_config, config_commands_map,
                )

                result.containers = container_backups
                result.container_backup_errors = container_errors

                if container_errors:
                    for err in container_errors:
                        await background_jobs.append_log(db_pool, job_id, f"Container warning: {err}")
            else:
                await background_jobs.append_log(
                    db_pool, job_id,
                    "SSH not configured — skipping container volume/image backup "
                    f"({len(containers)} container(s) found in config)",
                )

        await background_jobs.update_job(db_pool, job_id, progress=66)

        # -- Check cancellation -------------------------------------------------
        if background_jobs.is_cancelled(job_id):
            await _finish_cancelled(db_pool, job_id)
            return

        # -- Step 3: Finalise ---------------------------------------------------
        has_container_errors = bool(result.container_backup_errors)
        final_status = "partial" if has_container_errors else "success"

        await background_jobs.update_job(
            db_pool, job_id,
            status=final_status,
            progress=100,
            finished_at=datetime.utcnow(),
            result=result.model_dump(),
        )
        await background_jobs.append_log(
            db_pool, job_id,
            f"Backup complete — status={final_status}",
        )

    except asyncio.CancelledError:
        await _finish_cancelled(db_pool, job_id)

    except Exception as exc:
        logger.exception("Background backup job %s failed", job_id)
        try:
            await background_jobs.update_job(
                db_pool, job_id,
                status="failed",
                progress=100,
                finished_at=datetime.utcnow(),
                error=str(exc)[:500],
            )
            await background_jobs.append_log(
                db_pool, job_id, f"Job failed: {str(exc)[:300]}"
            )
        except Exception:
            logger.exception("Failed to update job %s after error", job_id)

    finally:
        background_jobs.cleanup_cancel_event(job_id)


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/{site_id}/backup", response_model=TriggerBackupResponse, status_code=202)
async def backup_site(request: Request, site_id: str):
    """
    Trigger background backups for all instances in a site.

    Returns HTTP 202 immediately with a trigger_id and per-instance job_ids.
    Use the background jobs API to poll for progress and results.

    Requires platform ADMIN role.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Verify user is platform ADMIN
            user_role = await conn.fetchval(
                "SELECT role FROM users WHERE id = $1",
                user_id,
            )
            if user_role != "ADMIN":
                raise HTTPException(
                    status_code=403,
                    detail="Only ADMIN users can perform site backups",
                )

            # Get site info
            site = await conn.fetchrow(
                'SELECT id, name, description FROM sites WHERE id = $1',
                site_id,
            )
            if not site:
                raise HTTPException(status_code=404, detail="Site not found")

            # Fetch all instances in the site (include SSH fields)
            instances = await conn.fetch(
                """
                SELECT id, name, host, port, "apiKey", protocol, "verifySsl",
                       "vyosVersion", "sshPort", "sshUsername",
                       "sshEncryptedPrivKey", "sshKeyNonce", "sshKeyConfigured"
                FROM instances
                WHERE "siteId" = $1
                ORDER BY name
                """,
                site_id,
            )

        if not instances:
            raise HTTPException(
                status_code=400,
                detail="Site has no instances to back up",
            )

        # -- Create jobs and launch background tasks ----------------------------
        trigger_id = str(uuid4())
        job_ids: List[str] = []

        for inst in instances:
            inst_dict = dict(inst)

            job_id = await background_jobs.create_job(
                db_pool,
                trigger_id=trigger_id,
                job_type="instance_backup",
                instance_id=inst_dict["id"],
                instance_name=inst_dict["name"],
                site_id=site_id,
                site_name=site["name"],
                user_id=user_id,
            )
            job_ids.append(job_id)

            task = asyncio.create_task(
                run_instance_backup_job(job_id, inst_dict, db_pool)
            )
            task.add_done_callback(_task_done_callback)
            _running_job_tasks.add(task)

        return TriggerBackupResponse(trigger_id=trigger_id, job_ids=job_ids)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in site backup trigger")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post(
    "/{site_id}/instances/{instance_id}/container-restore",
    response_model=ContainerRestoreResponse,
)
async def restore_container(
    request: Request,
    site_id: str,
    instance_id: str,
    body: ContainerRestoreRequest,
):
    """
    Restore a single container to a target VyOS instance.

    Applies the backed-up VyOS config commands, restores volume data over SSH,
    and optionally restarts the container if it was running at backup time.

    Requires platform ADMIN role.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    container = body.container
    steps: List[RestoreStepResult] = []

    try:
        async with db_pool.acquire() as conn:
            # ------------------------------------------------------------------
            # Auth: verify ADMIN role
            # ------------------------------------------------------------------
            user_role = await conn.fetchval(
                "SELECT role FROM users WHERE id = $1",
                user_id,
            )
            if user_role != "ADMIN":
                raise HTTPException(
                    status_code=403,
                    detail="Only ADMIN users can restore containers",
                )

            # ------------------------------------------------------------------
            # Lookup target instance
            # ------------------------------------------------------------------
            instance = await conn.fetchrow(
                """
                SELECT id, name, host, port, "apiKey", protocol, "verifySsl",
                       "sshPort", "sshUsername", "sshEncryptedPrivKey",
                       "sshKeyNonce", "sshKeyConfigured"
                FROM instances
                WHERE id = $1 AND "siteId" = $2
                """,
                instance_id,
                site_id,
            )
            if not instance:
                raise HTTPException(
                    status_code=404,
                    detail="Instance not found in this site",
                )

        # ------------------------------------------------------------------
        # Step 1: Apply VyOS config commands
        # ------------------------------------------------------------------
        api_key = instance.get("apiKey")

        config_lines = [
            line.strip()
            for line in container.config_commands.splitlines()
            if line.strip().startswith("set ")
        ]

        if not config_lines:
            steps.append(
                RestoreStepResult(
                    step="apply_config",
                    success=False,
                    message="No valid config commands found",
                    error="config_commands contained no 'set ...' lines",
                )
            )
        else:
            if not api_key:
                steps.append(
                    RestoreStepResult(
                        step="apply_config",
                        success=False,
                        message="Cannot apply config — no API key on target instance",
                        error="Missing apiKey",
                    )
                )
            else:
                device = VyDevice(
                    hostname=instance["host"],
                    apikey=api_key,
                    port=instance["port"],
                    protocol=instance.get("protocol") or "https",
                    verify=instance.get("verifySsl") or False,
                    timeout=30,
                )

                config_errors: List[str] = []
                applied = 0
                for line in config_lines:
                    # Strip leading "set " to get the path list
                    path_str = line[4:].strip()
                    path_parts = path_str.split()
                    try:
                        resp = await run_in_threadpool(
                            device.configure_set,
                            path=path_parts,
                        )
                        if resp.status == 200:
                            applied += 1
                        else:
                            err = resp.error or f"HTTP {resp.status}"
                            config_errors.append(f"{line}: {err}")
                    except Exception as exc:
                        config_errors.append(f"{line}: {str(exc)[:150]}")

                # Save the configuration
                try:
                    await run_in_threadpool(device.config_file_save)
                except Exception as exc:
                    config_errors.append(f"config_file_save: {str(exc)[:150]}")

                if config_errors:
                    steps.append(
                        RestoreStepResult(
                            step="apply_config",
                            success=applied > 0,
                            message=(
                                f"Applied {applied}/{len(config_lines)} commands"
                            ),
                            error="; ".join(config_errors[:10]),
                        )
                    )
                else:
                    steps.append(
                        RestoreStepResult(
                            step="apply_config",
                            success=True,
                            message=(
                                f"Applied {applied}/{len(config_lines)} commands "
                                f"and saved config"
                            ),
                        )
                    )

        # ------------------------------------------------------------------
        # Step 2: Restore volumes via SSH
        # ------------------------------------------------------------------
        volumes_with_data = [
            v for v in container.volumes if v.data_base64
        ]

        if not volumes_with_data:
            steps.append(
                RestoreStepResult(
                    step="restore_volumes",
                    success=True,
                    message="No volume data to restore",
                )
            )
        else:
            ssh_conn = None
            try:
                from routers.site_tools.container_backup import open_ssh_connection
                ssh_conn = await open_ssh_connection(dict(instance))
                if ssh_conn is None:
                    steps.append(
                        RestoreStepResult(
                            step="restore_volumes",
                            success=False,
                            message="SSH connection not available",
                            error=(
                                "Could not open SSH to target instance — "
                                "SSH key may not be configured"
                            ),
                        )
                    )
                else:
                    for vol in volumes_with_data:
                        safe_path = shlex.quote(vol.source_path)
                        try:
                            # Ensure target directory exists
                            mkdir_cmd = f"sudo mkdir -p {safe_path}"
                            await asyncio.wait_for(
                                ssh_conn.run(mkdir_cmd),
                                timeout=15,
                            )

                            # Pipe base64 data through decoder into tar extract
                            restore_cmd = (
                                f"echo {shlex.quote(vol.data_base64)} "
                                f"| base64 -d "
                                f"| sudo tar -xzf - -C {safe_path}"
                            )
                            result = await asyncio.wait_for(
                                ssh_conn.run(restore_cmd),
                                timeout=300,
                            )

                            if result.exit_status == 0:
                                steps.append(
                                    RestoreStepResult(
                                        step=f"restore_volume:{vol.volume_name}",
                                        success=True,
                                        message=(
                                            f"Restored volume to {vol.source_path}"
                                        ),
                                    )
                                )
                            else:
                                stderr = (result.stderr or "").strip()[:200]
                                steps.append(
                                    RestoreStepResult(
                                        step=f"restore_volume:{vol.volume_name}",
                                        success=False,
                                        message=(
                                            f"tar extract failed for "
                                            f"{vol.source_path}"
                                        ),
                                        error=stderr,
                                    )
                                )
                        except Exception as exc:
                            steps.append(
                                RestoreStepResult(
                                    step=f"restore_volume:{vol.volume_name}",
                                    success=False,
                                    message=(
                                        f"Failed to restore {vol.volume_name}"
                                    ),
                                    error=str(exc)[:200],
                                )
                            )
            finally:
                if ssh_conn is not None:
                    try:
                        ssh_conn.close()
                    except Exception:
                        pass

        # ------------------------------------------------------------------
        # Step 3: Restart container if it was running
        # ------------------------------------------------------------------
        was_running = (
            container.runtime_status is not None
            and container.runtime_status.running
        )
        if was_running:
            try:
                if not api_key:
                    raise ValueError("No API key available")

                device = VyDevice(
                    hostname=instance["host"],
                    apikey=api_key,
                    port=instance["port"],
                    protocol=instance.get("protocol") or "https",
                    verify=instance.get("verifySsl") or False,
                    timeout=30,
                )
                resp = await run_in_threadpool(
                    device.generate,
                    path=["container", "restart", "name", container.container_name],
                )
                if resp.status == 200:
                    steps.append(
                        RestoreStepResult(
                            step="restart_container",
                            success=True,
                            message=(
                                f"Container '{container.container_name}' "
                                f"restart initiated"
                            ),
                        )
                    )
                else:
                    steps.append(
                        RestoreStepResult(
                            step="restart_container",
                            success=False,
                            message="Container restart request failed",
                            error=resp.error or f"HTTP {resp.status}",
                        )
                    )
            except Exception as exc:
                steps.append(
                    RestoreStepResult(
                        step="restart_container",
                        success=False,
                        message="Failed to restart container",
                        error=str(exc)[:200],
                    )
                )
        else:
            steps.append(
                RestoreStepResult(
                    step="restart_container",
                    success=True,
                    message="Container was not running at backup time — skipped restart",
                )
            )

        all_steps_ok = all(s.success for s in steps)
        return ContainerRestoreResponse(
            success=all_steps_ok,
            container_name=container.container_name,
            steps=steps,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in container restore")
        raise HTTPException(status_code=500, detail="Internal server error")
