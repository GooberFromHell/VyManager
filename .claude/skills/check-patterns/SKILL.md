---
name: check-patterns
description: Audit VyOS feature code for pattern consistency across the router/builder/mapper/service layers. Run after adding or modifying any VyOS feature to catch drift.
---

# Check Patterns

Audit all VyOS features for consistency with the established layered architecture patterns. Run each check below using Grep and Glob tools, then output a pass/fail report.

## Check 1: Batch endpoints call ensure_snapshot_before_change

Every backend router with a `POST /batch` endpoint MUST call `ensure_snapshot_before_change()` before executing commands. Without this, the UnsavedChangesBanner won't detect config changes.

**How to check:**
1. Glob for `backend/routers/**/*.py` (exclude `__init__.py`, `config.py`, `show.py`, `dashboard.py`, `power.py`, `monitoring.py`)
2. For each file that contains `@router.post` with `"/batch"`, verify it also contains `ensure_snapshot_before_change`
3. Report any file with a batch endpoint but missing the snapshot call

**Known exceptions:** None. All batch endpoints must have this.

**Fix:** Add these lines before `execute_batch()`:
```python
from routers.config.config import ensure_snapshot_before_change
# ... inside the batch function:
instance_id = http_request.state.instance["id"]
current_config = await run_in_threadpool(service.get_full_config)
ensure_snapshot_before_change(instance_id, current_config)
```

## Check 2: Feature routers have /capabilities, /config, /batch endpoints

Every feature router should expose all three standard endpoints.

**How to check:**
1. For each router file that has at least one `@router.post.*"/batch"`, also check for `@router.get.*"/capabilities"` and `@router.get.*"/config"`
2. Report any router missing one of the three

**Known exceptions:** `session.py`, `user_management.py`, `system.py`, `dashboard.py`, `show.py`, `power.py`, `monitoring.py` — these are not VyOS feature routers.

## Check 3: Builders have required methods

Every builder in `backend/vyos_builders/` must implement core batch methods.

**How to check:**
1. Glob for `backend/vyos_builders/**/*.py` (exclude `__init__.py`)
2. Each file must contain: `def add_set`, `def add_delete`, `def get_operations`, `def clear`
3. Report any builder missing required methods

## Check 4: Mappers have _versions/ structure

Every mapper feature directory must have version-specific overrides.

**How to check:**
1. Glob for `backend/vyos_mappers/*/` (first-level subdirectories, exclude `__pycache__`)
2. Each feature directory that contains a `.py` mapper file should also have a `*_versions/` subdirectory
3. Each `_versions/` directory must contain: `__init__.py`, `v1_4.py`, `v1_5.py`
4. Report missing files

## Check 5: Mappers registered in __init__.py

Every mapper must be registered with `CommandMapperRegistry`.

**How to check:**
1. Read `backend/vyos_mappers/__init__.py`
2. For each `_versions/` directory found in Check 4, verify there's a corresponding `register_feature` call
3. Report unregistered mappers

## Check 6: Frontend API services have standard methods

Every API service in `frontend/src/lib/api/` must have the standard method set.

**How to check:**
1. Glob for `frontend/src/lib/api/*.ts` (exclude `client.ts`, `types/`)
2. Each service file must contain: `getCapabilities`, `getConfig`, `batchConfigure`, `refreshConfig`
3. Report services missing any of these

**Known exceptions:** `session.ts`, `dashboard.ts`, `config.ts`, `user-management.ts`, `oauth.ts`, `show.ts` — these are not VyOS feature services.

## Output Format

```
## Pattern Consistency Report

### Backend
- [ ] Check 1: ensure_snapshot_before_change — X/Y batch endpoints ✓/✗
- [ ] Check 2: Standard endpoints — X/Y routers ✓/✗
- [ ] Check 3: Builder methods — X/Y builders ✓/✗
- [ ] Check 4: Mapper versions — X/Y mappers ✓/✗
- [ ] Check 5: Mapper registration — X/Y registered ✓/✗

### Frontend
- [ ] Check 6: API service methods — X/Y services ✓/✗

### Violations (if any)
[List each violation with file path and what's missing]

### Recommendations
[For each violation, specific fix instructions]
```
