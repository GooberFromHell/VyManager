#!/usr/bin/env python3
"""
context_extract — Surgical Context Retrieval MCP Tool

Extracts specific symbols, line ranges, or sections from files instead of
reading entire files. Reduces token consumption by 70-90% per file access.

Usage as MCP tool:
  Input:  {"file": "path/to/file.py", "symbols": ["ClassName", "func_name"], "lines": "10-50"}
  Output: Extracted code with minimal surrounding context

Usage as CLI:
  python context_extract.py --file path/to/file.py --symbols ClassName func_name
  python context_extract.py --file path/to/file.py --lines 10-50
"""

import argparse
import ast
import json
import sys
import re
from pathlib import Path
from typing import Optional


def extract_python_symbols(filepath: str, symbols: list[str]) -> dict:
    """Extract specific class/function definitions from a Python file using AST."""
    path = Path(filepath)
    if not path.exists():
        return {"error": f"File not found: {filepath}"}

    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()

    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return {"error": f"Parse error in {filepath}: {e}"}

    results = {}
    for node in ast.walk(tree):
        name = getattr(node, "name", None)
        if name and name in symbols:
            start = node.lineno - 1
            end = getattr(node, "end_lineno", start + 1)
            extracted = "\n".join(lines[start:end])
            results[name] = {
                "lines": f"{start + 1}-{end}",
                "code": extracted,
                "type": type(node).__name__,
            }

    missing = [s for s in symbols if s not in results]
    return {
        "file": filepath,
        "extracted": results,
        "missing": missing,
        "total_file_lines": len(lines),
        "extracted_lines": sum(
            int(r["lines"].split("-")[1]) - int(r["lines"].split("-")[0]) + 1
            for r in results.values()
        ),
    }


def extract_lines(filepath: str, line_range: str) -> dict:
    """Extract a specific line range from a file."""
    path = Path(filepath)
    if not path.exists():
        return {"error": f"File not found: {filepath}"}

    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()

    match = re.match(r"(\d+)-(\d+)", line_range)
    if not match:
        return {"error": f"Invalid line range format: {line_range}. Use START-END."}

    start = max(0, int(match.group(1)) - 1)
    end = min(len(lines), int(match.group(2)))

    extracted = "\n".join(lines[start:end])
    return {
        "file": filepath,
        "lines": f"{start + 1}-{end}",
        "code": extracted,
        "total_file_lines": len(lines),
        "extracted_lines": end - start,
    }


def extract_generic_symbols(filepath: str, symbols: list[str]) -> dict:
    """Fallback symbol extraction using regex for non-Python files."""
    path = Path(filepath)
    if not path.exists():
        return {"error": f"File not found: {filepath}"}

    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()

    patterns = {
        "function": re.compile(
            r"^(?:export\s+)?(?:async\s+)?(?:function|def|fn|func)\s+({symbol})\s*[\(<]",
            re.MULTILINE,
        ),
        "class": re.compile(
            r"^(?:export\s+)?(?:abstract\s+)?class\s+({symbol})\s*[\({<:]",
            re.MULTILINE,
        ),
        "const": re.compile(
            r"^(?:export\s+)?(?:const|let|var)\s+({symbol})\s*[=:]",
            re.MULTILINE,
        ),
    }

    results = {}
    for symbol in symbols:
        for kind, pattern_template in patterns.items():
            pattern = re.compile(
                pattern_template.pattern.replace("{symbol}", re.escape(symbol)),
                re.MULTILINE,
            )
            match = pattern.search(source)
            if match:
                start_line = source[: match.start()].count("\n")
                # Find the end of the block (next blank line or same-level definition)
                end_line = start_line + 1
                indent = len(lines[start_line]) - len(lines[start_line].lstrip())
                for i in range(start_line + 1, len(lines)):
                    line = lines[i]
                    if line.strip() == "":
                        continue
                    line_indent = len(line) - len(line.lstrip())
                    if line_indent <= indent and i > start_line + 1:
                        end_line = i
                        break
                    end_line = i + 1

                results[symbol] = {
                    "lines": f"{start_line + 1}-{end_line}",
                    "code": "\n".join(lines[start_line:end_line]),
                    "type": kind,
                }
                break

    missing = [s for s in symbols if s not in results]
    return {
        "file": filepath,
        "extracted": results,
        "missing": missing,
        "total_file_lines": len(lines),
    }


def main():
    parser = argparse.ArgumentParser(description="Extract symbols or line ranges from files")
    parser.add_argument("--file", required=True, help="Path to the file")
    parser.add_argument("--symbols", nargs="*", help="Symbol names to extract")
    parser.add_argument("--lines", help="Line range to extract (e.g., 10-50)")
    parser.add_argument("--json-input", action="store_true", help="Read JSON input from stdin")
    args = parser.parse_args()

    if args.json_input:
        input_data = json.load(sys.stdin)
        args.file = input_data.get("file", args.file)
        args.symbols = input_data.get("symbols", args.symbols)
        args.lines = input_data.get("lines", args.lines)

    if args.lines:
        result = extract_lines(args.file, args.lines)
    elif args.symbols:
        if args.file.endswith(".py"):
            result = extract_python_symbols(args.file, args.symbols)
        else:
            result = extract_generic_symbols(args.file, args.symbols)
    else:
        result = {"error": "Specify --symbols or --lines"}

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
