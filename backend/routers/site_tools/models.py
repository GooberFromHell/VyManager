"""
Site Tools Shared Models

Pydantic models used by both backup.py and container_backup.py.
Extracted to break the circular import between these modules.
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional


# ============================================================================
# Container Backup Models
# ============================================================================


class VolumeBackupData(BaseModel):
    """Backup data for a single container volume."""
    volume_name: str
    source_path: str              # Path on the VyOS host filesystem
    size_bytes: Optional[int] = None
    data_base64: Optional[str] = None  # base64-encoded tar.gz of the volume directory
    error: Optional[str] = None


class ContainerImageManifest(BaseModel):
    """Image metadata for a container at backup time."""
    container_name: str
    image_ref: str                # e.g. "ghcr.io/foo/bar:latest"
    image_digest: Optional[str] = None  # sha256:... pinned digest
    image_archive_path: Optional[str] = None  # Future: path to exported .tar for air-gap
    error: Optional[str] = None


class ContainerRuntimeStatus(BaseModel):
    """Runtime state of a container at backup time."""
    container_name: str
    running: bool
    exit_code: Optional[int] = None
    uptime_seconds: Optional[int] = None


class ContainerFullBackup(BaseModel):
    """Complete backup state for a single container — enough to redeploy."""
    container_name: str
    config_commands: str          # The VyOS set commands for this container
    volumes: List[VolumeBackupData] = []
    image_manifest: ContainerImageManifest
    runtime_status: Optional[ContainerRuntimeStatus] = None


# ============================================================================
# Container Restore Models
# ============================================================================


class ContainerRestoreRequest(BaseModel):
    """Request body for restoring a single container."""
    container: ContainerFullBackup


class RestoreStepResult(BaseModel):
    """Result for a single step of the restore process."""
    step: str
    success: bool
    message: str
    error: Optional[str] = None


class ContainerRestoreResponse(BaseModel):
    """Response from a container restore operation."""
    success: bool
    container_name: str
    steps: List[RestoreStepResult]


# ============================================================================
# Instance Backup Models
# ============================================================================


class InstanceBackupResult(BaseModel):
    """Backup result for a single VyOS instance."""

    instance_id: str
    instance_name: str
    host: str
    vyos_version: Optional[str] = None
    status: str  # "success" | "failed" | "skipped"
    config: Optional[Dict[str, Any]] = None
    config_commands: Optional[str] = None
    error: Optional[str] = None
    backed_up_at: Optional[str] = None
    containers: Optional[List[ContainerFullBackup]] = None
    container_backup_errors: List[str] = []


class SiteBackupResponse(BaseModel):
    """Full site backup containing metadata and per-instance configs."""

    metadata: Dict[str, Any]
    instances: List[InstanceBackupResult]


class TriggerBackupResponse(BaseModel):
    """Response from triggering a site backup (HTTP 202)."""
    trigger_id: str
    job_ids: List[str]
