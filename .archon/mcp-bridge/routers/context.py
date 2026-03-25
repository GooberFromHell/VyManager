"""
Context Router — Generates task envelopes from Kuzu graph, performs semantic search via LanceDB.
This is the primary token-optimization endpoint. Agents call this instead of reading raw files.
"""

import json
import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import Optional

logger = logging.getLogger("archon.context")
router = APIRouter()


class EnvelopeRequest(BaseModel):
    task_id: str


class GraphQueryRequest(BaseModel):
    cypher: str
    params: dict = Field(default_factory=dict)


class SemanticSearchRequest(BaseModel):
    query: str
    limit: int = 5


class TaskCreateRequest(BaseModel):
    task_id: str
    objective: str
    agent_role: str
    project_id: str = "default"
    token_budget_in: int = 50000
    token_budget_out: int = 16000
    priority: int = 0
    dependencies: list[str] = Field(default_factory=list)


class TaskStatusUpdate(BaseModel):
    task_id: str
    status: str


def _role_constraints(role: str) -> list[str]:
    """Return role-specific constraints for the context envelope."""
    role_map = {
        "architect": [
            "Focus on design specifications and interface definitions",
            "Do not write implementation code — define contracts only",
        ],
        "implementer": [
            "Follow the architect's specification exactly",
            "Write production-quality code with error handling",
        ],
        "tester": [
            "Write tests that cover edge cases and error paths",
            "Run tests and report results in report.json",
        ],
        "reviewer": [
            "Audit code quality, security, and adherence to specifications",
            "Report findings with severity levels in report.json",
        ],
    }
    return role_map.get(role, [])


# ── Context Envelope — the core ARCHON optimization ────────────────

@router.post("/task_envelope")
async def task_envelope(req: EnvelopeRequest, request: Request):
    """Generate a minimal context envelope for a sub-agent (~400 tokens).
    Replaces full-file context loading with graph-derived precision context."""
    kuzu = request.app.state.kuzu

    task = kuzu.get_task(req.task_id)
    if not task:
        return {"error": f"Task {req.task_id} not found"}

    deps = kuzu.get_task_dependencies(req.task_id)
    dep_entries = []
    for d in deps:
        entry = {
            "task_id": d["task_id"],
            "summary": d.get("artifact_summary") or d.get("objective", "No summary available"),
        }
        if d.get("artifact_path"):
            entry["artifact_path"] = d["artifact_path"]
        dep_entries.append(entry)

    scripts = kuzu.find_cached_script(task.get("t.agent_role", ""), "")

    role_prefix = task.get("t.agent_role", "agent")
    envelope = {
        "role": f"You are a {role_prefix} agent. Execute the task precisely per the objective and constraints.",
        "task": {
            "id": req.task_id,
            "objective": task.get("t.objective", ""),
            "agent_role": task.get("t.agent_role", ""),
            "constraints": [
                f"Token budget: {task.get('t.token_budget_in', 50000)} input / {task.get('t.token_budget_out', 16000)} output",
                "Write output to .archon/workspace/outputs/{task_id}/",
                "Produce report.json following the output-report schema",
            ] + _role_constraints(task.get("t.agent_role", "")),
            "token_budget": {
                "input": task.get("t.token_budget_in", 50000),
                "output": task.get("t.token_budget_out", 16000),
            },
        },
        "dependencies": dep_entries,
        "output_contract": {
            "format": "json",
            "required_file": "report.json",
            "schema_fields": ["task_id", "status", "files_modified", "files_created"],
            "on_failure": "Return {status: 'failed', notes: 'reason', decompose_into: ['subtask1', 'subtask2']}",
        },
    }

    return envelope


@router.post("/create_task")
async def create_task(req: TaskCreateRequest, request: Request):
    """Create a task in the Kuzu graph with dependency edges."""
    kuzu = request.app.state.kuzu
    result = kuzu.create_task(
        task_id=req.task_id, objective=req.objective,
        agent_role=req.agent_role, project_id=req.project_id,
        token_budget_in=req.token_budget_in, token_budget_out=req.token_budget_out,
        priority=req.priority, dependencies=req.dependencies,
    )
    return result


@router.post("/update_status")
async def update_status(req: TaskStatusUpdate, request: Request):
    """Update task status in the graph."""
    kuzu = request.app.state.kuzu
    redis = request.app.state.redis
    kuzu.update_task_status(req.task_id, req.status)

    if req.status == "complete":
        artifacts = kuzu.get_task_artifacts(req.task_id)
        path = artifacts[0]["path"] if artifacts else ""
        await redis.signal_complete(req.task_id, path)
        ready = kuzu.get_ready_tasks()
        return {
            "task_id": req.task_id, "status": req.status,
            "newly_ready": [t["task_id"] for t in ready],
        }

    return {"task_id": req.task_id, "status": req.status}


@router.get("/ready_tasks")
async def ready_tasks(request: Request, project_id: str = "default"):
    kuzu = request.app.state.kuzu
    return kuzu.get_ready_tasks(project_id)


@router.get("/dag_layers")
async def dag_layers(request: Request, project_id: str = "default"):
    kuzu = request.app.state.kuzu
    layers = kuzu.get_dag_layers(project_id)
    return {
        "total_layers": len(layers),
        "layers": [
            {"layer": i, "tasks": [t["task_id"] for t in layer], "parallelizable": len(layer) > 1}
            for i, layer in enumerate(layers)
        ],
    }


@router.get("/project_state")
async def project_state(request: Request, project_id: str = "default"):
    kuzu = request.app.state.kuzu
    return kuzu.get_project_state(project_id)


@router.post("/query_graph")
async def query_graph(req: GraphQueryRequest, request: Request):
    kuzu = request.app.state.kuzu
    return kuzu.execute(req.cypher, req.params)


@router.post("/semantic_search")
async def semantic_search(req: SemanticSearchRequest, request: Request):
    lance = request.app.state.lance
    return lance.search_similar(req.query, req.limit)
