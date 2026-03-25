"""
File Browser Router

Provides SFTP-based file system browsing and transfer operations for VyOS devices.

Architecture:
  Browser <--HTTP--> FastAPI <--SFTP (asyncssh)--> VyOS Device

Endpoints:
  GET  /vyos/file-browser/list      — List directory contents
  GET  /vyos/file-browser/read      — Preview text file contents
  GET  /vyos/file-browser/download  — Stream file download
  POST /vyos/file-browser/upload    — Upload file to device
  POST /vyos/file-browser/mkdir     — Create directory
  POST /vyos/file-browser/rename    — Rename or move a file/directory
  DELETE /vyos/file-browser/delete  — Delete file or empty directory
"""

import stat
import logging
import posixpath
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

import asyncssh
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse

from ssh_key_manager import decrypt_private_key
from rbac_permissions import FeatureGroup
from fastapi_permissions import require_read_permission, require_write_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/file-browser", tags=["file-browser"])

# Maximum file size for in-memory preview (1 MB)
_DEFAULT_MAX_PREVIEW_SIZE = 1_048_576

# Maximum upload size (100 MB)
_MAX_UPLOAD_SIZE = 100 * 1_024 * 1_024

# Chunk size for streaming downloads (64 KB)
_DOWNLOAD_CHUNK_SIZE = 65_536


# =============================================================================
# Helpers
# =============================================================================


def _validate_path(path: str) -> str:
    """
    Sanitise and normalise a remote filesystem path.

    Args:
        path: Raw path string supplied by the caller.

    Returns:
        A clean, absolute POSIX path.

    Raises:
        HTTPException(400): If the path contains null bytes.
    """
    path = path.strip()

    if "\x00" in path:
        raise HTTPException(status_code=400, detail="Path must not contain null bytes.")

    path = posixpath.normpath(path)

    if not path.startswith("/"):
        path = "/" + path

    return path


def _permissions_string(mode: Optional[int]) -> str:
    """
    Convert a raw stat mode integer to a 9-character rwx string.

    ``stat.filemode()`` returns a 10-character string like ``-rwxr-xr-x``
    whose first character encodes the file type; we strip that prefix so
    the returned string is always exactly 9 characters.

    Args:
        mode: Raw ``st_mode`` value from an SFTP ``SFTPAttrs`` object, or
              ``None`` when the server did not return permission bits.

    Returns:
        A 9-character string such as ``"rwxr-xr-x"``, or ``"---------"``
        when *mode* is ``None``.
    """
    if mode is None:
        return "---------"
    return stat.filemode(mode)[1:]


def _entry_type(attrs: asyncssh.SFTPAttrs) -> str:
    """
    Classify an SFTP directory entry as file, directory, symlink, or other.

    Args:
        attrs: Attribute object returned by asyncssh for a directory entry.

    Returns:
        One of ``"directory"``, ``"symlink"``, ``"file"``, or ``"other"``.
    """
    if attrs.permissions is None:
        return "other"

    mode = attrs.permissions
    if stat.S_ISDIR(mode):
        return "directory"
    if stat.S_ISLNK(mode):
        return "symlink"
    if stat.S_ISREG(mode):
        return "file"
    return "other"


