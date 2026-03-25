#!/usr/bin/env python3
"""
token_counter — Budget Enforcement MCP Tool

Counts tokens in files, manifests, and agent outputs. Used by hooks to
enforce token budgets before agent dispatch and track consumption.

Uses a fast character-based approximation (1 token ≈ 4 chars for English code).
For exact counts, set --exact to use tiktoken if available.

Usage as MCP tool:
  Input:  {"files": ["path1.py", "path2.py"]}
  Output: {"total_tokens": 12450, "per_file": {...}, "budget_remaining": 37550}

Usage as CLI:
  python token_counter.py --files path1.py path2.py
  python token_counter.py --files path1.py --budget 50000
  python token_counter.py --manifest .archon/workspace/manifests/IMPL-001.json
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional


# Approximate tokens per character for different content types
CHARS_PER_TOKEN = {
    "code": 3.5,      # Code is denser (shorter variable names, symbols)
    "prose": 4.0,     # English prose
    "json": 3.0,      # JSON has lots of quotes and braces
    "markdown": 4.0,  # Similar to prose
}

EXTENSION_TYPE = {
    ".py": "code", ".js": "code", ".ts": "code", ".jsx": "code", ".tsx": "code",
    ".go": "code", ".rs": "code", ".java": "code", ".cs": "code", ".rb": "code",
    ".c": "code", ".cpp": "code", ".h": "code", ".hpp": "code",
    ".json": "json", ".yaml": "json", ".yml": "json", ".toml": "json",
    ".md": "markdown", ".txt": "prose", ".rst": "prose",
    ".html": "code", ".css": "code", ".sql": "code",
    ".sh": "code", ".bash": "code", ".ps1": "code",
}


def count_tokens_approx(text: str, content_type: str = "code") -> int:
    """Approximate token count based on character count."""
    chars_per = CHARS_PER_TOKEN.get(content_type, 4.0)
    return max(1, int(len(text) / chars_per))


def count_tokens_exact(text: str) -> Optional[int]:
    """Exact token count using tiktoken (if available)."""
    try:
        import tiktoken
        enc = tiktoken.encoding_for_model("claude-sonnet-4-20250514")
        return len(enc.encode(text))
    except (ImportError, Exception):
        return None


def count_file_tokens(filepath: str, exact: bool = False) -> dict:
    """Count tokens in a single file."""
    path = Path(filepath)

    if not path.exists():
        return {"file": filepath, "error": "File not found", "tokens": 0}

    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        return {"file": filepath, "error": str(e), "tokens": 0}

    content_type = EXTENSION_TYPE.get(path.suffix, "prose")
    lines = text.count("\n") + 1
    chars = len(text)

    if exact:
        tokens = count_tokens_exact(text)
        if tokens is None:
            tokens = count_tokens_approx(text, content_type)
            method = "approximate"
        else:
            method = "exact"
    else:
        tokens = count_tokens_approx(text, content_type)
        method = "approximate"

    return {
        "file": filepath,
        "tokens": tokens,
        "lines": lines,
        "chars": chars,
        "content_type": content_type,
        "method": method,
    }


def count_manifest_tokens(manifest_path: str, project_root: str = ".", exact: bool = False) -> dict:
    """Count total tokens for all files referenced in a context manifest."""
    path = Path(manifest_path)
    if not path.exists():
        return {"error": f"Manifest not found: {manifest_path}"}

    try:
        manifest = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        return {"error": f"Failed to parse manifest: {e}"}

    context = manifest.get("context", {})
    budget = manifest.get("token_budget", {})
    budget_context = budget.get("context", 50000)

    all_files = []
    all_files.extend(context.get("target_files", []))
    all_files.extend(context.get("readable_files", []))
    all_files.extend(context.get("memory_refs", []))

    # Add architect spec if present
    spec = context.get("architect_spec")
    if spec:
        all_files.append(spec)

    # Add reference snippet sources
    for snippet in context.get("reference_snippets", []):
        source = snippet.get("source")
        if source:
            all_files.append(source)

    # Deduplicate
    all_files = sorted(set(all_files))

    per_file = {}
    total_tokens = 0

    root = Path(project_root)
    for filepath in all_files:
        full_path = root / filepath
        result = count_file_tokens(str(full_path), exact)
        per_file[filepath] = result
        total_tokens += result.get("tokens", 0)

    # Add manifest objective and acceptance criteria token estimate
    objective_text = manifest.get("objective", "")
    criteria_text = " ".join(manifest.get("acceptance_criteria", []))
    overhead_tokens = count_tokens_approx(objective_text + criteria_text, "prose")
    total_tokens += overhead_tokens

    return {
        "manifest": manifest_path,
        "task_id": manifest.get("task_id", "unknown"),
        "agent_role": manifest.get("agent_role", "unknown"),
        "budget_context": budget_context,
        "total_tokens": total_tokens,
        "budget_remaining": budget_context - total_tokens,
        "over_budget": total_tokens > budget_context,
        "utilization_pct": round((total_tokens / budget_context) * 100, 1) if budget_context > 0 else 0,
        "overhead_tokens": overhead_tokens,
        "file_count": len(all_files),
        "per_file": per_file,
    }


def main():
    parser = argparse.ArgumentParser(description="Count tokens in files or manifests")
    parser.add_argument("--files", nargs="*", help="File paths to count tokens in")
    parser.add_argument("--manifest", help="Path to context manifest to analyze")
    parser.add_argument("--budget", type=int, help="Token budget to compare against")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    parser.add_argument("--exact", action="store_true", help="Use tiktoken for exact counts (slower)")
    parser.add_argument("--json-input", action="store_true", help="Read JSON input from stdin")
    args = parser.parse_args()

    if args.json_input:
        input_data = json.load(sys.stdin)
        args.files = input_data.get("files", args.files)
        args.manifest = input_data.get("manifest", args.manifest)
        args.budget = input_data.get("budget", args.budget)
        args.exact = input_data.get("exact", args.exact)

    if args.manifest:
        result = count_manifest_tokens(args.manifest, args.project_root, args.exact)
    elif args.files:
        per_file = {}
        total = 0
        for f in args.files:
            r = count_file_tokens(f, args.exact)
            per_file[f] = r
            total += r.get("tokens", 0)

        result = {
            "total_tokens": total,
            "file_count": len(args.files),
            "per_file": per_file,
        }

        if args.budget:
            result["budget"] = args.budget
            result["budget_remaining"] = args.budget - total
            result["over_budget"] = total > args.budget
            result["utilization_pct"] = round((total / args.budget) * 100, 1) if args.budget > 0 else 0
    else:
        result = {"error": "Specify --files or --manifest"}

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
