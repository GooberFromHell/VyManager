#!/usr/bin/env python3
"""
manifest_builder — Context Manifest Generator MCP Tool

Takes a task description and agent role, then generates the context manifest
by analyzing the codebase to determine which files and symbols are relevant.
Uses AST parsing and dependency analysis rather than LLM inference.

Usage as MCP tool:
  Input:  {"task": "Implement WebSocket manager", "role": "implementer", "scope": ["backend/app/services/"]}
  Output: Complete context manifest JSON

Usage as CLI:
  python manifest_builder.py --task "Implement WebSocket manager" --role implementer --scope backend/app/services/
"""

import argparse
import ast
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional


# Default token budgets per role
DEFAULT_BUDGETS = {
    "architect": {"context": 30000, "output": 8000},
    "implementer": {"context": 50000, "output": 16000},
    "tester": {"context": 40000, "output": 12000},
    "reviewer": {"context": 60000, "output": 4000},
    "knowledge-broker": {"context": 80000, "output": 2000},
}

# Task ID prefixes per role
ROLE_PREFIXES = {
    "architect": "ARCH",
    "implementer": "IMPL",
    "tester": "TEST",
    "reviewer": "REVIEW",
    "knowledge-broker": "KB",
}


def get_next_task_id(workspace: str, role: str) -> str:
    """Generate the next sequential task ID for a role."""
    prefix = ROLE_PREFIXES.get(role, "TASK")
    manifest_dir = Path(workspace) / "manifests"

    existing = []
    if manifest_dir.exists():
        for f in manifest_dir.glob(f"{prefix}-*.json"):
            try:
                num = int(f.stem.split("-")[1])
                existing.append(num)
            except (IndexError, ValueError):
                pass

    next_num = max(existing, default=0) + 1
    return f"{prefix}-{next_num:03d}"


def discover_files(scope_dirs: list[str], project_root: str = ".") -> list[str]:
    """Discover relevant source files in the given scope directories."""
    root = Path(project_root)
    files = []

    # Relevant extensions
    extensions = {".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs", ".java", ".cs", ".rb"}
    # Skip directories
    skip_dirs = {"node_modules", ".venv", "venv", "__pycache__", ".git", ".archon", "dist", "build"}

    for scope in scope_dirs:
        scope_path = root / scope
        if scope_path.is_file():
            files.append(str(scope_path.relative_to(root)))
            continue

        if not scope_path.exists():
            continue

        for dirpath, dirnames, filenames in os.walk(scope_path):
            # Filter out skip directories
            dirnames[:] = [d for d in dirnames if d not in skip_dirs]

            for filename in filenames:
                filepath = Path(dirpath) / filename
                if filepath.suffix in extensions:
                    files.append(str(filepath.relative_to(root)))

    return sorted(files)


def analyze_python_imports(filepath: str) -> list[str]:
    """Extract import dependencies from a Python file."""
    try:
        source = Path(filepath).read_text(encoding="utf-8")
        tree = ast.parse(source)
    except (SyntaxError, OSError):
        return []

    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append(node.module)

    return imports


def find_related_files(target_files: list[str], project_root: str = ".") -> list[str]:
    """Find files that are imported by or import the target files."""
    related = set()
    root = Path(project_root)

    for target in target_files:
        target_path = root / target
        if not target_path.exists() or target_path.suffix != ".py":
            continue

        # Get imports from target file
        imports = analyze_python_imports(str(target_path))

        # Convert module imports to potential file paths
        for imp in imports:
            parts = imp.replace(".", "/")
            candidates = [
                f"{parts}.py",
                f"{parts}/__init__.py",
            ]
            for candidate in candidates:
                candidate_path = root / candidate
                if candidate_path.exists():
                    rel = str(candidate_path.relative_to(root))
                    if rel not in target_files:
                        related.add(rel)

    return sorted(related)


def find_test_files(target_files: list[str], project_root: str = ".") -> list[str]:
    """Find existing test files related to target files."""
    root = Path(project_root)
    test_files = []

    for target in target_files:
        target_path = Path(target)
        name = target_path.stem

        # Common test file patterns
        patterns = [
            target_path.parent / f"test_{name}{target_path.suffix}",
            target_path.parent / f"{name}_test{target_path.suffix}",
            target_path.parent / "__tests__" / f"test_{name}{target_path.suffix}",
            Path("tests") / f"test_{name}{target_path.suffix}",
            Path("tests") / target_path.parent / f"test_{name}{target_path.suffix}",
        ]

        for pattern in patterns:
            full_path = root / pattern
            if full_path.exists():
                test_files.append(str(pattern))

    return sorted(set(test_files))


