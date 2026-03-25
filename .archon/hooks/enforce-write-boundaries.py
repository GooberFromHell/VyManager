#!/usr/bin/env python3
"""enforce-write-boundaries.py — PreToolUse(Write|Edit): Block writes outside agent's target_files."""
import json, sys
from pathlib import Path

def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"
    tool_input = event.get("tool_input", {})
    file_path = tool_input.get("file_path", tool_input.get("path", ""))

    if not file_path:
        sys.exit(0)

    # Normalize
    try:
        file_path = str(Path(file_path).relative_to(cwd))
    except (ValueError, TypeError):
        file_path = str(file_path)

    # Always allow workspace and .claude writes
    if file_path.startswith(".archon/workspace") or file_path.startswith(".archon/data") or file_path.startswith(".claude"):
        sys.exit(0)

    # Find active task manifest
    active_manifest = None
    status_dir = workspace / "status"
    if status_dir.exists():
        for sf in status_dir.glob("*.json"):
            try:
                data = json.loads(sf.read_text(encoding="utf-8"))
                if data.get("status") == "in_progress":
                    task_id = data.get("task_id", "")
                    mf = workspace / "manifests" / f"{task_id}.json"
                    if mf.exists():
                        active_manifest = json.loads(mf.read_text(encoding="utf-8"))
                        break
            except Exception:
                pass

    if not active_manifest:
        sys.exit(0)  # No active task, allow

    target_files = active_manifest.get("context", {}).get("target_files", [])
    if not target_files:
        sys.exit(0)  # No restrictions

    # Check if file matches any target
    for target in target_files:
        if file_path == target or file_path.endswith(target) or target in file_path:
            sys.exit(0)

    task_id = active_manifest.get("task_id", "?")
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": f"Write to '{file_path}' blocked. Not in task {task_id} target_files."
        }
    }), flush=True)
    sys.exit(2)

if __name__ == "__main__":
    main()
