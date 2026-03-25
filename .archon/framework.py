#!/usr/bin/env python3
"""
framework.py — Unified ARCHON Framework CLI (v2)

Routes through the MCP Bridge when available, falls back to file-based operations.
Usable by both Claude (as orchestrator) and users (for manual workflow).

Usage:  archon <command> [options]
  or:   python scripts/framework.py <command> [options]

All framework data is stored under .archon/:
  .archon/workspace/   — manifests, outputs, handoffs, status, logs
  .archon/data/        — graph, vectors, artifacts
  .archon/docker-compose.yml

Infrastructure:
  init          Start Docker infrastructure + initialize workspace
  stop          Stop Docker infrastructure
  health        Check bridge, Redis, Kuzu, LanceDB health
  doctor        Run full installation diagnostics

Task Management:
  dispatch      Create task in graph + generate dispatch prompt
  status        Get project state from Kuzu graph
  team          Analyze DAG and get optimal team dispatch plan
  ready         Show tasks ready for dispatch
  poll          Poll for recently completed tasks
  envelope      Generate context envelope for a task
  validate      Validate agent output
  tokens        Count tokens for files or manifests
  promote       Promote output to handoffs

State Management:
  sync          Sync task status between filesystem and graph
  reset         Clear all workspace state

Monitoring:
  dashboard     Generate and display project dashboard
  cache-stats   Show script cache statistics
  logs          View recent hook activity logs
"""

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import urllib.request
import urllib.error

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent if SCRIPT_DIR.name == ".archon" else SCRIPT_DIR
ARCHON_DIR = PROJECT_ROOT / ".archon"
WORKSPACE = ARCHON_DIR / "workspace"
DATA_DIR = ARCHON_DIR / "data"
COMPOSE_FILE = ARCHON_DIR / "docker-compose.yml"
BRIDGE_URL = os.environ.get("BRIDGE_URL", "http://localhost:8420")


def _ensure_tools_path():
    """Add MCP tools directory to sys.path. Checks installed location first."""
    tools_dir = PROJECT_ROOT / ".archon" / "tools"
    if not tools_dir.exists():
        tools_dir = PROJECT_ROOT / "mcp-tools"
    if str(tools_dir) not in sys.path:
        sys.path.insert(0, str(tools_dir))


def bridge_call(method: str, endpoint: str, data: dict = None) -> Optional[dict]:
    """Make an HTTP call to the MCP Bridge. Returns None if bridge is unavailable."""
    url = f"{BRIDGE_URL}{endpoint}"
    try:
        if method == "GET":
            req = urllib.request.Request(url)
        else:
            body = json.dumps(data or {}).encode()
            req = urllib.request.Request(url, data=body, method=method)
            req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, ConnectionError, TimeoutError):
        return None


def bridge_available() -> bool:
    result = bridge_call("GET", "/health")
    return result is not None and result.get("status") in ("healthy", "degraded")


# ── Commands ─────────────────────────────────────────────────────