def detect_conventions(scope_files: list[str], project_root: str = ".") -> dict:
    """Detect project conventions from existing code."""
    conventions = {}
    root = Path(project_root)

    python_files = [f for f in scope_files if f.endswith(".py")]
    if not python_files:
        return conventions

    # Sample the first few files for patterns
    for filepath in python_files[:5]:
        try:
            source = (root / filepath).read_text(encoding="utf-8")
        except OSError:
            continue

        # Detect import style
        if "from backend." in source or "from app." in source:
            match = re.search(r"from (\w+(?:\.\w+)*)", source)
            if match:
                conventions["import_style"] = f"absolute imports from {match.group(1).split('.')[0]}"

        # Detect logging
        if "structlog" in source:
            conventions["logging"] = "structlog"
        elif "import logging" in source:
            conventions["logging"] = "stdlib logging"

        # Detect error handling patterns
        if "raise HTTPException" in source:
            conventions["error_handling"] = "FastAPI HTTPException"
        elif "raise ValueError" in source or "raise TypeError" in source:
            conventions["error_handling"] = "stdlib exceptions"

    return conventions


def build_manifest(
    task: str,
    role: str,
    scope: list[str],
    workspace: str = ".archon/workspace",
    project_root: str = ".",
    upstream: list[str] = None,
    downstream: list[str] = None,
) -> dict:
    """Build a complete context manifest for a task."""
    task_id = get_next_task_id(workspace, role)
    budget = DEFAULT_BUDGETS.get(role, {"context": 50000, "output": 16000})

    # Discover files in scope
    scope_files = discover_files(scope, project_root)

    # Determine target files vs readable files based on role
    if role == "implementer":
        target_files = scope_files
        readable_files = find_related_files(scope_files, project_root)
    elif role == "tester":
        target_files = find_test_files(scope_files, project_root)
        if not target_files:
            # Generate expected test file paths
            target_files = [
                str(Path("tests") / f"test_{Path(f).stem}{Path(f).suffix}")
                for f in scope_files
            ]
        readable_files = scope_files  # Testers read the code under test
    elif role == "reviewer":
        target_files = []  # Reviewers don't write code
        readable_files = scope_files + find_test_files(scope_files, project_root)
    elif role == "knowledge-broker":
        target_files = []  # KB writes to memory/
        readable_files = scope_files
    else:  # architect
        target_files = []  # Architects write specs, not code
        readable_files = scope_files

    # Detect conventions
    conventions = detect_conventions(scope_files, project_root)

    # Check for upstream handoffs
    architect_spec = None
    if upstream:
        for dep in upstream:
            handoff_dir = Path(workspace) / "handoffs" / dep
            if handoff_dir.exists():
                # Look for spec files
                for f in handoff_dir.glob("*.md"):
                    architect_spec = str(f)
                    break

    # Find memory references
    memory_refs = []
    memory_dir = Path(workspace) / "memory"
    if memory_dir.exists():
        for f in memory_dir.glob("*.md"):
            memory_refs.append(str(f))

    manifest = {
        "task_id": task_id,
        "agent_role": role,
        "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "token_budget": budget,
        "objective": task,
        "acceptance_criteria": [
            f"Task '{task}' is fully addressed",
            "All output follows project conventions",
            "Output report.json passes schema validation",
        ],
        "context": {
            "target_files": target_files,
            "readable_files": readable_files,
            "project_conventions": conventions,
        },
        "upstream_dependencies": upstream or [],
        "downstream_consumers": downstream or [],
    }

    if architect_spec:
        manifest["context"]["architect_spec"] = architect_spec

    if memory_refs:
        manifest["context"]["memory_refs"] = memory_refs

    return manifest


def main():
    parser = argparse.ArgumentParser(description="Build a context manifest for an agent task")
    parser.add_argument("--task", required=True, help="Task description / objective")
    parser.add_argument("--role", required=True, choices=list(ROLE_PREFIXES.keys()), help="Agent role")
    parser.add_argument("--scope", nargs="+", required=True, help="Directory or file paths to scope")
    parser.add_argument("--workspace", default=".archon/workspace", help="Path to .archon/workspace")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    parser.add_argument("--upstream", nargs="*", help="Upstream dependency task IDs")
    parser.add_argument("--downstream", nargs="*", help="Downstream consumer task IDs")
    parser.add_argument("--save", action="store_true", help="Save manifest to manifests/ directory")
    parser.add_argument("--json-input", action="store_true", help="Read JSON input from stdin")
    args = parser.parse_args()

    if args.json_input:
        input_data = json.load(sys.stdin)
        args.task = input_data.get("task", args.task)
        args.role = input_data.get("role", args.role)
        args.scope = input_data.get("scope", args.scope)
        args.workspace = input_data.get("workspace", args.workspace)
        args.upstream = input_data.get("upstream", args.upstream)
        args.downstream = input_data.get("downstream", args.downstream)
        args.save = input_data.get("save", args.save)

    manifest = build_manifest(
        task=args.task,
        role=args.role,
        scope=args.scope,
        workspace=args.workspace,
        project_root=args.project_root,
        upstream=args.upstream,
        downstream=args.downstream,
    )

    if args.save:
        manifest_dir = Path(args.workspace) / "manifests"
        manifest_dir.mkdir(parents=True, exist_ok=True)
        output_path = manifest_dir / f"{manifest['task_id']}.json"
        output_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"Manifest saved to: {output_path}", file=sys.stderr)

    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
