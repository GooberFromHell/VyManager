"""
Coordination Router — Task claiming, completion signals, quorum voting, team dispatch.
All inter-agent coordination flows through Redis for sub-millisecond shared state.
"""

import json
import logging
import uuid
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import Optional

logger = logging.getLogger("archon.coordination")
router = APIRouter()


class ClaimRequest(BaseModel):
    task_id: str
    agent_id: str = Field(default_factory=lambda: f"agent_{uuid.uuid4().hex[:8]}")
    ttl: int = 300


class SignalRequest(BaseModel):
    task_id: str
    artifact_path: str = ""


class FailureSignal(BaseModel):
    task_id: str
    error: str = ""
    decompose_into: list[str] = Field(default_factory=list)


class QuorumVote(BaseModel):
    quorum_id: str
    agent_id: str
    result: str
    confidence: float = 1.0


class TeamDispatchRequest(BaseModel):
    """Request to analyze DAG and dispatch a team of agents."""
    project_id: str = "default"
    max_parallel: int = 4


class SyncStatusRequest(BaseModel):
    workspace_path: str
    project_id: str = "default"


# ── Task Claiming ────────────────────────────────────────────────

@router.post("/claim_task")
async def claim_task(req: ClaimRequest, request: Request):
    """Atomically claim a task. Only one agent can hold a claim at a time.
    Returns success=True if this agent got the claim, false if another agent owns it."""
    redis = request.app.state.redis
    claimed = await redis.claim_task(req.task_id, req.agent_id, req.ttl)

    if not claimed:
        owner = await redis.get_task_owner(req.task_id)
        return {"claimed": False, "owner": owner, "task_id": req.task_id}

    # Update graph status to in_progress
    kuzu = request.app.state.kuzu
    kuzu.update_task_status(req.task_id, "in_progress")

    return {"claimed": True, "agent_id": req.agent_id, "task_id": req.task_id, "ttl": req.ttl}


@router.post("/release_task")
async def release_task(req: ClaimRequest, request: Request):
    """Release a task claim (agent finished or failed)."""
    redis = request.app.state.redis
    await redis.release_task(req.task_id)
    return {"released": True, "task_id": req.task_id}


class RenewClaimRequest(BaseModel):
    task_id: str
    agent_id: str
    ttl: int = 300


@router.post("/renew_claim")
async def renew_claim(req: RenewClaimRequest, request: Request):
    """Renew a task claim TTL. Call periodically for long-running tasks."""
    redis = request.app.state.redis
    current_owner = await redis.get_task_owner(req.task_id)

    if current_owner != req.agent_id:
        return {"renewed": False, "error": "Not the current owner", "owner": current_owner}

    # Re-set the claim with fresh TTL
    key = f"task:claim:{req.task_id}"
    await redis.client.expire(key, req.ttl)
    return {"renewed": True, "task_id": req.task_id, "ttl": req.ttl}


# ── Completion Signals ───────────────────────────────────────────

@router.post("/signal_done")
async def signal_done(req: SignalRequest, request: Request):
    """Signal task completion. Updates graph, publishes Redis event, returns newly unblocked tasks."""
    kuzu = request.app.state.kuzu
    redis = request.app.state.redis

    # Update graph
    kuzu.update_task_status(req.task_id, "complete")

    # Release claim
    await redis.release_task(req.task_id)

    # Publish completion event
    await redis.signal_complete(req.task_id, req.artifact_path)

    # Store for polling consumers
    from datetime import datetime
    event = json.dumps({"task_id": req.task_id, "status": "complete", "timestamp": datetime.utcnow().isoformat() + "Z"})
    await redis.client.lpush("recent_completions", event)
    await redis.client.ltrim("recent_completions", 0, 99)
    await redis.client.expire("recent_completions", 3600)

    # Find newly ready tasks
    ready = kuzu.get_ready_tasks()

    logger.info(f"Task {req.task_id} complete. {len(ready)} tasks now ready.")

    return {
        "task_id": req.task_id,
        "status": "complete",
        "newly_ready": [
            {"task_id": t["task_id"], "role": t["agent_role"], "objective": t["objective"]}
            for t in ready
        ],
    }


@router.get("/poll_completions")
async def poll_completions(request: Request, project_id: str = "default", since_seconds: int = 60):
    """Poll for recently completed or failed tasks.
    Returns tasks that changed status in the last N seconds.
    This is the event-consumption endpoint for orchestrators that can't hold pub/sub connections."""
    kuzu = request.app.state.kuzu
    redis = request.app.state.redis

    # Get all recent completion signals from Redis (stored as a list)
    recent_key = "recent_completions"
    recent = await redis.client.lrange(recent_key, 0, -1)

    events = []
    for item in recent:
        try:
            event = json.loads(item)
            events.append(event)
        except (json.JSONDecodeError, TypeError):
            pass

    # Also get currently ready tasks from the DAG
    ready = kuzu.get_ready_tasks(project_id)

    return {
        "recent_events": events,
        "ready_tasks": [
            {"task_id": t["task_id"], "role": t["agent_role"], "objective": t["objective"]}
            for t in ready
        ],
        "total_ready": len(ready),
    }


