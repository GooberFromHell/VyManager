#!/usr/bin/env python3
"""block-dangerous-commands.py — PreToolUse(Bash): Block destructive shell commands."""
import json, sys, re
from pathlib import Path
from datetime import datetime, timezone

DANGEROUS_PATTERNS = [
    r"rm\s+-rf\s+/",
    r"rm\s+-rf\s+\*",
    r"rm\s+-rf\s+\.",
    r"rm\s+-rf\s+~",
    r"git\s+push\s+.*--force",
    r"git\s+push\s+.*-f\b",
    r"git\s+reset\s+--hard",
    r"git\s+clean\s+-fd",
    r"DROP\s+DATABASE",
    r"DROP\s+TABLE",
    r"TRUNCATE\s+TABLE",
    r"chmod\s+-R\s+777",
    r"chmod\s+777",
    r">\s*/dev/sd",
    r"mkfs\.",
    r"dd\s+if=.*of=/dev",
    r"curl.*\|\s*bash",
    r"curl.*\|\s*sh",
    r"wget.*\|\s*bash",
    r"npm\s+publish",
]

def main():
    event = json.load(sys.stdin)
    cwd = event.get("cwd", ".")
    workspace = Path(cwd) / ".archon" / "workspace"
    command = event.get("tool_input", {}).get("command", "")
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if not command:
        sys.exit(0)

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            try:
                with open(workspace / "logs" / "hooks.jsonl", "a") as f:
                    f.write(json.dumps({"timestamp": ts, "event": "command_blocked", "command": command, "pattern": pattern}) + "\n")
            except Exception:
                pass

            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Blocked: matches dangerous pattern: {pattern}"
                }
            }), flush=True)
            sys.exit(2)

    # Log allowed
    try:
        with open(workspace / "logs" / "hooks.jsonl", "a") as f:
            f.write(json.dumps({"timestamp": ts, "event": "command_allowed", "command": command}) + "\n")
    except Exception:
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
