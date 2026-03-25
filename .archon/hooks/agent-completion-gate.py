#!/usr/bin/env python3
"""agent-completion-gate.py — SubagentStop: Validate output, signal completion, unblock downstream."""
import json, sys, os, shutil
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
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    session_id = event.get("session_id", "unknown")
    bridge_url = os.environ.get("BRIDGE_URL", "http://localhost:8420")

    # Find latest output report
    outputs_dir = workspace / "outputs"
    latest_report = None
    latest_task_id = None
    latest_mtime = 0

    if outputs_dir.exists():
        for report in outputs_dir.glob("*/report.json"):
            mtime = report.stat().st_mtime
            if mtime > latest_mtime:
                latest_mtime = mtime
                latest_report = report

    if latest_report:
        try:
            data = json.loads(latest_report.read_text(encoding="utf-8"))
            latest_task_id = data.get("task_id", "")
        except Exception as e:
            print(json.dumps({"hook": "agent-completion-gate", "error": str(e), "stage": "report_read"}), file=sys.stderr, flush=True)

    if not latest_task_id:
        print("[agent-gate] Sub-agent completed without structured output.", file=sys.stderr, flush=True)
        sys.exit(0)

    report_data = json.loads(latest_report.read_text(encoding="utf-8"))
    agent_status = report_data.get("status", "unknown")
    agent_role = report_data.get("agent_role", "unknown")
    notes = report_data.get("notes", "")

    # Check for auto-decomposition
    decompose = report_data.get("decompose_into")
    if decompose:
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{bridge_url}/coordination/signal_failed",
                data=json.dumps({
                    "task_id": latest_task_id,
                    "error": "Agent requested decomposition",
                    "decompose_into": decompose
                }).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            print(json.dumps({"hook": "agent-completion-gate", "error": str(e), "stage": "signal_failed_decompose"}), file=sys.stderr, flush=True)
        print(f"[agent-gate] Task {latest_task_id} auto-decomposed.", file=sys.stderr, flush=True)
        sys.exit(0)

    # Signal completion or failure
    if agent_status == "complete":
        # Try bridge first
        newly_ready = []
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{bridge_url}/coordination/signal_done",
                data=json.dumps({"task_id": latest_task_id}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            resp = urllib.request.urlopen(req, timeout=10)
            result = json.loads(resp.read())
            newly_ready = [t.get("task_id", t) if isinstance(t, dict) else t for t in result.get("newly_ready", [])]
        except Exception as e:
            print(json.dumps({"hook": "agent-completion-gate", "error": str(e), "stage": "signal_done"}), file=sys.stderr, flush=True)

        # File-based status update (always, as fallback)
        status_file = workspace / "status" / f"{latest_task_id}.json"
        status_file.write_text(json.dumps({
            "task_id": latest_task_id, "agent_role": agent_role,
            "status": "complete", "progress_pct": 100, "updated_at": ts, "session_id": session_id
        }, indent=2), encoding="utf-8")

        # Promote to handoffs
        handoff_dir = workspace / "handoffs" / latest_task_id
        handoff_dir.mkdir(parents=True, exist_ok=True)
        output_dir = latest_report.parent
        for item in output_dir.iterdir():
            dest = handoff_dir / item.name
            if item.is_file():
                shutil.copy2(str(item), str(dest))

        msg = f"[agent-gate] ✅ {latest_task_id} ({agent_role}) complete."
        if newly_ready:
            msg += f" Ready: {', '.join(newly_ready)}"
        print(msg, file=sys.stderr, flush=True)

    elif agent_status == "failed":
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{bridge_url}/coordination/signal_failed",
                data=json.dumps({"task_id": latest_task_id, "error": notes}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            print(json.dumps({"hook": "agent-completion-gate", "error": str(e), "stage": "signal_failed"}), file=sys.stderr, flush=True)
        print(f"[agent-gate] ❌ {latest_task_id} ({agent_role}) failed: {notes}", file=sys.stderr, flush=True)
    else:
        print(f"[agent-gate] {latest_task_id} finished: {agent_status}", file=sys.stderr, flush=True)

    # Audit log
    _rotate_log_if_needed(workspace / "logs" / "hooks.jsonl")
    try:
        with open(workspace / "logs" / "hooks.jsonl", "a") as f:
            f.write(json.dumps({
                "timestamp": ts, "event": "subagent_completed",
                "task_id": latest_task_id, "status": agent_status, "role": agent_role
            }) + "\n")
    except Exception:
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
