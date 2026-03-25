"""
Redis Client — Inter-agent coordination: pub/sub, task claiming, locks, semaphores.
The only external service in the stack — justified by sub-millisecond shared mutable state needs.
"""

import json
import logging
from typing import Optional

import redis.asyncio as aioredis

logger = logging.getLogger("archon.redis")


class RedisClient:
    def __init__(self, url: str):
        self.url = url
        self.client: Optional[aioredis.Redis] = None
        self.pubsub: Optional[aioredis.client.PubSub] = None

    async def connect(self):
        self.client = aioredis.from_url(self.url, decode_responses=True)
        self.pubsub = self.client.pubsub()
        logger.info("Redis connected.")

    async def disconnect(self):
        if self.pubsub:
            await self.pubsub.close()
        if self.client:
            await self.client.close()

    async def ping(self) -> bool:
        try:
            return await self.client.ping()
        except Exception:
            return False

    # ── Key-Value ────────────────────────────────────────────────

    async def get(self, key: str) -> Optional[str]:
        return await self.client.get(key)

    async def set(self, key: str, value: str, ttl: int = None):
        if ttl:
            await self.client.setex(key, ttl, value)
        else:
            await self.client.set(key, value)

    async def incr(self, key: str) -> int:
        return await self.client.incr(key)

    # ── Task Coordination ────────────────────────────────────────

    async def claim_task(self, task_id: str, agent_id: str, ttl: int = 300) -> bool:
        """Atomically claim a task. Returns True if this agent got the claim."""
        key = f"task:claim:{task_id}"
        result = await self.client.set(key, agent_id, nx=True, ex=ttl)
        if result:
            logger.info(f"Task {task_id} claimed by {agent_id}")
        return result is not None

    async def release_task(self, task_id: str):
        """Release a task claim."""
        await self.client.delete(f"task:claim:{task_id}")

    async def get_task_owner(self, task_id: str) -> Optional[str]:
        return await self.client.get(f"task:claim:{task_id}")

    async def renew_claim(self, task_id: str, agent_id: str, ttl: int = 300) -> bool:
        """Renew a task claim if the agent is still the owner."""
        key = f"task:claim:{task_id}"
        current = await self.client.get(key)
        if current == agent_id:
            await self.client.expire(key, ttl)
            return True
        return False

    # ── Pub/Sub Signals ──────────────────────────────────────────

    async def signal_complete(self, task_id: str, artifact_path: str = ""):
        """Signal task completion to all listeners."""
        msg = json.dumps({
            "task_id": task_id,
            "status": "complete",
            "artifact_path": artifact_path,
        })
        await self.client.publish(f"task.complete.{task_id}", msg)
        await self.client.publish("task.complete.*", msg)
        logger.info(f"Signaled completion: {task_id}")

    async def signal_failed(self, task_id: str, error: str = ""):
        msg = json.dumps({"task_id": task_id, "status": "failed", "error": error})
        await self.client.publish(f"task.failed.{task_id}", msg)

    async def subscribe(self, pattern: str):
        """Subscribe to a channel pattern."""
        await self.pubsub.psubscribe(pattern)

    async def get_message(self, timeout: float = 1.0) -> Optional[dict]:
        """Get next pub/sub message."""
        msg = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=timeout)
        if msg and msg.get("data"):
            try:
                return json.loads(msg["data"])
            except (json.JSONDecodeError, TypeError):
                return msg
        return None

    # ── Distributed Locks ────────────────────────────────────────

    async def acquire_lock(self, name: str, ttl: int = 30) -> bool:
        return await self.client.set(f"lock:{name}", "1", nx=True, ex=ttl) is not None

    async def release_lock(self, name: str):
        await self.client.delete(f"lock:{name}")

    # ── Script Cache Tracking ────────────────────────────────────

    async def track_script_hit(self, script_id: str):
        await self.incr(f"script:hits:{script_id}")
        await self.incr("script_cache:count")

    async def get_script_stats(self) -> dict:
        keys = []
        async for key in self.client.scan_iter("script:hits:*"):
            hits = await self.client.get(key)
            keys.append({"script": key.replace("script:hits:", ""), "hits": int(hits or 0)})
        return {"scripts": keys, "total_hits": sum(k["hits"] for k in keys)}

    # ── Token Budget Tracking ────────────────────────────────────

    async def track_tokens(self, task_id: str, context_tokens: int, output_tokens: int):
        key = f"tokens:{task_id}"
        await self.client.hset(key, mapping={
            "context": str(context_tokens),
            "output": str(output_tokens),
            "total": str(context_tokens + output_tokens),
        })

    async def get_token_usage(self, task_id: str) -> dict:
        data = await self.client.hgetall(f"tokens:{task_id}")
        return {k: int(v) for k, v in data.items()} if data else {}

    # ── Quorum Coordination ──────────────────────────────────────

    async def submit_quorum_vote(self, quorum_id: str, agent_id: str, result: str) -> int:
        """Submit a vote for quorum consensus. Returns current vote count."""
        key = f"quorum:{quorum_id}:votes"
        await self.client.hset(key, agent_id, result)
        return await self.client.hlen(key)

    async def get_quorum_votes(self, quorum_id: str) -> dict:
        return await self.client.hgetall(f"quorum:{quorum_id}:votes")

    async def clear_quorum(self, quorum_id: str):
        await self.client.delete(f"quorum:{quorum_id}:votes")
