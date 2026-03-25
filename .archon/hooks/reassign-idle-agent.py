#!/usr/bin/env python3
"""reassign-idle-agent.py — TeammateIdle Hook: Check queue for pending work."""
import json, sys
from pathlib import Path

def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"

    queued = []
    status_dir = workspace / "status"
    if status_dir.exists():
        for sf in status_dir.glob("*.json"):
            try:
                data = json.loads(sf.read_text(encoding="utf-8"))
                if data.get("status") == "queued":
                    queued.append(data.get("task_id", ""))
            except Exception:
                pass

    if queued:
        print(f"[reassign] Queued tasks available: {', '.join(queued)}", file=sys.stderr, flush=True)
    sys.exit(0)

if __name__ == "__main__":
    main()