def _port_in_use(port: int) -> bool:
    """Return True if the given TCP port on 127.0.0.1 is already bound."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return False
        except OSError:
            return True


def cmd_init(args):
    """Start infrastructure and initialize workspace."""
    for d in ["manifests", "outputs", "handoffs", "status", "logs", "memory", "schemas"]:
        (WORKSPACE / d).mkdir(parents=True, exist_ok=True)

    for d in ["graph", "vectors", "artifacts"]:
        (DATA_DIR / d).mkdir(parents=True, exist_ok=True)

    registry_dir = WORKSPACE
    registry = registry_dir / "registry.json"
    if not registry.exists():
        registry.write_text("{}")

    # ── Port conflict detection ───────────────────────────────────
    port_warnings: list[str] = []
    for port, service in ((6379, "Redis"), (8420, "MCP Bridge")):
        if _port_in_use(port):
            port_warnings.append(
                f"Port {port} ({service}) is already in use — existing container may be running."
            )

    # ── Docker detection and startup ─────────────────────────────
    docker_started = False
    docker_error: str | None = None

    if COMPOSE_FILE.exists():
        if shutil.which("docker") is None:
            docker_error = (
                "Docker not found in PATH. Install Docker Desktop from "
                "https://docker.com/products/docker-desktop"
            )
        else:
            # Verify the daemon is reachable before trying compose.
            try:
                daemon_check = subprocess.run(
                    ["docker", "info"],
                    capture_output=True,
                    timeout=10,
                )
                if daemon_check.returncode != 0:
                    docker_error = "Docker daemon is not running. Start Docker Desktop and try again."
                else:
                    # Daemon is up — bring compose stack online.
                    try:
                        compose_result = subprocess.run(
                            ["docker", "compose", "up", "-d"],
                            cwd=str(ARCHON_DIR),
                            capture_output=True,
                            timeout=60,
                        )
                        if compose_result.returncode == 0:
                            docker_started = True
                        else:
                            stderr_text = compose_result.stderr.decode(errors="replace").strip()
                            docker_error = (
                                f"docker compose up failed (exit {compose_result.returncode})"
                                + (f": {stderr_text}" if stderr_text else "")
                            )
                    except subprocess.TimeoutExpired:
                        docker_error = "docker compose up timed out after 60 seconds."
            except subprocess.TimeoutExpired:
                docker_error = "Docker daemon check timed out after 10 seconds."
            except FileNotFoundError:
                docker_error = (
                    "Docker not found in PATH. Install Docker Desktop from "
                    "https://docker.com/products/docker-desktop"
                )

    # ── Bridge startup with exponential backoff ───────────────────
    bridge_ok = False
    bridge_wait_seconds: float = 0.0
    if docker_started:
        max_wait = 30  # seconds
        wait = 2.0
        elapsed = 0.0
        while elapsed < max_wait:
            if bridge_available():
                bridge_ok = True
                break
            time.sleep(wait)
            elapsed += wait
            wait = min(wait * 1.5, 8)  # exponential backoff, cap at 8 s
        bridge_wait_seconds = elapsed

    # ── Output ────────────────────────────────────────────────────
    output: dict = {
        "action": "init",
        "framework": "ARCHON",
        "workspace": str(WORKSPACE),
        "docker_started": docker_started,
        "bridge_available": bridge_ok,
        "bridge_wait_seconds": bridge_wait_seconds,
        "ready": True,
    }
    if docker_error is not None:
        output["docker_error"] = docker_error
    if port_warnings:
        output["port_warnings"] = port_warnings

    print(json.dumps(output, indent=2))


def cmd_dispatch(args):
    """Create task in Kuzu graph and generate dispatch prompt."""
    now = datetime.utcnow().isoformat() + "Z"

    prefix_map = {
        "architect": "ARCH", "implementer": "IMPL", "tester": "TEST",
        "reviewer": "REVIEW", "knowledge-broker": "KB",
    }
    prefix = prefix_map.get(args.role, "TASK")

    existing = []
    for f in (WORKSPACE / "manifests").glob(f"{prefix}-*.json"):
        try:
            existing.append(int(f.stem.split("-")[1]))
        except (IndexError, ValueError):
            pass
    if bridge_available():
        state = bridge_call("GET", "/context/project_state")
        if state:
            for t in state.get("tasks", []):
                tid = t.get("task_id", "")
                if tid.startswith(prefix + "-"):
                    try:
                        existing.append(int(tid.split("-")[1]))
                    except (IndexError, ValueError):
                        pass

    task_id = f"{prefix}-{max(existing, default=0) + 1:03d}"

    budgets = {
        "architect": (30000, 8000), "implementer": (50000, 16000),
        "tester": (40000, 12000), "reviewer": (60000, 4000),
        "knowledge-broker": (80000, 2000),
    }
    budget_in, budget_out = budgets.get(args.role, (50000, 16000))

    bridge_ok = False
    if bridge_available():
        result = bridge_call("POST", "/context/create_task", {
            "task_id": task_id,
            "objective": args.task,
            "agent_role": args.role,
            "token_budget_in": budget_in,
            "token_budget_out": budget_out,
            "dependencies": args.upstream or [],
        })
        if result and "error" not in result:
            bridge_ok = True

    manifest = {
        "task_id": task_id,
        "agent_role": args.role,
        "created_at": now,
        "token_budget": {"context": budget_in, "output": budget_out},
        "objective": args.task,
        "acceptance_criteria": [
            f"Task '{args.task}' is fully addressed",
            "Output follows project conventions",
            "report.json passes schema validation",
        ],
        "context": {
            "target_files": args.scope or [],
            "readable_files": [],
            "project_conventions": {},
        },
        "upstream_dependencies": args.upstream or [],
        "downstream_consumers": args.downstream or [],
    }

    manifest_path = WORKSPACE / "manifests" / f"{task_id}.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))

    status = {"task_id": task_id, "agent_role": args.role, "status": "queued",
              "progress_pct": 0, "updated_at": now}
    if args.upstream:
        for dep in args.upstream:
            dep_file = WORKSPACE / "status" / f"{dep}.json"
            if dep_file.exists():
                ds = json.loads(dep_file.read_text())
                if ds.get("status") != "complete":
                    status["status"] = "blocked"
                    status.setdefault("blockers", []).append(dep)

    (WORKSPACE / "status" / f"{task_id}.json").write_text(json.dumps(status, indent=2))
    (WORKSPACE / "outputs" / task_id).mkdir(parents=True, exist_ok=True)

    envelope = None
    if bridge_ok:
        envelope = bridge_call("POST", "/context/task_envelope", {"task_id": task_id})

    prompt_lines = [
        f"You are executing task {task_id} as a {args.role} agent.",
        f"Write output to: .archon/workspace/outputs/{task_id}/",
        f"REQUIRED: Write report.json to your output directory when complete.",
        f"",
        f"Objective: {args.task}",
    ]

    # Inline envelope data so agents don't waste tokens reading manifest
    if envelope:
        # Token budget awareness
        budget = envelope.get("task", {}).get("token_budget", {})
        if budget:
            prompt_lines.append(f"")
            prompt_lines.append(f"Token budget: {budget.get('input', 50000)} input / {budget.get('output', 16000)} output")

        # Constraints from envelope
        constraints = envelope.get("task", {}).get("constraints", [])
        if constraints:
            prompt_lines.append("")
            prompt_lines.append("Constraints:")
            for c in constraints:
                prompt_lines.append(f"  - {c}")

        # Output contract
        contract = envelope.get("output_contract", {})
        if contract:
            prompt_lines.append("")
            prompt_lines.append(f"Output format: {contract.get('format', 'json')}")
            prompt_lines.append(f"Required file: {contract.get('required_file', 'report.json')}")
            fields = contract.get("schema_fields", [])
            if fields:
                prompt_lines.append(f"Required fields: {', '.join(fields)}")
            on_failure = contract.get("on_failure", "")
            if on_failure:
                prompt_lines.append(f"On failure: {on_failure}")

        # Dependencies with artifact context
        deps = envelope.get("dependencies", [])
        if deps:
            prompt_lines.append("")
            prompt_lines.append("Upstream dependencies:")
            for dep in deps:
                prompt_lines.append(f"  - {dep['task_id']}: {dep['summary']}")
                if dep.get("artifact_path"):
                    prompt_lines.append(f"    Artifact: {dep['artifact_path']}")
    else:
        # Fallback: tell agent to read manifest
        prompt_lines.insert(1, f"Read your context manifest: .archon/workspace/manifests/{task_id}.json")

    # Always include role instructions reference
    prompt_lines.append("")
    prompt_lines.append(f"Role instructions: .claude/skills/{args.role}.md")

    dispatch_prompt = "\n".join(prompt_lines)

    print(json.dumps({
        "action": "dispatch",
        "task_id": task_id,
        "role": args.role,
        "status": status["status"],
        "graph_registered": bridge_ok,
        "dispatch_prompt": dispatch_prompt,
    }, indent=2))


def cmd_status(args):
    """Get project state — from graph if available, files otherwise."""
    if bridge_available():
        result = bridge_call("GET", f"/context/project_state?project_id={args.project or 'default'}")
        if result:
            print(json.dumps(result, indent=2))
            return

    _ensure_tools_path()
    from project_state import get_project_state
    print(json.dumps(get_project_state(str(WORKSPACE)), indent=2))


def cmd_team(args):
    """Get optimal team dispatch plan from DAG analysis."""
    if not bridge_available():
        print(json.dumps({"error": "MCP Bridge unavailable. Start with: python scripts/framework.py init"}))
        return

    result = bridge_call("POST", "/coordination/dispatch_team", {
        "project_id": args.project or "default",
        "max_parallel": args.max_parallel,
    })
    print(json.dumps(result or {"error": "Bridge call failed"}, indent=2))


def cmd_envelope(args):
    """Generate context envelope for a task."""
    if not bridge_available():
        manifest_path = WORKSPACE / "manifests" / f"{args.task_id}.json"
        if manifest_path.exists():
            print(manifest_path.read_text())
        else:
            print(json.dumps({"error": f"Manifest not found: {args.task_id}"}))
        return

    result = bridge_call("POST", "/context/task_envelope", {"task_id": args.task_id})
    print(json.dumps(result or {"error": "Envelope generation failed"}, indent=2))


def cmd_validate(args):
    """Validate agent output."""
    _ensure_tools_path()
    from schema_validate import validate_file

    if args.task_id:
        file_path = str(WORKSPACE / "outputs" / args.task_id / "report.json")
    else:
        file_path = args.file

    schema_path = args.schema or str(WORKSPACE / "schemas" / "output-report.schema.json")
    print(json.dumps(validate_file(file_path, schema_path), indent=2))


def cmd_tokens(args):
    """Count tokens."""
    _ensure_tools_path()
    from token_counter import count_manifest_tokens, count_file_tokens

    if args.task_id:
        manifest_path = str(WORKSPACE / "manifests" / f"{args.task_id}.json")
        print(json.dumps(count_manifest_tokens(manifest_path, str(PROJECT_ROOT)), indent=2))
    elif args.files:
        total = 0
        per_file = {}
        for f in args.files:
            r = count_file_tokens(f)
            per_file[f] = r
            total += r.get("tokens", 0)
        print(json.dumps({"total_tokens": total, "per_file": per_file}, indent=2))
    else:
        print(json.dumps({"error": "Specify --task-id or --files"}))


def cmd_promote(args):
    """Promote output to handoffs."""
    output_dir = WORKSPACE / "outputs" / args.task_id
    handoff_dir = WORKSPACE / "handoffs" / args.task_id

    if not output_dir.exists():
        print(json.dumps({"error": f"No output for {args.task_id}"}))
        return

    handoff_dir.mkdir(parents=True, exist_ok=True)
    for item in output_dir.iterdir():
        dest = handoff_dir / item.name
        if item.is_file():
            shutil.copy2(str(item), str(dest))

    if bridge_available():
        bridge_call("POST", "/coordination/signal_done", {"task_id": args.task_id})

    print(json.dumps({"promoted": True, "task_id": args.task_id}))


def cmd_reset(args):
    """Clear all state."""
    cleared = 0
    for subdir in ["manifests", "outputs", "handoffs", "status", "logs"]:
        d = WORKSPACE / subdir
        if d.exists():
            for item in d.iterdir():
                if item.name == ".gitkeep":
                    continue
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(str(item))
                cleared += 1

    if args.include_memory:
        mem = WORKSPACE / "memory"
        if mem.exists():
            for item in mem.iterdir():
                if item.name != ".gitkeep":
                    item.unlink()
                    cleared += 1

    if bridge_available() and args.include_graph:
        pass  # Graph reset would go here

    print(json.dumps({"reset": True, "items_cleared": cleared}))


def cmd_dashboard(args):
    """Generate dashboard."""
    state = None
    if bridge_available():
        state = bridge_call("GET", "/context/project_state")

    if not state:
        _ensure_tools_path()
        from project_state import get_project_state
        state = get_project_state(str(WORKSPACE))

    summary = state.get("summary", {})
    tasks = state.get("tasks", [])
    ready = state.get("ready_tasks", state.get("next_actions", []))
    layers = state.get("dag_layers", [])
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    lines = [
        f"## ARCHON Dashboard — {now}",
        "",
        f"**Tasks:** {summary.get('complete', 0)}/{summary.get('total', 0)} complete"
        f" | {summary.get('in_progress', summary.get('active', 0))} active"
        f" | {summary.get('queued', 0)} queued"
        f" | {summary.get('blocked', 0)} blocked",
    ]

    if layers:
        lines.append(f"**DAG Layers:** {len(layers)} (parallelizable: {sum(1 for l in layers if isinstance(l, list) and len(l) > 1)})")

    if tasks:
        lines.extend(["", "| Task | Role | Status | Objective |", "|------|------|--------|-----------|"])
        icons = {"complete": "✅", "in_progress": "🔄", "queued": "⏳", "blocked": "🚫", "failed": "❌", "decomposed": "🔀"}
        for t in tasks:
            s = t.get("status", "?")
            icon = icons.get(s, "❓")
            obj = (t.get("objective", "")[:60] + "...") if len(t.get("objective", "")) > 60 else t.get("objective", "")
            lines.append(f"| {t.get('task_id', '?')} | {t.get('role', t.get('agent_role', '?'))} | {icon} {s} | {obj} |")

    if ready:
        ready_ids = [r.get("task_id", r) if isinstance(r, dict) else r for r in ready]
        lines.extend(["", f"**Ready to dispatch:** {', '.join(ready_ids)}"])

    if bridge_available():
        stats = bridge_call("GET", "/scripts/stats")
        if stats:
            lines.append(f"**Script cache:** {stats.get('scripts_registered', 0)} scripts, {stats.get('total_cache_hits', 0)} hits, ~{stats.get('estimated_tokens_saved', 0):,} tokens saved")

    dashboard = "\n".join(lines)
    (WORKSPACE / "status" / "DASHBOARD.md").write_text(dashboard)
    print(dashboard)


def cmd_cache_stats(args):
    """Show script cache statistics."""
    if not bridge_available():
        print(json.dumps({"error": "Bridge unavailable"}))
        return
    result = bridge_call("GET", "/scripts/stats")
    print(json.dumps(result or {}, indent=2))


# ── User-Facing Convenience Commands ─────────────────────────────


def cmd_health(args):
    """Check infrastructure health: bridge, Redis, Kuzu, LanceDB, Docker."""
    checks = {}

    # Docker
    if shutil.which("docker"):
        try:
            r = subprocess.run(["docker", "info"], capture_output=True, timeout=5)
            checks["docker_daemon"] = r.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            checks["docker_daemon"] = False
        if checks["docker_daemon"]:
            try:
                r = subprocess.run(
                    ["docker", "compose", "ps", "--format", "json"],
                    cwd=str(ARCHON_DIR), capture_output=True, timeout=10,
                )
                checks["compose_running"] = r.returncode == 0
            except (subprocess.TimeoutExpired, FileNotFoundError):
                checks["compose_running"] = False
    else:
        checks["docker_installed"] = False

    # Bridge
    bridge_result = bridge_call("GET", "/health")
    if bridge_result:
        checks["bridge"] = bridge_result.get("status", "unknown")
        checks.update({f"bridge_{k}": v for k, v in bridge_result.get("checks", {}).items()})
    else:
        checks["bridge"] = "unreachable"

    # Ports
    checks["port_6379_redis"] = "in_use" if _port_in_use(6379) else "free"
    checks["port_8420_bridge"] = "in_use" if _port_in_use(8420) else "free"

    # Workspace
    checks["workspace_exists"] = WORKSPACE.exists()
    if WORKSPACE.exists():
        checks["workspace_dirs"] = {
            d: (WORKSPACE / d).exists()
            for d in ["manifests", "outputs", "handoffs", "status", "logs"]
        }

    healthy = checks.get("bridge") in ("healthy", "degraded")
    print(json.dumps({"healthy": healthy, "checks": checks}, indent=2))


def cmd_logs(args):
    """View recent hook activity logs."""
    log_file = WORKSPACE / "logs" / "hooks.jsonl"
    if not log_file.exists():
        print("No hook logs found.")
        return

    lines = log_file.read_text(encoding="utf-8").strip().split("\n")
    tail = args.tail or 20

    # Parse and display recent entries
    entries = []
    for line in lines[-tail:]:
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue

    if args.json:
        print(json.dumps(entries, indent=2))
    else:
        for e in entries:
            ts = e.get("timestamp", "?")[:19]
            event = e.get("event", "?")
            task = e.get("task_id", "")
            extra = ""
            if e.get("tool"):
                extra = f" tool={e['tool']}"
            if e.get("script_id"):
                extra += f" script={e['script_id']}"
            if e.get("file"):
                extra = f" file={e['file']}"
            task_str = f" [{task}]" if task else ""
            print(f"{ts}  {event}{task_str}{extra}")


def cmd_ready(args):
    """Show tasks ready for dispatch — a quick view for manual workflow."""
    if bridge_available():
        ready = bridge_call("GET", f"/context/ready_tasks?project_id={args.project or 'default'}")
        if ready:
            if not ready:
                print("No tasks ready for dispatch.")
                return
            print(f"\n  Ready tasks ({len(ready)}):\n")
            for t in ready:
                print(f"  {t['task_id']:12s}  {t['agent_role']:15s}  {t['objective'][:60]}")
            print()
            return

    # File-based fallback: show queued tasks from status files
    status_dir = WORKSPACE / "status"
    if not status_dir.exists():
        print("No tasks found. Run 'archon init' first.")
        return

    queued = []
    for sf in status_dir.glob("*.json"):
        if sf.name == "DASHBOARD.md":
            continue
        try:
            data = json.loads(sf.read_text(encoding="utf-8"))
            if data.get("status") == "queued":
                queued.append(data)
        except (json.JSONDecodeError, OSError):
            continue

    if not queued:
        print("No tasks ready for dispatch.")
    else:
        print(f"\n  Queued tasks ({len(queued)}):\n")
        for t in queued:
            print(f"  {t['task_id']:12s}  {t.get('agent_role', '?'):15s}")
        print()


def cmd_stop(args):
    """Stop ARCHON Docker infrastructure."""
    if not COMPOSE_FILE.exists():
        print(json.dumps({"error": "No docker-compose.yml found"}))
        return

    try:
        result = subprocess.run(
            ["docker", "compose", "down"],
            cwd=str(ARCHON_DIR), capture_output=True, timeout=30,
        )
        if result.returncode == 0:
            print(json.dumps({"stopped": True, "message": "ARCHON infrastructure stopped."}))
        else:
            stderr = result.stderr.decode(errors="replace").strip()
            print(json.dumps({"stopped": False, "error": stderr}))
    except FileNotFoundError:
        print(json.dumps({"stopped": False, "error": "Docker not found in PATH"}))
    except subprocess.TimeoutExpired:
        print(json.dumps({"stopped": False, "error": "Timed out after 30s"}))


def cmd_sync(args):
    """Synchronize task status between filesystem and Kuzu graph via bridge."""
    if not bridge_available():
        print(json.dumps({"error": "Bridge unavailable. Start with: archon init"}))
        return

    result = bridge_call("POST", "/coordination/sync_status", {
        "workspace_path": str(WORKSPACE),
        "project_id": args.project or "default",
    })
    print(json.dumps(result or {"error": "Sync failed"}, indent=2))


def cmd_poll(args):
    """Poll for recently completed tasks — see what finished since last check."""
    if not bridge_available():
        print(json.dumps({"error": "Bridge unavailable. Start with: archon init"}))
        return

    result = bridge_call("GET", "/coordination/poll_completions")
    if not result:
        print(json.dumps({"error": "Poll failed"}))
        return

    events = result.get("recent_events", [])
    ready = result.get("ready_tasks", [])

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if events:
            print(f"\n  Recent completions ({len(events)}):\n")
            for e in events[-10:]:
                status_icon = "+" if e.get("status") == "complete" else "x"
                print(f"  [{status_icon}] {e.get('task_id', '?'):12s}  {e.get('status', '?'):10s}  {e.get('timestamp', '')[:19]}")
        else:
            print("\n  No recent completions.")

        if ready:
            print(f"\n  Ready to dispatch ({len(ready)}):\n")
            for t in ready:
                print(f"  --> {t['task_id']:12s}  {t['role']:15s}  {t['objective'][:50]}")
        print()


def cmd_doctor(args):
    """Run diagnostics on the ARCHON framework installation."""
    issues = []
    info = {}

    # Python version
    info["python_version"] = sys.version.split()[0]
    v = sys.version_info
    if v < (3, 10):
        issues.append(f"Python 3.10+ required (found {info['python_version']})")

    # Docker
    docker_path = shutil.which("docker")
    info["docker_installed"] = docker_path is not None
    if not docker_path:
        issues.append("Docker not found in PATH")
    else:
        try:
            r = subprocess.run(["docker", "info"], capture_output=True, timeout=5)
            info["docker_running"] = r.returncode == 0
            if not info["docker_running"]:
                issues.append("Docker daemon is not running")
        except (subprocess.TimeoutExpired, FileNotFoundError):
            info["docker_running"] = False
            issues.append("Docker daemon check failed")

    # Required packages
    missing_pkgs = []
    for pkg in ["fastapi", "uvicorn", "redis", "kuzu", "lancedb", "pyarrow", "pydantic", "httpx"]:
        try:
            __import__(pkg)
        except ImportError:
            missing_pkgs.append(pkg)
    info["missing_packages"] = missing_pkgs
    if missing_pkgs:
        issues.append(f"Missing packages: {', '.join(missing_pkgs)}. Run: pip install -r .archon/requirements.txt")

    # Workspace
    info["workspace_exists"] = WORKSPACE.exists()
    if not WORKSPACE.exists():
        issues.append("Workspace not initialized. Run: archon init")

    # Compose file
    info["docker_compose_exists"] = COMPOSE_FILE.exists()

    # Bridge
    info["bridge_reachable"] = bridge_available()
    if not info["bridge_reachable"] and info.get("docker_running"):
        issues.append("Bridge not reachable at localhost:8420. Run: archon init")

    # Ports
    for port, name in [(6379, "Redis"), (8420, "Bridge")]:
        info[f"port_{port}"] = "in_use" if _port_in_use(port) else "free"

    # MCP tools
    tools_installed = (PROJECT_ROOT / ".archon" / "tools").exists()
    tools_source = (PROJECT_ROOT / "mcp-tools").exists()
    info["mcp_tools"] = "installed" if tools_installed else ("source" if tools_source else "missing")
    if not tools_installed and not tools_source:
        issues.append("MCP tools directory not found")

    # Summary
    if issues:
        print(f"\n  ARCHON Doctor — {len(issues)} issue(s) found:\n")
        for i, issue in enumerate(issues, 1):
            print(f"  {i}. {issue}")
        print()
    else:
        print("\n  ARCHON Doctor — All checks passed!\n")

    if args.json:
        print(json.dumps({"issues": issues, "info": info}, indent=2))
    else:
        print(f"  Python:     {info['python_version']}")
        print(f"  Docker:     {'OK' if info.get('docker_running') else 'NOT RUNNING' if info.get('docker_installed') else 'NOT INSTALLED'}")
        print(f"  Bridge:     {'OK' if info['bridge_reachable'] else 'UNREACHABLE'}")
        print(f"  Workspace:  {'OK' if info['workspace_exists'] else 'NOT INITIALIZED'}")
        print(f"  MCP Tools:  {info['mcp_tools']}")
        if missing_pkgs:
            print(f"  Packages:   MISSING ({', '.join(missing_pkgs)})")
        else:
            print(f"  Packages:   All installed")
        print()


# ── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="archon",
        description="ARCHON Framework CLI — Agentic Orchestration",
        epilog="""
