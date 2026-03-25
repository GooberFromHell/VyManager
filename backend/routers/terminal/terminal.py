"""
Terminal Router

Provides an interactive SSH PTY shell for VyOS devices over WebSocket.

Architecture:
  Browser <--WebSocket--> FastAPI <--SSH PTY (asyncssh)--> VyOS Device

Protocol:
  1. Client connects (authenticated via session cookie)
  2. Server sends: {"type": "status", "data": "Connecting..."}
  3. Client sends: {"type": "init", "cols": 220, "rows": 50}
  4. Server opens interactive PTY shell
  5. Server sends: {"type": "ready"}
  6. Bidirectional I/O:
     - Client sends: {"type": "input", "data": "..."}   (keyboard input)
     - Client sends: {"type": "resize", "cols": N, "rows": N}  (terminal resize)
     - Client sends: {"type": "ping"}  (keep-alive, resets idle timer)
     - Server sends: {"type": "output", "data": "..."}   (shell output)
  7. On timeout or disconnect:
     - Server sends: {"type": "closed", "reason": "..."} then closes
"""

import os
import asyncio
import logging
import time

import asyncssh
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ws_auth import authenticate_websocket
from ssh_key_manager import decrypt_private_key
from rbac_permissions import FeatureGroup, PermissionLevel, check_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/terminal", tags=["terminal"])

# Idle timeout: disconnect after N seconds of no input or output
IDLE_TIMEOUT_SECONDS = int(os.getenv("TERMINAL_IDLE_TIMEOUT", "600"))

# Hard cap: disconnect the session after N seconds regardless of activity
MAX_DURATION_SECONDS = int(os.getenv("TERMINAL_MAX_DURATION", "3600"))

# One PTY session per user at a time: user_id -> running asyncio.Task
_active_terminal_sessions: dict[str, asyncio.Task] = {}


