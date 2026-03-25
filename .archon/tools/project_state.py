#!/usr/bin/env python3
"""
project_state — Compact Status Snapshot MCP Tool

Returns a compressed view of the entire project state: which tasks are complete,
in progress, blocked, or queued. Used by the orchestrator for routing decisions
without reading multiple individual status files.

Usage as MCP tool:
  Input:  {} or {"filter": "in_progress"} or {"filter": "phase_2"}
  Output: Compact JSON with task statuses, blockers, and metrics

Usage as CLI:
  python project_state.py --workspace .archon/workspace
  python project_state.py --workspace .archon/workspace --filter in_progress
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime


def load_status_files(workspace: str) -> list[dict]:
    """Load all status JSON files from the status directory."""
    status_dir = Path(workspace) / "status"
    statuses = []

    if not status_dir.exists():
        return statuses

    for f in sorted(status_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            statuses.append(data)
        except (json.JSONDecodeError, OSError):
            statuses.append({"task_id": f.stem, "status": "error", "error": "Failed to parse"})

    return statuses


def load_manifests(workspace: str) -> dict[str, dict]:
    """Load all context manifests, indexed by task_id."""
    manifest_dir = Path(workspace) / "manifests"
    manifests = {}

    if not manifest_dir.exists():
        return manifests

    for f in sorted(manifest_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            task_id = data.get("task_id", f.stem)
            manifests[task_id] = data
        except (json.JSONDecodeError, OSError):
            pass

    return manifests


def compute_dependency_graph(manifests: dict) -> dict:
    """Build a dependency graph from manifest upstream_dependencies."""
    graph = {}
    for task_id, manifest in manifests.items():
        deps = manifest.get("upstream_dependencies", [])
        graph[task_id] = {
            "depends_on": deps,
            "depended_by": [],
        }

    # Fill in reverse dependencies
    for task_id, info in graph.items():
        for dep in info["depends_on"]:
            if dep in graph:
                graph[dep]["depended_by"].append(task_id)

    return graph


def get_project_state(workspace: str, status_filter: str = None) -> dict:
    """Generate a compact project state snapshot."""
    statuses = load_status_files(workspace)
    manifests = load_manifests(workspace)
    dep_graph = compute_dependency_graph(manifests)

    # Aggregate counts
    counts = {
        "total": 0,
        "complete": 0,
        "in_progress": 0,
        "queued": 0,
        "blocked": 0,
        "failed": 0,
        "partial": 0,
    }

    tasks = []
    total_tokens_context = 0
    total_tokens_output = 0

    for status in statuses:
        task_id = status.get("task_id", "unknown")
        task_status = status.get("status", "unknown")

        counts["total"] += 1
        if task_status in counts:
            counts[task_status] += 1

        # Token tracking
        tokens = status.get("tokens_consumed", {})
        total_tokens_context += tokens.get("context", 0)
        total_tokens_output += tokens.get("output", 0)

        task_info = {
            "task_id": task_id,
            "role": status.get("agent_role", "unknown"),
            "status": task_status,
            "progress": status.get("progress_pct", 0),
            "updated": status.get("updated_at", ""),
        }

        # Add dependency info if available
        if task_id in dep_graph:
            unmet_deps = []
            for dep in dep_graph[task_id]["depends_on"]:
                dep_status = next(
                    (s.get("status") for s in statuses if s.get("task_id") == dep),
                    "unknown",
                )
                if dep_status != "complete":
                    unmet_deps.append(dep)
            if unmet_deps:
                task_info["blocked_by"] = unmet_deps

            if dep_graph[task_id]["depended_by"]:
                task_info["blocks"] = dep_graph[task_id]["depended_by"]

        tasks.append(task_info)

    # Apply filter
    if status_filter:
        tasks = [t for t in tasks if t["status"] == status_filter]

    # Find next actionable tasks (queued with all deps met)
    next_actions = []
    for task in tasks:
        if task["status"] == "queued" and "blocked_by" not in task:
            next_actions.append(task["task_id"])

    # Find critical path (tasks that block the most downstream work)
    critical = []
    for task_id, info in dep_graph.items():
        if len(info["depended_by"]) > 1:
            task_status = next(
                (s.get("status") for s in statuses if s.get("task_id") == task_id),
                "unknown",
            )
            if task_status != "complete":
                critical.append({"task_id": task_id, "blocks_count": len(info["depended_by"])})

    critical.sort(key=lambda x: x["blocks_count"], reverse=True)

    return {
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": counts,
        "tokens": {
            "total_context": total_tokens_context,
            "total_output": total_tokens_output,
            "total": total_tokens_context + total_tokens_output,
        },
        "tasks": tasks,
        "next_actions": next_actions,
        "critical_path": critical[:5],
        "manifests_without_status": [
            tid for tid in manifests if not any(s.get("task_id") == tid for s in statuses)
        ],
    }


def main():
    parser = argparse.ArgumentParser(description="Get compact project state snapshot")
    parser.add_argument("--workspace", default=".archon/workspace", help="Path to .archon/workspace")
    parser.add_argument("--filter", dest="status_filter", help="Filter by status (e.g., in_progress, queued)")
    parser.add_argument("--json-input", action="store_true", help="Read JSON input from stdin")
    args = parser.parse_args()

    if args.json_input:
        input_data = json.load(sys.stdin)
        args.workspace = input_data.get("workspace", args.workspace)
        args.status_filter = input_data.get("filter", args.status_filter)

    result = get_project_state(args.workspace, args.status_filter)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
