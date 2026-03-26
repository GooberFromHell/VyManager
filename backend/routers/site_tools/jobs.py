"""
Background Jobs Router

API endpoints for listing, viewing, cancelling, and downloading
background job results. Accessible at /session/jobs.

Auth: Requires authenticated user (via request.state.user).
RBAC: ADMIN sees all jobs; non-ADMIN sees own jobs only.
No active VyOS instance required.
"""

import io
import json
import logging
import re
import zipfile
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

import background_jobs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/session/jobs", tags=["background-jobs"])


# ============================================================================
# Helpers
# ============================================================================


async def _get_user_and_pool(request: Request):
    """Extract authenticated user, role, and DB pool from request."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    db_pool = getattr(request.app.state, "db_pool", None)
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")

    user_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    # Get user role
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow('SELECT role FROM users WHERE id = $1', user_id)

    role = row["role"] if row else "VIEWER"
    is_admin = role == "ADMIN"

    return user_id, is_admin, db_pool


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/")
async def list_jobs(
    request: Request,
    site_id: Optional[str] = None,
    trigger_id: Optional[str] = None,
):
    """List background jobs.

    ADMIN users see all jobs; non-ADMIN users see only their own.
    Optionally filter by ``site_id`` and/or ``trigger_id`` query params.
    """
    user_id, is_admin, db_pool = await _get_user_and_pool(request)

    jobs = await background_jobs.list_jobs(
        db_pool,
        user_id=user_id,
        site_id=site_id,
        trigger_id=trigger_id,
        is_admin=is_admin,
    )

    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_job(request: Request, job_id: str):
    """Get a single background job by ID.

    Returns 404 if the job does not exist.
    Returns 403 if the caller is not the job owner and not an ADMIN.
    """
    user_id, is_admin, db_pool = await _get_user_and_pool(request)

    job = await background_jobs.get_job(db_pool, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Non-admin users can only view their own jobs
    if not is_admin and job.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return job


@router.delete("/{job_id}")
async def cancel_job(request: Request, job_id: str):
    """Cancel a queued or running background job.

    Returns 404 if the job does not exist.
    Returns 403 if the caller is not the job owner and not an ADMIN.
    """
    user_id, is_admin, db_pool = await _get_user_and_pool(request)

    job = await background_jobs.get_job(db_pool, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Non-admin users can only cancel their own jobs
    if not is_admin and job.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    cancelled = await background_jobs.request_cancel(db_pool, job_id)

    if cancelled:
        return {"success": True, "message": "Cancellation requested"}
    else:
        return {
            "success": False,
            "message": "Job is not cancellable (already finished or not found)",
        }


@router.get("/{job_id}/download")
async def download_job_result(request: Request, job_id: str):
    """Download a completed job's result as a JSON file attachment.

    Only available for jobs with status ``success`` that contain a result.
    Returns 404 if the job does not exist.
    Returns 403 if the caller is not the job owner and not an ADMIN.
    Returns 400 if the job has not completed successfully.
    """
    user_id, is_admin, db_pool = await _get_user_and_pool(request)

    job = await background_jobs.get_job(db_pool, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Non-admin users can only download their own job results
    if not is_admin and job.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if job.get("status") != "success":
        raise HTTPException(
            status_code=400,
            detail=f"Job is not downloadable (status: {job.get('status')})",
        )

    result = job.get("result")
    if result is None:
        raise HTTPException(status_code=400, detail="Job has no result data")

    # Build a safe filename from instance name and timestamp
    instance_name = job.get("instance_name") or "unknown"
    sanitized_name = re.sub(r"[^a-zA-Z0-9]", "_", instance_name)

    timestamp = job.get("finished_at") or job.get("created_at") or "unknown"
    # Strip fractional seconds and timezone info for a clean filename
    sanitized_timestamp = re.sub(r"[^0-9T\-]", "", str(timestamp).split(".")[0])

    filename = f"backup_{sanitized_name}_{sanitized_timestamp}.json"

    # Serialize result to pretty-printed JSON
    if isinstance(result, str):
        # Already a string — try to re-parse for pretty printing
        try:
            result = json.loads(result)
        except (json.JSONDecodeError, TypeError):
            pass

    content = json.dumps(result, indent=2, default=str)

    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.get("/trigger/{trigger_id}/download")
async def download_trigger_backup(request: Request, trigger_id: str):
    """Download all completed backups for a trigger as a single ZIP file.

    The ZIP contains one subdirectory per instance, each holding a
    ``backup.json`` with the instance's backup result.

    Returns 404 if the trigger has no jobs.
    Returns 400 if no jobs in the trigger have downloadable results.
    """
    user_id, is_admin, db_pool = await _get_user_and_pool(request)

    jobs = await background_jobs.list_jobs(
        db_pool,
        user_id=user_id,
        trigger_id=trigger_id,
        is_admin=is_admin,
    )

    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found for this trigger")

    # Collect jobs that have downloadable results
    downloadable = [
        j for j in jobs
        if j.get("status") in ("success", "partial") and j.get("result") is not None
    ]

    if not downloadable:
        raise HTTPException(
            status_code=400,
            detail="No completed backups available for download",
        )

    # Build ZIP in memory
    site_name = downloadable[0].get("site_name") or "site"
    sanitized_site = re.sub(r"[^a-zA-Z0-9]", "_", site_name)

    timestamp = downloadable[0].get("created_at") or "unknown"
    sanitized_ts = re.sub(r"[^0-9T\-]", "", str(timestamp).split(".")[0])

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for job in downloadable:
            instance_name = job.get("instance_name") or "unknown"
            sanitized_instance = re.sub(r"[^a-zA-Z0-9_-]", "_", instance_name)

            result = job.get("result")
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except (json.JSONDecodeError, TypeError):
                    pass

            content = json.dumps(result, indent=2, default=str)
            zf.writestr(f"{sanitized_instance}/backup.json", content)

    zip_bytes = buf.getvalue()
    filename = f"backup_{sanitized_site}_{sanitized_ts}.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