@router.websocket("/ws/shell")
async def websocket_shell(websocket: WebSocket):
    """
    WebSocket endpoint for an interactive SSH PTY shell session.

    Authenticates the caller via the better-auth session cookie, enforces
    MONITORING WRITE permission, then opens an interactive PTY shell on the
    user's active VyOS instance and bridges I/O between the browser and the
    remote process.

    Supported client message types:
        ``init``   – ``{"type": "init", "cols": int, "rows": int}``
                     Must be the first message after connection; supplies the
                     initial terminal dimensions.
        ``input``  – ``{"type": "input", "data": str}``
                     Raw keyboard input forwarded to the shell's stdin.
        ``resize`` – ``{"type": "resize", "cols": int, "rows": int}``
                     Notifies the PTY of a terminal window resize.
        ``ping``   – ``{"type": "ping"}``
                     Keep-alive that resets the idle timeout timer.

    Supported server message types:
        ``status``  – informational progress messages before the shell is ready.
        ``ready``   – shell is open and I/O can begin.
        ``output``  – raw terminal output from the shell.
        ``closed``  – session was terminated; ``reason`` field explains why.
        ``error``   – a fatal error occurred before or during setup.
    """
    await websocket.accept()

    # -------------------------------------------------------------------------
    # Authentication
    # -------------------------------------------------------------------------
    user_info = await authenticate_websocket(websocket)
    if not user_info:
        return

    user_id = user_info["user_id"]
    instance_id = user_info["instance_id"]
    db_pool = websocket.app.state.db_pool

    # -------------------------------------------------------------------------
    # One-session-per-user guard
    # -------------------------------------------------------------------------
    existing = _active_terminal_sessions.get(user_id)
    if existing and not existing.done():
        await websocket.send_json({
            "type": "error",
            "data": "You already have an active terminal session. Close it first.",
        })
        await websocket.close()
        return

    # -------------------------------------------------------------------------
    # Permission check — MONITORING WRITE required to run an interactive shell
    # -------------------------------------------------------------------------
    has_permission = await check_permission(
        db_pool, user_id, instance_id, FeatureGroup.MONITORING, PermissionLevel.WRITE
    )
    if not has_permission:
        await websocket.send_json({
            "type": "error",
            "data": "Insufficient permissions. MONITORING write access is required.",
        })
        await websocket.close()
        return

    ssh_conn = None
    ssh_process = None

    try:
        # -------------------------------------------------------------------------
        # Fetch instance SSH config
        # -------------------------------------------------------------------------
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
            await websocket.send_json({"type": "error", "data": "Instance not found."})
            await websocket.close()
            return

        if not instance["sshKeyConfigured"]:
            await websocket.send_json({
                "type": "error",
                "data": (
                    "SSH key not configured. "
                    "Set it up via Sites > Edit Instance > SSH / Monitoring."
                ),
            })
            await websocket.close()
            return

        if not instance["sshEncryptedPrivKey"] or not instance["sshKeyNonce"]:
            await websocket.send_json({
                "type": "error",
                "data": (
                    "SSH private key not found. "
                    "Regenerate the SSH key in instance settings."
                ),
            })
            await websocket.close()
            return

        ssh_username = instance["sshUsername"] or "vyos"

        # -------------------------------------------------------------------------
        # Decrypt private key
        # -------------------------------------------------------------------------
        try:
            private_key_pem = decrypt_private_key(
                instance["sshEncryptedPrivKey"],
                instance["sshKeyNonce"],
            )
            private_key = asyncssh.import_private_key(private_key_pem.decode("utf-8"))
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "data": f"Failed to decrypt SSH key: {e}",
            })
            await websocket.close()
            return

        # -------------------------------------------------------------------------
        # Ask client for terminal dimensions before connecting
        # -------------------------------------------------------------------------
        await websocket.send_json({"type": "status", "data": "Connecting..."})

        try:
            init_msg = await asyncio.wait_for(websocket.receive_json(), timeout=30)
        except asyncio.TimeoutError:
            await websocket.send_json({
                "type": "error",
                "data": "Timed out waiting for terminal dimensions.",
            })
            await websocket.close()
            return

        cols = int(init_msg.get("cols", 220))
        rows = int(init_msg.get("rows", 50))

        # -------------------------------------------------------------------------
        # Open SSH connection
        # -------------------------------------------------------------------------
        try:
            ssh_conn = await asyncio.wait_for(
                asyncssh.connect(
                    instance["host"],
                    port=instance["sshPort"],
                    username=ssh_username,
                    client_keys=[private_key],
                    known_hosts=None,
                ),
                timeout=15,
            )
        except asyncio.TimeoutError:
            await websocket.send_json({
                "type": "error",
                "data": "SSH connection timed out.",
            })
            await websocket.close()
            return
        except (OSError, asyncssh.Error) as e:
            await websocket.send_json({
                "type": "error",
                "data": f"SSH connection failed: {e}",
            })
            await websocket.close()
            return

        # -------------------------------------------------------------------------
        # Open interactive PTY shell — no command arg opens the login shell
        # -------------------------------------------------------------------------
        ssh_process = await ssh_conn.create_process(
            term_type="xterm-256color",
            term_size=(cols, rows),
        )

        # Register as the user's active session
        _active_terminal_sessions[user_id] = asyncio.current_task()

        session_start = time.monotonic()
        last_activity = time.monotonic()

        await websocket.send_json({"type": "ready"})

        # -------------------------------------------------------------------------
        # Concurrent I/O tasks
        # -------------------------------------------------------------------------

        async def read_ssh_output() -> None:
            """Read PTY stdout and forward to WebSocket client."""
            nonlocal last_activity
            try:
                while True:
                    data = await ssh_process.stdout.read(4096)
                    if not data:
                        # Remote side closed the shell
                        break
                    last_activity = time.monotonic()
                    await websocket.send_json({"type": "output", "data": data})
            except (ConnectionError, WebSocketDisconnect):
                pass
            except asyncssh.Error:
                pass
            except Exception as e:
                logger.debug("read_ssh_output error: %s", e)

        async def read_ws_input() -> None:
            """Receive messages from the WebSocket and act on them."""
            nonlocal last_activity
            try:
                while True:
                    msg = await websocket.receive_json()
                    msg_type = msg.get("type")

                    if msg_type == "input":
                        data = msg.get("data", "")
                        if data:
                            ssh_process.stdin.write(data)
                            last_activity = time.monotonic()

                    elif msg_type == "resize":
                        new_cols = int(msg.get("cols", cols))
                        new_rows = int(msg.get("rows", rows))
                        ssh_process.change_terminal_size(new_cols, new_rows)

                    elif msg_type == "ping":
                        # Client keep-alive — just reset the idle clock
                        last_activity = time.monotonic()

                    # Any other message types are silently ignored

            except (WebSocketDisconnect, ConnectionError):
                pass
            except Exception as e:
                logger.debug("read_ws_input error: %s", e)

        async def check_limits() -> None:
            """Periodically enforce idle and max-duration limits."""
            while True:
                await asyncio.sleep(10)
                now = time.monotonic()

                if now - last_activity >= IDLE_TIMEOUT_SECONDS:
                    await websocket.send_json({
                        "type": "closed",
                        "reason": "Session closed due to inactivity.",
                    })
                    return

                if now - session_start >= MAX_DURATION_SECONDS:
                    await websocket.send_json({
                        "type": "closed",
                        "reason": "Maximum session duration reached (1 hour).",
                    })
                    return

        output_task = asyncio.create_task(read_ssh_output())
        input_task = asyncio.create_task(read_ws_input())
        limits_task = asyncio.create_task(check_limits())

        done, pending = await asyncio.wait(
            [output_task, input_task, limits_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("Unhandled error in websocket_shell: %s", e)
        try:
            await websocket.send_json({"type": "error", "data": str(e)})
        except Exception:
            pass
    finally:
        _active_terminal_sessions.pop(user_id, None)

        if ssh_process:
            try:
                ssh_process.terminate()
            except Exception:
                pass

        if ssh_conn:
            try:
                ssh_conn.close()
            except Exception:
                pass

        try:
            await websocket.send_json({"type": "closed", "reason": "Session ended."})
        except Exception:
            pass

        try:
            await websocket.close()
        except Exception:
            pass