@router.post("/signal_failed")
async def signal_failed(req: FailureSignal, request: Request):
    """Signal task failure. Optionally decomposes into subtasks (auto-decomposition pattern)."""
    kuzu = request.app.state.kuzu
    redis = request.app.state.redis

    kuzu.update_task_status(req.task_id, "failed")
    await redis.release_task(req.task_id)
    await redis.signal_failed(req.task_id, req.error)

    # Store for polling consumers
    from datetime import datetime
    event = json.dumps({"task_id": req.task_id, "status": "failed", "error": req.error[:200], "timestamp": datetime.utcnow().isoformat() + "Z"})
    await redis.client.lpush("recent_completions", event)
    await redis.client.ltrim("recent_completions", 0, 99)
    await redis.client.expire("recent_completions", 3600)

    result = {"task_id": req.task_id, "status": "failed", "error": req.error}

    # Auto-decomposition: if the agent returned subtasks, create them in the graph
    if req.decompose_into:
        parent_task = kuzu.get_task(req.task_id)
        new_tasks = []
        for i, subtask_desc in enumerate(req.decompose_into):
            sub_id = f"{req.task_id}_sub{i+1:02d}"
            role = parent_task.get("t.agent_role", "implementer") if parent_task else "implementer"
            # Chain subtasks sequentially — each depends on the previous
            deps = [new_tasks[-1]] if new_tasks else []
            kuzu.create_task(
                task_id=sub_id,
                objective=subtask_desc,
                agent_role=role,
                dependencies=deps,
                priority=(parent_task.get("t.priority", 0) if parent_task else 0) + 1,
            )
            new_tasks.append(sub_id)

        # Mark original task as decomposed (not failed)
        kuzu.update_task_status(req.task_id, "decomposed")
        result["status"] = "decomposed"
        result["subtasks"] = new_tasks
        logger.info(f"Task {req.task_id} decomposed into {len(new_tasks)} subtasks.")

    return result


# ── Quorum Consensus ─────────────────────────────────────────────

@router.post("/quorum/vote")
async def quorum_vote(req: QuorumVote, request: Request):
    """Submit a vote for quorum consensus. Returns current vote tally."""
    redis = request.app.state.redis
    vote_data = json.dumps({"result": req.result, "confidence": req.confidence})
    count = await redis.submit_quorum_vote(req.quorum_id, req.agent_id, vote_data)

    return {"quorum_id": req.quorum_id, "votes_received": count, "agent_id": req.agent_id}


@router.get("/quorum/{quorum_id}/result")
async def quorum_result(quorum_id: str, request: Request, required_votes: int = 3):
    """Get quorum result. Returns consensus if enough votes, otherwise pending."""
    redis = request.app.state.redis
    votes = await redis.get_quorum_votes(quorum_id)

    if len(votes) < required_votes:
        return {"quorum_id": quorum_id, "status": "pending", "votes": len(votes), "required": required_votes}

    # Parse votes and find majority
    parsed = {}
    for agent_id, vote_json in votes.items():
        data = json.loads(vote_json)
        result = data["result"]
        parsed.setdefault(result, []).append({"agent": agent_id, "confidence": data["confidence"]})

    # Majority = most common result
    majority_result = max(parsed, key=lambda k: len(parsed[k]))
    majority_count = len(parsed[majority_result])
    avg_confidence = sum(v["confidence"] for v in parsed[majority_result]) / majority_count

    return {
        "quorum_id": quorum_id,
        "status": "consensus" if majority_count > len(votes) / 2 else "split",
        "result": majority_result,
        "majority_count": majority_count,
        "total_votes": len(votes),
        "confidence": round(avg_confidence, 3),
        "all_votes": parsed,
    }


@router.delete("/quorum/{quorum_id}")
async def clear_quorum(quorum_id: str, request: Request):
    """Clear quorum votes after consensus is reached."""
    redis = request.app.state.redis
    await redis.clear_quorum(quorum_id)
    return {"cleared": True, "quorum_id": quorum_id}


# ── Team Dispatch (DAG-Aware) ────────────────────────────────────

