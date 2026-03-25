"""Background Jobs Module — PostgreSQL-backed job lifecycle management.

All job state is persisted in the ``background_jobs`` table via asyncpg.
An in-memory dict of ``asyncio.Event`` objects is used **only** for fast,
poll-free cancellation signalling within the same process — the DB column
``cancelRequested`` is the durable source of truth.

Column names in SQL use Prisma's camelCase convention and are always
double-quoted.  The public Python API uses snake_case throughout.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Any
from uuid import uuid4

import asyncpg

logger = logging.getLogger(__name__)

# In-memory cancellation signals — safe because asyncio is single-threaded.
_cancel_events: dict[str, asyncio.Event] = {}

# ---------------------------------------------------------------------------
# Column mapping helpers
# ---------------------------------------------------------------------------

# snake_case kwarg  →  "camelCase" DB column
_FIELD_MAP: dict[str, str] = {
    "status":           "status",
    "progress":         "progress",
    "started_at":       '"startedAt"',
    "finished_at":      '"finishedAt"',
    "result":           "result",
    "error":            "error",
    "cancel_requested": '"cancelRequested"',
}

# DB column (raw key from asyncpg Record) → snake_case API key
_ROW_KEY_MAP: dict[str, str] = {
    "id":              "job_id",
    "triggerId":       "trigger_id",
    "jobType":         "job_type",
    "instanceId":      "instance_id",
    "instanceName":    "instance_name",
    "siteId":          "site_id",
    "siteName":        "site_name",
    "userId":          "user_id",
    "status":          "status",
    "progress":        "progress",
    "createdAt":       "created_at",
    "startedAt":       "started_at",
    "finishedAt":      "finished_at",
    "result":          "result",
    "log":             "log",
    "error":           "error",
    "cancelRequested": "cancel_requested",
}


def _row_to_dict(row: asyncpg.Record) -> dict:
    """Convert an asyncpg Record to a JSON-friendly dict.

    * Renames camelCase DB columns to snake_case.
    * Converts ``datetime`` fields to ISO-8601 strings.
    """
    out: dict[str, Any] = {}
    for db_key, api_key in _ROW_KEY_MAP.items():
        value = row.get(db_key)
        # datetime → ISO string
        if isinstance(value, datetime):
            value = value.isoformat()
        out[api_key] = value
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def create_job(
    pool: asyncpg.Pool,
    *,
    trigger_id: str,
    job_type: str,
    instance_id: str,
    instance_name: str,
    site_id: str,
    site_name: str,
    user_id: str,
) -> str:
    """Insert a new job row and return its id.

    Also pre-creates an in-memory ``asyncio.Event`` so that cancellation
    can be signalled immediately once the job starts running.
    """
    job_id = str(uuid4())

    await pool.execute(
        """
        INSERT INTO background_jobs (
            id, "triggerId", "jobType",
            "instanceId", "instanceName",
            "siteId", "siteName",
            "userId",
            status, progress,
            "createdAt", log
        ) VALUES (
            $1, $2, $3,
            $4, $5,
            $6, $7,
            $8,
            'queued', 0,
            $9, '[]'::jsonb
        )
        """,
        job_id,
        trigger_id,
        job_type,
        instance_id,
        instance_name,
        site_id,
        site_name,
        user_id,
        datetime.utcnow(),
    )

    # Pre-create cancel event (unset by default)
    _cancel_events[job_id] = asyncio.Event()

    logger.info("Created background job %s (type=%s, trigger=%s)", job_id, job_type, trigger_id)
    return job_id


async def get_job(pool: asyncpg.Pool, job_id: str) -> Optional[dict]:
    """Fetch a single job by id, or ``None`` if not found."""
    row = await pool.fetchrow(
        'SELECT * FROM background_jobs WHERE id = $1',
        job_id,
    )
    if row is None:
        return None
    return _row_to_dict(row)


async def list_jobs(
    pool: asyncpg.Pool,
    *,
    user_id: Optional[str] = None,
    site_id: Optional[str] = None,
    trigger_id: Optional[str] = None,
    is_admin: bool = False,
) -> list[dict]:
    """Return jobs matching the supplied filters.

    Non-admin callers are automatically scoped to their own ``userId``.
    """
    conditions: list[str] = []
    params: list[Any] = []
    idx = 1  # asyncpg param counter

    # Non-admin users can only see their own jobs
    if not is_admin and user_id is not None:
        conditions.append(f'"userId" = ${idx}')
        params.append(user_id)
        idx += 1

    if site_id is not None:
        conditions.append(f'"siteId" = ${idx}')
        params.append(site_id)
        idx += 1

    if trigger_id is not None:
        conditions.append(f'"triggerId" = ${idx}')
        params.append(trigger_id)
        idx += 1

    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    query = f'SELECT * FROM background_jobs{where} ORDER BY "createdAt" DESC'

    rows = await pool.fetch(query, *params)
    return [_row_to_dict(r) for r in rows]


async def update_job(pool: asyncpg.Pool, job_id: str, **kwargs: Any) -> None:
    """Update one or more fields on an existing job.

    Accepted keyword arguments (snake_case):
        status, progress, started_at, finished_at, result, error,
        cancel_requested

    The ``result`` value is serialised to JSON before storage (JSONB column).
    """
    if not kwargs:
        return

    sets: list[str] = []
    params: list[Any] = []
    idx = 1

    for key, value in kwargs.items():
        col = _FIELD_MAP.get(key)
        if col is None:
            raise ValueError(f"update_job: unknown field '{key}'")

        # JSONB column — serialise Python objects
        if key == "result" and value is not None:
            value = json.dumps(value)
            sets.append(f"{col} = ${idx}::jsonb")
        else:
            sets.append(f"{col} = ${idx}")

        params.append(value)
        idx += 1

    params.append(job_id)
    query = f'UPDATE background_jobs SET {", ".join(sets)} WHERE id = ${idx}'

    await pool.execute(query, *params)


async def append_log(pool: asyncpg.Pool, job_id: str, message: str) -> None:
    """Append a timestamped message to the job's JSONB log array."""
    entry = f"[{datetime.utcnow().isoformat()}] {message}"

    await pool.execute(
        """
        UPDATE background_jobs
        SET log = log || $1::jsonb
        WHERE id = $2
        """,
        json.dumps([entry]),
        job_id,
    )


