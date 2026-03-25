#!/usr/bin/env python3
"""post-tool-capture.py — PostToolUse(Write|Edit): Capture artifacts, validate JSON, lint (async)."""
import json, sys, os
from pathlib import Path
from datetime import datetime, timezone


def _rotate_log_if_needed(log_path):
    """Rotate hooks.jsonl if it exceeds 10MB."""
    try:
        if log_path.exists() and log_path.stat().st_size > 10 * 1024 * 1024:
            rotated = log_path.with_suffix(".jsonl.old")
            if rotated.exists():
                rotated.unlink()
            log_path.rename(rotated)
    except OSError:
        pass


def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"
    tool_input = event.get("tool_input", {})
    file_path = tool_input.get("file_path", tool_input.get("path", ""))
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bridge_url = os.environ.get("BRIDGE_URL", "http://localhost:8420")

    if not file_path:
        sys.exit(0)

    try:
        file_path = str(Path(file_path).relative_to(cwd))
    except (ValueError, TypeError):
        file_path = str(file_path)

    # Capture agent output reports via bridge
    if file_path.replace("\\", "/").startswith(".archon/workspace/outputs/") and file_path.endswith("report.json"):
        parts = file_path.replace("\\", "/").split("/")
        task_id = parts[2] if len(parts) > 2 else None

        if task_id:
            try:
                report = json.loads(Path(cwd, file_path).read_text(encoding="utf-8"))
                notes = report.get("notes", "No summary")[:500]

                import urllib.request
                req = urllib.request.Request(
                    f"{bridge_url}/artifacts/store",
                    data=json.dumps({
                        "task_id": task_id,
                        "artifact_type": "report",
                        "summary": notes,
                        "content": json.dumps(report)
                    }).encode(),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                urllib.request.urlopen(req, timeout=10)
            except Exception as e:
                print(json.dumps({"hook": "post-tool-capture", "error": str(e), "stage": "artifact_capture"}), file=sys.stderr, flush=True)

            _rotate_log_if_needed(workspace / "logs" / "hooks.jsonl")
            try:
                with open(workspace / "logs" / "hooks.jsonl", "a") as f:
                    f.write(json.dumps({"timestamp": ts, "event": "artifact_captured", "task_id": task_id}) + "\n")
            except Exception:
                pass

    # Validate JSON files in workspace
    if file_path.endswith(".json") and ".archon/workspace" in file_path:
        full = Path(cwd) / file_path
        if full.exists():
            try:
                json.loads(full.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                print(f"[post-capture] WARNING: Malformed JSON in {file_path}", file=sys.stderr, flush=True)

    # Log
    _rotate_log_if_needed(workspace / "logs" / "hooks.jsonl")
    try:
        with open(workspace / "logs" / "hooks.jsonl", "a") as f:
            f.write(json.dumps({"timestamp": ts, "event": "file_written", "file": file_path}) + "\n")
    except Exception:
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