@router.post("/dispatch_team")
async def dispatch_team(req: TeamDispatchRequest, request: Request):
    """Analyze DAG and return the optimal dispatch plan.
    Identifies fan-out (parallel), pipeline (sequential), and quorum opportunities."""
    kuzu = request.app.state.kuzu

    layers = kuzu.get_dag_layers(req.project_id)
    ready = kuzu.get_ready_tasks(req.project_id)

    if not ready:
        return {
            "dispatch_plan": [],
            "message": "No tasks ready for dispatch. All tasks are either complete, blocked, or in progress.",
        }

    # Classify team topology
    dispatch_plan = []

    if len(ready) > 1:
        # Multiple tasks ready = Fan-Out opportunity
        fan_out_tasks = ready[:req.max_parallel]
        dispatch_plan.append({
            "team_type": "fan_out",
            "description": f"Dispatch {len(fan_out_tasks)} independent tasks in parallel",
            "tasks": [
                {
                    "task_id": t["task_id"],
                    "role": t["agent_role"],
                    "objective": t["objective"],
                    "token_budget": {"in": t["token_budget_in"], "out": t["token_budget_out"]},
                }
                for t in fan_out_tasks
            ],
        })
    elif len(ready) == 1:
        task = ready[0]
        # Check if downstream forms a pipeline
        downstream = kuzu.get_downstream_tasks(task["task_id"])
        if downstream:
            dispatch_plan.append({
                "team_type": "pipeline",
                "description": f"Sequential: {task['task_id']} → {', '.join(d['task_id'] for d in downstream)}",
                "tasks": [{
                    "task_id": task["task_id"],
                    "role": task["agent_role"],
                    "objective": task["objective"],
                    "next_in_pipeline": [d["task_id"] for d in downstream],
                }],
            })
        else:
            dispatch_plan.append({
                "team_type": "single",
                "description": f"Single task dispatch: {task['task_id']}",
                "tasks": [{
                    "task_id": task["task_id"],
                    "role": task["agent_role"],
                    "objective": task["objective"],
                }],
            })

    # Check for quorum opportunities (high-stakes tasks like "review" or "audit")
    quorum_candidates = [t for t in ready if t.get("agent_role") in ("reviewer", "architect")]
    if quorum_candidates and len(ready) <= 2:
        # For high-stakes single tasks, suggest quorum instead of single dispatch
        for task in quorum_candidates:
            dispatch_plan.append({
                "team_type": "quorum",
                "description": f"High-stakes task '{task['task_id']}' — recommend quorum consensus with 3 agents",
                "quorum_size": 3,
                "tasks": [{
                    "task_id": task["task_id"],
                    "role": task["agent_role"],
                    "objective": task["objective"],
                    "quorum_id": f"quorum_{task['task_id']}",
                }],
            })

    # Layer analysis for orchestrator awareness
    layer_summary = []
    for i, layer in enumerate(layers):
        layer_statuses = set(t.get("status", "unknown") for t in layer)
        layer_summary.append({
            "layer": i,
            "task_count": len(layer),
            "statuses": list(layer_statuses),
            "all_complete": all(t.get("status") == "complete" for t in layer),
        })

    return {
        "dispatch_plan": dispatch_plan,
        "dag_layers": layer_summary,
        "total_ready": len(ready),
    }


# ── Status Synchronization ───────────────────────────────────────

@router.post("/sync_status")
async def sync_status(req: SyncStatusRequest, request: Request):
    """Synchronize task status between filesystem and Kuzu graph.
    Reads .archon/workspace/status/*.json files and updates the graph to match."""
    kuzu = request.app.state.kuzu

    from pathlib import Path
    status_dir = Path(req.workspace_path) / "status"

    if not status_dir.exists():
        return {"synced": 0, "error": "Status directory not found"}

    synced = 0
    conflicts = []

    for status_file in status_dir.glob("*.json"):
        if status_file.name == "DASHBOARD.md":
            continue
        try:
            data = json.loads(status_file.read_text(encoding="utf-8"))
            task_id = data.get("task_id")
            file_status = data.get("status")

            if not task_id or not file_status:
                continue

            # Get graph status
            graph_task = kuzu.get_task(task_id)
            if not graph_task:
                continue

            graph_status = graph_task.get("t.status", "unknown")

            # Resolve conflicts: prefer "complete" > "in_progress" > "queued"
            status_priority = {"complete": 3, "failed": 3, "decomposed": 3, "in_progress": 2, "queued": 1, "blocked": 1}
            file_pri = status_priority.get(file_status, 0)
            graph_pri = status_priority.get(graph_status, 0)

            if file_pri > graph_pri:
                kuzu.update_task_status(task_id, file_status)
                synced += 1
            elif graph_pri > file_pri:
                # Update file to match graph
                data["status"] = graph_status
                status_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
                synced += 1
            elif file_status != graph_status:
                conflicts.append({"task_id": task_id, "file": file_status, "graph": graph_status})
        except (json.JSONDecodeError, OSError):
            continue

    return {"synced": synced, "conflicts": conflicts}