async def request_cancel(pool: asyncpg.Pool, job_id: str) -> bool:
    """Request cancellation of a queued or running job.

    Sets the durable DB flag **and** the in-memory event so that the
    executing coroutine can react without polling the database.

    Returns ``True`` if the job was found and still cancellable.
    """
    result = await pool.execute(
        """
        UPDATE background_jobs
        SET "cancelRequested" = true
        WHERE id = $1 AND status IN ('queued', 'running')
        """,
        job_id,
    )

    # asyncpg returns e.g. "UPDATE 1" — extract affected row count
    affected = int(result.split()[-1])

    if affected > 0:
        evt = _cancel_events.get(job_id)
        if evt is not None:
            evt.set()
        logger.info("Cancel requested for job %s", job_id)
        return True

    return False


def is_cancelled(job_id: str) -> bool:
    """Fast, synchronous check against the in-memory event.

    Returns ``False`` if the job has no event (e.g. from a previous process).
    """
    evt = _cancel_events.get(job_id)
    if evt is None:
        return False
    return evt.is_set()


async def prune_old_jobs(pool: asyncpg.Pool, max_age_hours: int = 24) -> int:
    """Housekeeping: clean up stale and old jobs.

    1. Mark any ``queued`` / ``running`` jobs as ``failed`` (server-restart
       recovery — these jobs are no longer being executed).
    2. Delete completed/failed/cancelled jobs whose ``finishedAt`` is older
       than *max_age_hours*.
    3. Remove orphaned in-memory cancel events.

    Returns the total number of rows affected (marked + deleted).
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=max_age_hours)
    total = 0

    async with pool.acquire() as conn:
        # 1. Mark stale running/queued jobs as failed
        stale_result = await conn.execute(
            """
            UPDATE background_jobs
            SET status = 'failed',
                error = 'Server restarted while job was in progress',
                "finishedAt" = $1
            WHERE status IN ('queued', 'running')
            """,
            now,
        )
        stale_count = int(stale_result.split()[-1])
        total += stale_count
        if stale_count:
            logger.info("Marked %d stale jobs as failed", stale_count)

        # 2. Delete old finished jobs
        delete_result = await conn.execute(
            """
            DELETE FROM background_jobs
            WHERE "finishedAt" < $1
              AND status IN ('completed', 'failed', 'cancelled')
            """,
            cutoff,
        )
        deleted_count = int(delete_result.split()[-1])
        total += deleted_count
        if deleted_count:
            logger.info("Pruned %d old completed jobs", deleted_count)

        # 3. Collect surviving job ids so we can clean up orphaned events
        surviving_ids = {
            row["id"]
            for row in await conn.fetch("SELECT id FROM background_jobs")
        }

    # Remove cancel events that no longer have a matching job row
    orphaned = [jid for jid in _cancel_events if jid not in surviving_ids]
    for jid in orphaned:
        _cancel_events.pop(jid, None)
    if orphaned:
        logger.debug("Cleaned up %d orphaned cancel events", len(orphaned))

    return total


def cleanup_cancel_event(job_id: str) -> None:
    """Remove the in-memory cancel event for a finished job."""
    _cancel_events.pop(job_id, None)
