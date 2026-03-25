#!/usr/bin/env python3
"""orchestrator-checkpoint.py — Stop Hook: Save state and update dashboard."""
import json, sys
from pathlib import Path
from datetime import datetime, timezone

def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    session_id = event.get("session_id", "unknown")

    counts = {"total": 0, "complete": 0, "in_progress": 0, "queued": 0, "failed": 0, "blocked": 0}
    tasks = []
    status_dir = workspace / "status"

    if status_dir.exists():
        for sf in status_dir.glob("*.json"):
            try:
                data = json.loads(sf.read_text(encoding="utf-8"))
                s = data.get("status", "unknown")
                counts["total"] += 1
                if s in counts:
                    counts[s] += 1
                tasks.append(data)
            except Exception:
                pass

    # Update dashboard
    icons = {"complete": "✅", "in_progress": "🔄", "queued": "⏳", "blocked": "🚫", "failed": "❌"}
    lines = [
        f"## ARCHON Dashboard — {ts}",
        "",
        f"**Tasks:** {counts['complete']}/{counts['total']} complete"
        f" | {counts['in_progress']} active | {counts['queued']} queued | {counts['failed']} failed",
        "",
    ]
    if tasks:
        lines += ["| Task | Role | Status | Progress |", "|------|------|--------|----------|"]
        for t in tasks:
            s = t.get("status", "?")
            icon = icons.get(s, "❓")
            lines.append(f"| {t.get('task_id','?')} | {t.get('agent_role','?')} | {icon} {s} | {t.get('progress_pct',0)}% |")

    (status_dir / "DASHBOARD.md").write_text("\n".join(lines), encoding="utf-8")

    # Audit log
    try:
        with open(workspace / "logs" / "hooks.jsonl", "a") as f:
            f.write(json.dumps({"timestamp": ts, "event": "checkpoint", "session_id": session_id, **counts}) + "\n")
    except Exception:
        pass

    if counts["total"] > 0:
        print(f"[checkpoint] {counts['complete']}/{counts['total']} complete, {counts['in_progress']} active, {counts['queued']} queued", file=sys.stderr, flush=True)

    sys.exit(0)

if __name__ == "__main__":
    main()