quick start:
  archon doctor            Check your installation
  archon init              Start infrastructure
  archon dashboard         See project status
  archon ready             Show tasks ready for dispatch
  archon poll              Check for recently completed tasks
""",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ── Infrastructure ──
    sub.add_parser("init", help="Start Docker infrastructure + initialize workspace")
    sub.add_parser("stop", help="Stop Docker infrastructure")
    sub.add_parser("health", help="Check infrastructure health (bridge, Redis, Kuzu)")
    p = sub.add_parser("doctor", help="Run full installation diagnostics")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    # ── Task Management ──
    p = sub.add_parser("dispatch", help="Create task + generate dispatch prompt")
    p.add_argument("--task", required=True, help="Task objective description")
    p.add_argument("--role", required=True, choices=["architect", "implementer", "tester", "reviewer", "knowledge-broker"])
    p.add_argument("--scope", nargs="+", default=[], help="Target file paths")
    p.add_argument("--upstream", nargs="*", help="Upstream dependency task IDs")
    p.add_argument("--downstream", nargs="*", help="Downstream consumer task IDs")

    p = sub.add_parser("status", help="Get project state from graph or files")
    p.add_argument("--project", default="default")

    p = sub.add_parser("team", help="Get optimal team dispatch plan from DAG")
    p.add_argument("--project", default="default")
    p.add_argument("--max-parallel", type=int, default=4, help="Max concurrent agents")

    p = sub.add_parser("ready", help="Show tasks ready for dispatch")
    p.add_argument("--project", default="default")

    p = sub.add_parser("poll", help="Poll for recently completed tasks")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    p = sub.add_parser("envelope", help="Generate context envelope for a task")
    p.add_argument("task_id")

    p = sub.add_parser("validate", help="Validate agent output")
    p.add_argument("--task-id")
    p.add_argument("--file")
    p.add_argument("--schema")

    p = sub.add_parser("tokens", help="Count tokens for files or manifests")
    p.add_argument("--task-id")
    p.add_argument("--files", nargs="*")

    p = sub.add_parser("promote", help="Promote task output to handoffs")
    p.add_argument("task_id")

    # ── State Management ──
    p = sub.add_parser("sync", help="Sync task status between filesystem and graph")
    p.add_argument("--project", default="default")

    p = sub.add_parser("reset", help="Clear all workspace state")
    p.add_argument("--include-memory", action="store_true")
    p.add_argument("--include-graph", action="store_true")

    # ── Monitoring ──
    sub.add_parser("dashboard", help="Generate and display project dashboard")
    sub.add_parser("cache-stats", help="Show script cache statistics")

    p = sub.add_parser("logs", help="View recent hook activity logs")
    p.add_argument("--tail", type=int, default=20, help="Number of recent entries (default: 20)")
    p.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()
    cmds = {
        "init": cmd_init, "stop": cmd_stop, "health": cmd_health, "doctor": cmd_doctor,
        "dispatch": cmd_dispatch, "status": cmd_status, "team": cmd_team,
        "ready": cmd_ready, "poll": cmd_poll, "envelope": cmd_envelope,
        "validate": cmd_validate, "tokens": cmd_tokens, "promote": cmd_promote,
        "sync": cmd_sync, "reset": cmd_reset,
        "dashboard": cmd_dashboard, "cache-stats": cmd_cache_stats, "logs": cmd_logs,
    }
    cmds[args.command](args)


if __name__ == "__main__":
    main()
