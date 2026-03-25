#!/usr/bin/env python3
"""
schema_validate — Output Verification MCP Tool

Validates that a JSON file matches an expected schema. Used as a quality gate
to catch malformed agent outputs before they enter the handoff pipeline.

Usage as MCP tool:
  Input:  {"file": "path/to/output.json", "schema": "path/to/schema.json"}
  Output: {"valid": true} or {"valid": false, "errors": [...]}

Usage as CLI:
  python schema_validate.py --file output.json --schema schemas/output-report.schema.json
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def validate_type(value: Any, expected_type: str) -> bool:
    """Validate a value matches a JSON Schema type."""
    type_map = {
        "string": str,
        "integer": int,
        "number": (int, float),
        "boolean": bool,
        "array": list,
        "object": dict,
        "null": type(None),
    }
    expected = type_map.get(expected_type)
    if expected is None:
        return True
    return isinstance(value, expected)


def validate_against_schema(data: dict, schema: dict, path: str = "") -> list[str]:
    """Validate data against a JSON Schema (subset implementation).

    Supports: required, type, properties, enum, pattern, minimum, maximum,
    minLength, minItems, items (basic), format (ignored).
    """
    errors = []

    # Check type
    schema_type = schema.get("type")
    if schema_type and not validate_type(data, schema_type):
        errors.append(f"{path or 'root'}: expected type '{schema_type}', got '{type(data).__name__}'")
        return errors

    if schema_type == "object" and isinstance(data, dict):
        # Check required fields
        required = schema.get("required", [])
        for field in required:
            if field not in data:
                errors.append(f"{path}.{field}: required field missing")

        # Check properties
        properties = schema.get("properties", {})
        for key, prop_schema in properties.items():
            if key in data:
                sub_errors = validate_against_schema(data[key], prop_schema, f"{path}.{key}")
                errors.extend(sub_errors)

    elif schema_type == "array" and isinstance(data, list):
        # Check minItems
        min_items = schema.get("minItems")
        if min_items is not None and len(data) < min_items:
            errors.append(f"{path}: array has {len(data)} items, minimum is {min_items}")

        # Check items schema
        items_schema = schema.get("items")
        if items_schema:
            for i, item in enumerate(data):
                sub_errors = validate_against_schema(item, items_schema, f"{path}[{i}]")
                errors.extend(sub_errors)

    elif schema_type == "string" and isinstance(data, str):
        # Check enum
        enum_values = schema.get("enum")
        if enum_values and data not in enum_values:
            errors.append(f"{path}: value '{data}' not in enum {enum_values}")

        # Check pattern
        import re
        pattern = schema.get("pattern")
        if pattern and not re.match(pattern, data):
            errors.append(f"{path}: value '{data}' does not match pattern '{pattern}'")

        # Check minLength
        min_length = schema.get("minLength")
        if min_length and len(data) < min_length:
            errors.append(f"{path}: string length {len(data)} below minimum {min_length}")

    elif schema_type in ("integer", "number") and isinstance(data, (int, float)):
        minimum = schema.get("minimum")
        if minimum is not None and data < minimum:
            errors.append(f"{path}: value {data} below minimum {minimum}")

        maximum = schema.get("maximum")
        if maximum is not None and data > maximum:
            errors.append(f"{path}: value {data} above maximum {maximum}")

    return errors


def validate_file(file_path: str, schema_path: str) -> dict:
    """Validate a JSON file against a schema file."""
    file_p = Path(file_path)
    schema_p = Path(schema_path)

    if not file_p.exists():
        return {"valid": False, "errors": [f"File not found: {file_path}"]}
    if not schema_p.exists():
        return {"valid": False, "errors": [f"Schema not found: {schema_path}"]}

    try:
        data = json.loads(file_p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return {"valid": False, "errors": [f"Invalid JSON in {file_path}: {e}"]}

    try:
        schema = json.loads(schema_p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return {"valid": False, "errors": [f"Invalid JSON in schema {schema_path}: {e}"]}

    errors = validate_against_schema(data, schema)

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "file": file_path,
        "schema": schema_path,
        "fields_checked": len(schema.get("properties", {})),
    }


def main():
    parser = argparse.ArgumentParser(description="Validate JSON file against schema")
    parser.add_argument("--file", required=True, help="Path to JSON file to validate")
    parser.add_argument("--schema", required=True, help="Path to JSON Schema file")
    parser.add_argument("--json-input", action="store_true", help="Read JSON input from stdin")
    args = parser.parse_args()

    if args.json_input:
        input_data = json.load(sys.stdin)
        args.file = input_data.get("file", args.file)
        args.schema = input_data.get("schema", args.schema)

    result = validate_file(args.file, args.schema)
    print(json.dumps(result, indent=2))

    sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
