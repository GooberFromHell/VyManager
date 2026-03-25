"""
ARCHON MCP Bridge — Unified infrastructure interface for agentic orchestration.
All agent-infrastructure interaction routes through this single FastAPI service.
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.kuzu_client import KuzuClient
from db.lance_client import LanceClient
from db.redis_client import RedisClient
from routers import context, artifacts, coordination, scripts

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("archon-bridge")

kuzu: KuzuClient = None
lance: LanceClient = None
redis: RedisClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global kuzu, lance, redis

    logger.info("Initializing ARCHON infrastructure...")

    kuzu = KuzuClient(os.environ.get("KUZU_DB_PATH", "/app/data/graph"))
    kuzu.initialize_schema()
    logger.info(f"Kuzu graph database ready at {kuzu.db_path}")

    lance = LanceClient(os.environ.get("LANCE_DB_PATH", "/app/data/vectors"))
    lance.initialize()
    logger.info(f"LanceDB vector store ready at {lance.db_path}")

    redis = RedisClient(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
    await redis.connect()
    logger.info("Redis connection established")

    app.state.kuzu = kuzu
    app.state.lance = lance
    app.state.redis = redis
    app.state.artifacts_path = os.environ.get("ARTIFACTS_PATH", "/app/data/artifacts")
    app.state.workspace_path = os.environ.get("WORKSPACE_PATH", "/app/workspace")
    app.state.scripts_path = os.environ.get("SCRIPTS_PATH", "/app/scripts")
    app.state.ollama_url = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")

    logger.info("ARCHON MCP Bridge fully initialized.")
    yield

    await redis.disconnect()
    logger.info("ARCHON MCP Bridge shut down.")


app = FastAPI(
    title="ARCHON MCP Bridge",
    description="Unified infrastructure interface for ARCHON agentic orchestration",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(context.router, prefix="/context", tags=["Context"])
app.include_router(artifacts.router, prefix="/artifacts", tags=["Artifacts"])
app.include_router(coordination.router, prefix="/coordination", tags=["Coordination"])
app.include_router(scripts.router, prefix="/scripts", tags=["Scripts"])


@app.get("/health")
async def health():
    checks = {
        "kuzu": app.state.kuzu is not None,
        "lance": app.state.lance is not None,
        "redis": await app.state.redis.ping() if app.state.redis else False,
    }
    healthy = all(checks.values())
    return {"status": "healthy" if healthy else "degraded", "checks": checks, "framework": "ARCHON v2.0.0"}


@app.get("/status")
async def status():
    kuzu_client: KuzuClient = app.state.kuzu
    redis_client: RedisClient = app.state.redis

    task_counts = kuzu_client.query_single("""
        MATCH (t:Task)
        RETURN
            count(CASE WHEN t.status = 'complete' THEN 1 END) AS complete,
            count(CASE WHEN t.status = 'in_progress' THEN 1 END) AS active,
            count(CASE WHEN t.status = 'queued' THEN 1 END) AS queued,
            count(CASE WHEN t.status = 'blocked' THEN 1 END) AS blocked,
            count(*) AS total
    """) or {"complete": 0, "active": 0, "queued": 0, "blocked": 0, "total": 0}

    script_count = await redis_client.get("script_cache:count") or "0"

    return {
        "framework": "ARCHON",
        "version": "2.0.0",
        "tasks": task_counts,
        "scripts_cached": int(script_count),
    }
