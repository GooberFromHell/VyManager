#!/usr/bin/env python3
"""pre-tool-intercept.py — PreToolUse Hook: Script cache check + dispatch validation."""
import json, sys, os, re
from pathlib import Path
from datetime import datetime, timezone

def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"
    tool_name = event.get("tool_name", "")
    tool_input = event.get("tool_input", {})
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bridge_url = os.environ.get("BRIDGE_URL", "http://localhost:8420")

    # Stage 1: Script cache intercept (only for cacheable tools)
    cacheable_tools = {"Bash", "Write", "Edit"}
    if tool_name in cacheable_tools:
        try:
            import urllib.request
            # Derive input shape from tool_input keys for matching
            input_keys = sorted(tool_input.keys()) if isinstance(tool_input, dict) else []
            shape_sig = ",".join(input_keys)
            req = urllib.request.Request(
                f"{bridge_url}/scripts/lookup",
                data=json.dumps({"operation": tool_name, "input_shape": shape_sig}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            resp = urllib.request.urlopen(req, timeout=1)
            cache_result = json.loads(resp.read())

            if cache_result.get("cached"):
                script_id = cache_result["script_id"]
                exec_req = urllib.request.Request(
                    f"{bridge_url}/scripts/execute",
                    data=json.dumps({"script_id": script_id, "input_data": tool_input}).encode(),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                exec_resp = urllib.request.urlopen(exec_req, timeout=30)
                exec_result = json.loads(exec_resp.read())

                if exec_result.get("executed") and exec_result.get("success"):
                    log_entry = {"timestamp": ts, "event": "script_cache_hit", "tool": tool_name, "script_id": script_id}
                    try:
                        with open(workspace / "logs" / "hooks.jsonl", "a") as f:
                            f.write(json.dumps(log_entry) + "\n")
                    except Exception:
                        pass

                    print(json.dumps({
                        "hookSpecificOutput": {
                            "hookEventName": "PreToolUse",
                            "suppressToolUse": True,
                            "toolResult": exec_result.get("output", {})
                        }
                    }), flush=True)
                    sys.exit(0)
        except Exception as e:
            print(json.dumps({"hook": "pre-tool-intercept", "error": str(e), "stage": "script_cache_lookup"}), file=sys.stderr, flush=True)

    # Stage 2: Task dispatch validation
    if tool_name == "Task":
        prompt = tool_input.get("prompt", tool_input.get("description", tool_input.get("task", "")))
        match = re.search(r"(ARCH|IMPL|TEST|REVIEW|KB)-\d+", prompt)
        if match:
            task_id = match.group(0)
            manifest = workspace / "manifests" / f"{task_id}.json"
            if not manifest.exists():
                print(json.dumps({
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Task {task_id} has no manifest. Create it via dispatch first."
                    }
                }), flush=True)
                sys.exit(2)
            print(f"[pre-dispatch] Validated: {task_id}", file=sys.stderr, flush=True)

    sys.exit(0)

if __name__ == "__main__":
    main()
