# check-patterns Skill + Stop Hook — Design

**Date:** 2026-03-14
**Status:** Approved

## Problem

VyOS features follow a strict layered architecture (mapper → builder → router → API service → UI), but patterns drift silently. The `ensure_snapshot_before_change` bug (missing in 32 of 35 batch endpoints) went undetected until it caused the UnsavedChangesBanner to not appear.

## Solution

1. A `/check-patterns` skill that audits all VyOS features for pattern consistency
2. A Stop hook that automatically triggers the audit when Claude modifies files in pattern-sensitive directories

## Skill: check-patterns

**Location:** `.claude/skills/check-patterns/SKILL.md`
**Invocation:** User via `/check-patterns`, or Claude-invokable (both)

**6 Checks:**
1. All `/batch` endpoints call `ensure_snapshot_before_change()`
2. All feature routers have `/capabilities`, `/config`, `/batch` endpoints
3. All builders have `add_set`, `add_delete`, `get_operations`, `clear` methods
4. All mappers have `_versions/` with `v1_4.py`, `v1_5.py`, `__init__.py`
5. All mappers registered in `vyos_mappers/__init__.py`
6. All frontend API services have `getCapabilities`, `getConfig`, `batchConfigure`, `refreshConfig`

**Output:** Pass/fail report with exact file paths and remediation instructions.

## Hook: Stop (pattern enforcement)

**Location:** `.claude/settings.json`
**Type:** Prompt-based Stop hook
**Trigger:** When Claude finishes a task AND modified files are in `backend/routers/`, `backend/vyos_builders/`, `backend/vyos_mappers/`, or `frontend/src/lib/api/`

**Behavior:** Adds a prompt to Claude's context instructing it to run the pattern checks. Claude uses its judgment to distinguish real violations from expected exceptions.