@asynccontextmanager
async def _get_sftp_client(request: Request):
    """
    Async context manager that opens an SFTP connection to the user's active
    VyOS instance and yields the SFTP client.

    The SSH and SFTP resources are always cleaned up on exit, even if the
    caller raises.

    Args:
        request: The incoming FastAPI request.  Must have ``request.state.user``
                 and ``request.state.instance`` populated by the session
                 middleware.

    Yields:
        An open ``asyncssh.SFTPClient``.

    Raises:
        HTTPException(400): SSH key is not configured on the instance.
        HTTPException(500): Key decryption or SSH connection failed.
    """
    user_id: str = request.state.user["id"]
    instance_id: str = request.state.instance["id"]
    db_pool = request.app.state.db_pool

    ssh_conn: Optional[asyncssh.SSHClientConnection] = None
    sftp: Optional[asyncssh.SFTPClient] = None

    try:
        # ------------------------------------------------------------------
        # Fetch instance SSH configuration
        # ------------------------------------------------------------------
        async with db_pool.acquire() as conn:
            instance = await conn.fetchrow(
                """
                SELECT host, "sshPort", "sshUsername", "sshEncryptedPrivKey",
                       "sshKeyNonce", "sshKeyConfigured"
                FROM instances WHERE id = $1
                """,
                instance_id,
            )

        if not instance:
            raise HTTPException(status_code=404, detail="Instance not found.")

        if not instance["sshKeyConfigured"]:
            raise HTTPException(
                status_code=400,
                detail=(
                    "SSH key not configured. "
                    "Set it up via Sites > Edit Instance > SSH / Monitoring."
                ),
            )

        if not instance["sshEncryptedPrivKey"] or not instance["sshKeyNonce"]:
            raise HTTPException(
                status_code=400,
                detail=(
                    "SSH private key not found. "
                    "Regenerate the SSH key in instance settings."
                ),
            )

        ssh_username: str = instance["sshUsername"] or "vyos"

        # ------------------------------------------------------------------
        # Decrypt private key and import it
        # ------------------------------------------------------------------
        try:
            private_key_pem = decrypt_private_key(
                instance["sshEncryptedPrivKey"],
                instance["sshKeyNonce"],
            )
            private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                "file-browser: key decryption failed for instance %s user %s: %s",
                instance_id,
                user_id,
                exc,
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to decrypt SSH key: {exc}",
            ) from exc

        # ------------------------------------------------------------------
        # Open SSH connection and start SFTP client
        # ------------------------------------------------------------------
        try:
            ssh_conn = await asyncssh.connect(
                instance["host"],
                port=instance["sshPort"],
                username=ssh_username,
                client_keys=[private_key],
                known_hosts=None,
            )
            sftp = await ssh_conn.start_sftp_client()
        except HTTPException:
            raise
        except (OSError, asyncssh.Error) as exc:
            logger.error(
                "file-browser: SSH/SFTP connection failed for instance %s: %s",
                instance_id,
                exc,
            )
            raise HTTPException(
                status_code=500,
                detail=f"SSH connection failed: {exc}",
            ) from exc

        yield sftp

    finally:
        if sftp is not None:
            try:
                sftp.exit()
            except Exception:
                pass
        if ssh_conn is not None:
            try:
                ssh_conn.close()
            except Exception:
                pass


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/list")
async def list_directory(
    request: Request,
    path: str = Query(default="/"),
) -> dict:
    """
    List the contents of a remote directory.

    Returns entries sorted with directories first, then alphabetically by name.
    The ``.`` and ``..`` pseudo-entries are always excluded.

    Args:
        request: Incoming HTTP request.
        path: Absolute path on the VyOS device (default: ``/``).

    Returns:
        ``{"path": str, "entries": [{"name", "type", "size", "permissions",
        "modified", "owner", "group"}, ...]}``
    """
    await require_read_permission(request, FeatureGroup.FILE_BROWSER)

    path = _validate_path(path)

    try:
        async with _get_sftp_client(request) as sftp:
            entries_raw = await sftp.readdir(path)
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied: {path}")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser list_directory unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    entries = []
    for entry in entries_raw:
        name: str = entry.filename
        if name in (".", ".."):
            continue

        attrs: asyncssh.SFTPAttrs = entry.attrs
        entries.append(
            {
                "name": name,
                "type": _entry_type(attrs),
                "size": attrs.size if attrs.size is not None else 0,
                "permissions": _permissions_string(attrs.permissions),
                "modified": (
                    datetime.fromtimestamp(attrs.mtime, tz=timezone.utc).isoformat()
                    if attrs.mtime is not None
                    else None
                ),
                "owner": str(attrs.uid) if attrs.uid is not None else "0",
                "group": str(attrs.gid) if attrs.gid is not None else "0",
            }
        )

    # Directories first, then alphabetical within each group
    entries.sort(key=lambda e: (0 if e["type"] == "directory" else 1, e["name"].lower()))

    return {"path": path, "entries": entries}


