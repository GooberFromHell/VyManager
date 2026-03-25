"""
Artifacts Router — Store/retrieve artifacts with async LanceDB embedding.
Artifacts are files on disk indexed in Kuzu (graph) and LanceDB (vector).
"""

import json
import logging
import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Request, UploadFile, File
from pydantic import BaseModel, Field
from typing import Optional

logger = logging.getLogger("archon.artifacts")
router = APIRouter()


class StoreArtifactRequest(BaseModel):
    task_id: str
    artifact_type: str = "output"
    summary: str
    content: Optional[str] = None
    source_path: Optional[str] = None


class RetrieveRequest(BaseModel):
    artifact_id: Optional[str] = None
    task_id: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/store")
async def store_artifact(req: StoreArtifactRequest, request: Request):
    """Store an artifact: write to disk, index in Kuzu graph, embed in LanceDB."""
    kuzu = request.app.state.kuzu
    lance = request.app.state.lance
    artifacts_path = request.app.state.artifacts_path

    artifact_id = f"art_{req.task_id}_{uuid.uuid4().hex[:8]}"

    # Determine file path
    task_dir = Path(artifacts_path) / req.task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    if req.content:
        # Write content directly
        ext = "json" if req.artifact_type in ("output", "report", "schema") else "md"
        file_path = task_dir / f"{req.artifact_type}.{ext}"
        file_path.write_text(req.content, encoding="utf-8")
    elif req.source_path:
        # Copy from source path
        src = Path(req.source_path)
        if src.exists():
            file_path = task_dir / src.name
            shutil.copy2(str(src), str(file_path))
        else:
            return {"error": f"Source path not found: {req.source_path}"}
    else:
        return {"error": "Provide either content or source_path"}

    rel_path = str(file_path)

    # Index in Kuzu graph
    kuzu.store_artifact(
        task_id=req.task_id,
        artifact_id=artifact_id,
        artifact_type=req.artifact_type,
        path=rel_path,
        summary=req.summary,
    )

    # Embed in LanceDB (async-safe — embedding runs in-process)
    try:
        lance.store_artifact(
            artifact_id=artifact_id,
            task_id=req.task_id,
            summary=req.summary,
            path=rel_path,
            artifact_type=req.artifact_type,
        )
        embedded = True
    except Exception as e:
        logger.warning(f"Embedding failed for {artifact_id}: {e}")
        embedded = False

    logger.info(f"Artifact stored: {artifact_id} at {rel_path} (embedded: {embedded})")

    return {
        "artifact_id": artifact_id,
        "task_id": req.task_id,
        "path": rel_path,
        "embedded": embedded,
    }


@router.post("/retrieve")
async def retrieve_artifact(req: RetrieveRequest, request: Request):
    """Retrieve artifact metadata and content by ID or task ID."""
    kuzu = request.app.state.kuzu

    if req.artifact_id:
        # Direct lookup via LanceDB
        lance = request.app.state.lance
        result = lance.get_artifact(req.artifact_id)
        if result:
            path = result.get("path", "")
            content = None
            if path and Path(path).exists():
                try:
                    content = Path(path).read_text(encoding="utf-8")
                except Exception:
                    content = "[binary or unreadable file]"
            return {
                "artifact_id": result["id"],
                "task_id": result["task_id"],
                "summary": result["summary"],
                "path": path,
                "content": content,
            }
        return {"error": f"Artifact {req.artifact_id} not found"}

    elif req.task_id:
        # Get all artifacts for a task via Kuzu
        artifacts = kuzu.get_task_artifacts(req.task_id)
        results = []
        for a in artifacts:
            path = a.get("path", "")
            content = None
            if path and Path(path).exists():
                try:
                    content = Path(path).read_text(encoding="utf-8")[:5000]
                except Exception:
                    content = "[binary or unreadable]"
            results.append({
                "id": a["id"],
                "type": a["type"],
                "path": path,
                "summary": a["summary"],
                "content_preview": content,
            })
        return {"task_id": req.task_id, "artifacts": results}

    return {"error": "Provide artifact_id or task_id"}


@router.post("/search")
async def search_artifacts(req: SearchRequest, request: Request):
    """Semantic search over all artifact summaries via LanceDB."""
    lance = request.app.state.lance
    results = lance.search_similar(req.query, req.limit)
    return {"query": req.query, "results": results}


@router.get("/by_task/{task_id}")
async def artifacts_by_task(task_id: str, request: Request):
    """List all artifacts produced by a specific task."""
    kuzu = request.app.state.kuzu
    return kuzu.get_task_artifacts(task_id)
