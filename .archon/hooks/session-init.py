#!/usr/bin/env python3
"""session-init.py — SessionStart Hook: Initialize workspace and inject ARCHON context."""
import json, sys, os
from pathlib import Path
from datetime import datetime, timezone

def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    session_id = event.get("session_id", "unknown")

    # Ensure directories
    for d in ["manifests", "outputs", "handoffs", "status", "logs", "memory", "schemas"]:
        (workspace / d).mkdir(parents=True, exist_ok=True)
    for d in ["graph", "vectors", "artifacts"]:
        (Path(cwd) / ".archon" / "data" / d).mkdir(parents=True, exist_ok=True)

    # Audit log
    log_file = workspace / "logs" / f"session-{session_id}.jsonl"
    try:
        with open(log_file, "a") as f:
            f.write(json.dumps({"timestamp": ts, "session_id": session_id, "event": "session_start"}) + "\n")
    except Exception:
        pass

    # Count tasks
    task_count = complete = active = 0
    status_dir = workspace / "status"
    if status_dir.exists():
        for sf in status_dir.glob("*.json"):
            try:
                data = json.loads(sf.read_text(encoding="utf-8"))
                task_count += 1
                s = data.get("status", "")
                if s == "complete": complete += 1
                elif s == "in_progress": active += 1
            except Exception:
                pass

    # Dashboard
    dashboard = status_dir / "DASHBOARD.md"
    dashboard.write_text(
        f"## ARCHON Dashboard — {ts}\nTasks: {complete}/{task_count} complete, {active} active\n",
        encoding="utf-8"
    )

    # Check bridge
    bridge_status = "offline"
    try:
        import urllib.request
        resp = urllib.request.urlopen("http://localhost:8420/health", timeout=2)
        if resp.status == 200:
            bridge_status = "online"
    except Exception as e:
        print(json.dumps({"hook": "session-init", "error": str(e), "stage": "bridge_call"}), file=sys.stderr, flush=True)

    ctx = (
        f"ARCHON Framework active. "
        f"CLI: python .archon/framework.py <command>. "
        f"Commands: init, dispatch, status, team, dashboard, envelope, validate, tokens, promote, reset, cache-stats. "
        f"Tasks: {task_count} ({complete} complete, {active} active). "
        f"Bridge: {bridge_status}."
    )

    print(json.dumps({"additionalContext": ctx}), flush=True)

if __name__ == "__main__":
    main()
