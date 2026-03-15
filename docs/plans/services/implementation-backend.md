# Backend Implementation Instructions — VyOS Services Phase 1

**For Agent:** implementer-backend
**Prerequisites:** Backend architecture spec must be completed first

## Your Mission

Implement the mapper, builder, and router for each Phase 1 service (DNS Forwarding, NTP, SSH) following the architecture spec produced by `backend-architect`.

## Before You Start

1. Read the architecture spec at `docs/plans/services/backend-architecture-spec-output.md` (produced by backend-architect)
2. Read CLAUDE.md for project conventions
3. Read the check-patterns skill at `.claude/skills/check-patterns/SKILL.md` to understand what patterns are enforced

## Implementation Order (Per Service)

For EACH service, follow this exact order:

### Step 1: Create the Mapper

1. Create `backend/vyos_mappers/[service]/[service].py` — base mapper class (v1.5 features)
2. Create `backend/vyos_mappers/[service]/[service]_versions/v1_4.py` — version overrides
3. Create `backend/vyos_mappers/[service]/[service]_versions/v1_5.py` — usually inherits base
4. Create `backend/vyos_mappers/[service]/[service]_versions/__init__.py` — factory function
5. Create `backend/vyos_mappers/[service]/__init__.py` — module init

**Reference:** `backend/vyos_mappers/dhcp/` for exact structure

### Step 2: Register the Mapper

Add registration to `backend/vyos_mappers/__init__.py`:
```python
from vyos_mappers.[service].[service]_versions import get_[service]_mapper
CommandMapperRegistry.register_feature("[service]", get_[service]_mapper)
```

### Step 3: Create the Builder

1. Create `backend/vyos_builders/[service]/[service].py` — batch builder class
2. Create `backend/vyos_builders/[service]/__init__.py` — module init

**Required methods:** `add_set`, `add_delete`, `get_operations`, `clear`, `is_empty`, `operation_count`
**Reference:** `backend/vyos_builders/dhcp/dhcp.py`

### Step 4: Create the Router

1. Create `backend/routers/[service]/[service].py` with:
   - `GET /vyos/[service]/capabilities` — version-aware feature flags
   - `GET /vyos/[service]/config` — current configuration
   - `POST /vyos/[service]/batch` — atomic batch operations

2. CRITICAL: The batch endpoint MUST include:
```python
from routers.config.config import ensure_snapshot_before_change

# Inside batch function, before execute_batch:
instance_id = http_request.state.instance["id"]
current_config = await run_in_threadpool(service.get_full_config)
ensure_snapshot_before_change(instance_id, current_config)
```

3. Create `backend/routers/[service]/__init__.py` — module init

**Reference:** `backend/routers/dhcp/dhcp.py`

### Step 5: Include Router in App

Add to `backend/app.py`:
```python
from routers.[service] import [service]
app.include_router([service].router)
```

### Step 6: Verify

Run: `cd backend && python3 -m pytest -x -q`

### Step 7: Commit

```bash
git add backend/vyos_mappers/[service]/ backend/vyos_builders/[service]/ backend/routers/[service]/ backend/vyos_mappers/__init__.py backend/app.py
git commit -m "feat: add [service] service backend (mapper, builder, router)"
```

## Implementation Order Across Services

1. DNS Forwarding (most complex — good first implementation)
2. NTP (medium complexity)
3. SSH (simplest — mostly boolean flags and lists)

## RBAC

If new FeatureGroup values are needed:
1. Add them to `backend/rbac_permissions.py`
2. Add corresponding entries in `frontend/src/lib/api/user-management.ts`

## After All Three Services

Update the tracker at `docs/plans/vyos-services-tracker.md`:
- Change all backend statuses from PENDING to COMPLETE
- Note any deviations from the architecture spec