@router.get("/read")
async def read_file(
    request: Request,
    path: str = Query(...),
    max_size: int = Query(default=_DEFAULT_MAX_PREVIEW_SIZE),
) -> dict:
    """
    Read and return the text content of a remote file for preview.

    Binary files and files that exceed *max_size* bytes are signalled via
    ``content: null`` with a descriptive message rather than raising an error.

    Args:
        request: Incoming HTTP request.
        path: Absolute path to the file on the VyOS device.
        max_size: Maximum byte count to read (default: 1 MB).

    Returns:
        ``{"path", "content", "size", "truncated", "binary", "message"}``
        (not all keys are present in every response).
    """
    await require_read_permission(request, FeatureGroup.FILE_BROWSER)

    path = _validate_path(path)

    try:
        async with _get_sftp_client(request) as sftp:
            file_attrs = await sftp.stat(path)
            size: int = file_attrs.size if file_attrs.size is not None else 0

            if size > max_size:
                return {
                    "path": path,
                    "content": None,
                    "size": size,
                    "truncated": True,
                    "message": "File too large for preview",
                }

            raw: bytes = await sftp.get(path, preserve=False)
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied: {path}")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser read_file unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return {
            "path": path,
            "content": None,
            "size": size,
            "binary": True,
            "message": "Binary file cannot be previewed",
        }

    return {"path": path, "content": text, "size": size, "truncated": False}


