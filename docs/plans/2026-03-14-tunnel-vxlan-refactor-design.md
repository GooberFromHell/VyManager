# Tunnel/VXLAN Interface Refactor — Design

**Date:** 2026-03-14
**Status:** Approved
**Approach:** A — Fix snapshot bug + Add convenience methods

## Problem

1. **UnsavedChangesBanner doesn't appear** after Ethernet interface changes because the Ethernet batch endpoint is missing `ensure_snapshot_before_change()` — the config diff has no "before" baseline to compare against.
2. **Tunnel/VXLAN API services** lack convenience methods (`createInterface`, `updateInterface`, `enableInterface`, `disableInterface`) that Ethernet provides.
3. **Tunnel/VXLAN modals** use `batchConfigure()` directly for both create and edit instead of using semantic methods.

## Root Cause

The `ensure_snapshot_before_change()` function captures the VyOS config BEFORE commands execute. The tunnel and VXLAN routers call it, but the Ethernet router (older code) does not. Without a pre-change snapshot, `GET /config/diff` initializes its baseline from the already-changed config, reporting zero diffs.

## Changes

### 1. Backend: Add snapshot capture to Ethernet batch endpoint

**File:** `backend/routers/interfaces/ethernet.py`

Add import:
```python
from routers.config.config import ensure_snapshot_before_change
```

Add before `execute_batch()` in the batch endpoint:
```python
instance_id = http_request.state.instance["id"]
current_config = await run_in_threadpool(service.get_full_config)
ensure_snapshot_before_change(instance_id, current_config)
```

### 2. Frontend: Add convenience methods to tunnel and VXLAN services

**Files:** `frontend/src/lib/api/tunnel.ts`, `frontend/src/lib/api/vxlan.ts`

Add to both:
- `createInterface(name, operations)` — wraps `batchConfigure()`
- `updateInterface(name, operations)` — wraps `batchConfigure()`
- `enableInterface(name)` — single `enable` operation
- `disableInterface(name)` — single `disable` operation

### 3. Frontend: Update modals to use semantic methods

**Files:** `frontend/src/components/network/TunnelModal.tsx`, `frontend/src/components/network/VxlanModal.tsx`

Update `handleSubmit()` to use:
- Create mode: `service.createInterface(name, operations)`
- Edit mode: `service.updateInterface(name, operations)`

## What's NOT Changing

- Backend tunnel/VXLAN routers (already correct)
- Backend builders and mappers (already consistent)
- Operation building logic (`buildOperations()` is identical across all three)
- UnsavedChangesBanner component (works correctly, just needs correct data)
- Config diff/save endpoints (work correctly)

## Testing

1. Existing `pytest` suite passes
2. `npm run type-check:frontend` passes
3. Manual: create/edit tunnel, VXLAN, Ethernet — banner appears for all
