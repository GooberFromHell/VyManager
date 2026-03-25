"""
WebSocket Authentication

Shared utility for authenticating WebSocket connections via the better-auth
session cookie. Extracted from the monitoring router so that any future
WebSocket endpoint can reuse the same authentication logic without duplication.
"""

from datetime import datetime
from typing import Optional

import asyncpg
from fastapi import WebSocket

from session_cookie import verify_session_cookie


async def authenticate_websocket(websocket: WebSocket) -> Optional[dict]:
    """
    Authenticate a WebSocket connection using the better-auth session cookie.

    Reads the ``better-auth.session_token`` (or its ``__Secure-`` prefixed
    variant) from the WebSocket cookies, verifies the HMAC signature, and
    validates the session against the database.  If the session is valid the
    user's active VyOS instance is looked up and returned.

    Args:
        websocket: The accepted WebSocket connection whose cookies will be
            inspected.

    Returns:
        A dict with keys ``user_id``, ``instance_id``, and ``email`` when
        authentication succeeds, or ``None`` when it fails.  On failure an
        error JSON message is sent to the client and the connection is closed
        before returning.
    """
    db_pool = getattr(websocket.app.state, "db_pool", None)
    if not db_pool:
        await websocket.send_json({"type": "error", "data": "Database not available"})
        await websocket.close()
        return None

    cookies = websocket.cookies
    session_token = cookies.get("better-auth.session_token") or cookies.get(
        "__Secure-better-auth.session_token"
    )

    if not session_token:
        await websocket.send_json({"type": "error", "data": "Not authenticated"})
        await websocket.close()
        return None

    token_id = verify_session_cookie(session_token)
    if not token_id:
        await websocket.send_json({"type": "error", "data": "Invalid session token"})
        await websocket.close()
        return None

    async with db_pool.acquire() as conn:
        session = await conn.fetchrow(
            """
            SELECT s.id, s."userId", s."expiresAt", u.email, u.name
            FROM sessions s
            JOIN users u ON s."userId" = u.id
            WHERE s.token = $1
            """,
            token_id,
        )

        if not session:
            await websocket.send_json({"type": "error", "data": "Session not found"})
            await websocket.close()
            return None

        if session["expiresAt"] < datetime.utcnow():
            await websocket.send_json({"type": "error", "data": "Session expired"})
            await websocket.close()
            return None

        active = await conn.fetchrow(
            """
            SELECT "instanceId" FROM active_sessions WHERE "userId" = $1
            """,
            session["userId"],
        )

        if not active:
            await websocket.send_json({
                "type": "error",
                "data": "No active instance. Connect to an instance first.",
            })
            await websocket.close()
            return None

        return {
            "user_id": session["userId"],
            "instance_id": active["instanceId"],
            "email": session["email"],
        }