@router.get("/download")
async def download_file(
    request: Request,
    path: str = Query(...),
) -> StreamingResponse:
    """
    Stream a file from the VyOS device to the client as a download.

    The SFTP connection is held open for the entire duration of the stream
    and released in a ``finally`` block inside the async generator so that
    no resources are leaked regardless of whether the client disconnects early.

    Args:
        request: Incoming HTTP request.
        path: Absolute path to the file on the VyOS device.

    Returns:
        A streaming ``application/octet-stream`` response with a
        ``Content-Disposition: attachment`` header.
    """
    await require_read_permission(request, FeatureGroup.FILE_BROWSER)

    path = _validate_path(path)
    filename = posixpath.basename(path) or "download"

    # We need the file size upfront for the Content-Length header.  Open a
    # short-lived SFTP connection just to stat the file, then the generator
    # opens its own long-lived connection for the actual data transfer.
    try:
        async with _get_sftp_client(request) as sftp:
            file_attrs = await sftp.stat(path)
            size: int = file_attrs.size if file_attrs.size is not None else 0
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied: {path}")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser download_file stat error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    async def _stream_file() -> AsyncGenerator[bytes, None]:
        """
        Open the file over SFTP and yield it in 64 KB chunks.

        All SSH/SFTP resources are guaranteed to be released in the
        ``finally`` block even if the caller (or the client) cancels the
        iteration early.
        """
        sftp_file = None
        inner_sftp: Optional[asyncssh.SFTPClient] = None
        inner_conn: Optional[asyncssh.SSHClientConnection] = None

        try:
            # Retrieve the same SSH credentials we already validated above
            instance_id: str = request.state.instance["id"]
            db_pool = request.app.state.db_pool

            async with db_pool.acquire() as conn:
                instance = await conn.fetchrow(
                    """
                    SELECT host, "sshPort", "sshUsername", "sshEncryptedPrivKey",
                           "sshKeyNonce"
                    FROM instances WHERE id = $1
                    """,
                    instance_id,
                )

            private_key_pem = decrypt_private_key(
                instance["sshEncryptedPrivKey"],
                instance["sshKeyNonce"],
            )
            private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
            ssh_username: str = instance["sshUsername"] or "vyos"

            inner_conn = await asyncssh.connect(
                instance["host"],
                port=instance["sshPort"],
                username=ssh_username,
                client_keys=[private_key],
                known_hosts=None,
            )
            inner_sftp = await inner_conn.start_sftp_client()
            sftp_file = await inner_sftp.open(path, "rb")

            while True:
                chunk: bytes = await sftp_file.read(_DOWNLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                yield chunk

        except Exception as exc:
            logger.error("file-browser _stream_file error: %s", exc)
            # Cannot raise HTTPException from inside a generator that has
            # already started streaming; we simply stop yielding.
            return
        finally:
            if sftp_file is not None:
                try:
                    await sftp_file.close()
                except Exception:
                    pass
            if inner_sftp is not None:
                try:
                    inner_sftp.exit()
                except Exception:
                    pass
            if inner_conn is not None:
                try:
                    inner_conn.close()
                except Exception:
                    pass

    return StreamingResponse(
        _stream_file(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(size),
        },
    )


@router.post("/upload")
async def upload_file(
    request: Request,
    path: str = Form(...),
    file: UploadFile = File(...),
) -> dict:
    """
    Upload a file to a directory on the VyOS device.

    The entire file is read into memory before transfer.  Uploads larger
    than 100 MB are rejected with a 413 response.

    Args:
        request: Incoming HTTP request.
        path: Absolute path to the **directory** on the device.
        file: The file to upload (multipart form field).

    Returns:
        ``{"success": true, "path": <full_path>, "size": <bytes>}``
    """
    await require_write_permission(request, FeatureGroup.FILE_BROWSER)

    directory = _validate_path(path)
    safe_filename = posixpath.basename(file.filename or "upload")
    full_path = posixpath.join(directory, safe_filename)

    content = await file.read(_MAX_UPLOAD_SIZE + 1)
    if len(content) > _MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum upload size is {_MAX_UPLOAD_SIZE // (1024 * 1024)} MB.",
        )

    try:
        async with _get_sftp_client(request) as sftp:
            async with sftp.open(full_path, "wb") as remote_file:
                await remote_file.write(content)
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(status_code=404, detail=f"Directory not found: {directory}")
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied: {full_path}")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser upload_file unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    return {"success": True, "path": full_path, "size": len(content)}


@router.post("/mkdir")
async def make_directory(request: Request, body: dict) -> dict:
    """
    Create a new directory on the VyOS device.

    Args:
        request: Incoming HTTP request.
        body: JSON body containing ``{"path": str}``.

    Returns:
        ``{"success": true, "path": <created_path>}``
    """
    await require_write_permission(request, FeatureGroup.FILE_BROWSER)

    raw_path: str = body.get("path", "")
    if not raw_path:
        raise HTTPException(status_code=400, detail="'path' is required.")

    path = _validate_path(raw_path)

    try:
        async with _get_sftp_client(request) as sftp:
            await sftp.mkdir(path)
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(
            status_code=404,
            detail=f"Parent directory not found for: {path}",
        )
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied: {path}")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser make_directory unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    return {"success": True, "path": path}


@router.post("/rename")
async def rename_path(request: Request, body: dict) -> dict:
    """
    Rename or move a file or directory on the VyOS device.

    Args:
        request: Incoming HTTP request.
        body: JSON body containing ``{"old_path": str, "new_path": str}``.

    Returns:
        ``{"success": true, "old_path": str, "new_path": str}``
    """
    await require_write_permission(request, FeatureGroup.FILE_BROWSER)

    raw_old: str = body.get("old_path", "")
    raw_new: str = body.get("new_path", "")

    if not raw_old or not raw_new:
        raise HTTPException(
            status_code=400, detail="Both 'old_path' and 'new_path' are required."
        )

    old_path = _validate_path(raw_old)
    new_path = _validate_path(raw_new)

    try:
        async with _get_sftp_client(request) as sftp:
            await sftp.rename(old_path, new_path)
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(status_code=404, detail=f"Path not found: {old_path}")
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied.")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser rename_path unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    return {"success": True, "old_path": old_path, "new_path": new_path}


@router.delete("/delete")
async def delete_path(
    request: Request,
    path: str = Query(...),
) -> dict:
    """
    Delete a file or empty directory on the VyOS device.

    Directories are only removed when they are empty; this is intentional
    to prevent accidental recursive deletion.

    Deletion of the filesystem root (``/``) is explicitly rejected.

    Args:
        request: Incoming HTTP request.
        path: Absolute path to the file or directory to delete.

    Returns:
        ``{"success": true, "path": str}``
    """
    await require_write_permission(request, FeatureGroup.FILE_BROWSER)

    path = _validate_path(path)

    if path == "/":
        raise HTTPException(
            status_code=400, detail="Deletion of the filesystem root is not allowed."
        )

    try:
        async with _get_sftp_client(request) as sftp:
            attrs = await sftp.stat(path)

            if attrs.permissions is not None and stat.S_ISDIR(attrs.permissions):
                await sftp.rmdir(path)
            else:
                await sftp.remove(path)
    except HTTPException:
        raise
    except asyncssh.SFTPNoSuchFile:
        raise HTTPException(status_code=404, detail=f"Path not found: {path}")
    except asyncssh.SFTPPermissionDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied: {path}")
    except asyncssh.SFTPError as exc:
        raise HTTPException(status_code=500, detail=f"SFTP error: {exc}")
    except Exception as exc:
        logger.exception("file-browser delete_path unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    return {"success": True, "path": path}
