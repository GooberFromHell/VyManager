# Tunnel/VXLAN Interface Refactor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Fix the UnsavedChangesBanner not appearing after Ethernet changes and align tunnel/VXLAN API services with Ethernet's convenience methods.

**Architecture:** Add `ensure_snapshot_before_change()` to Ethernet's batch endpoint (matching tunnel/VXLAN), add convenience methods to tunnel/VXLAN services (matching Ethernet), update modals to use semantic methods.

**Tech Stack:** FastAPI (Python), Next.js TypeScript frontend, Zustand session store.

**Design doc:** `docs/plans/2026-03-14-tunnel-vxlan-refactor-design.md`

---

### Task 0: Add ensure_snapshot_before_change to Ethernet batch endpoint

**Files:**
- Modify: `backend/routers/interfaces/ethernet.py:14-15` (imports) and `:873-875` (batch function body)

**Step 1: Add import**

At `backend/routers/interfaces/ethernet.py`, after line 14 (`from rbac_permissions import FeatureGroup`), add:

```python
from routers.config.config import ensure_snapshot_before_change
```

**Step 2: Add snapshot capture before batch execution**

At line 874, after `service = get_session_vyos_service(http_request)`, add these lines before `batch = service.create_ethernet_batch()`:

```python
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)
```

The result should look like:

```python
    try:
        service = get_session_vyos_service(http_request)
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        batch = service.create_ethernet_batch()
```

**Step 3: Verify backend tests pass**

Run: `cd backend && python3 -m pytest -x -q 2>&1 | tail -10`
Expected: All tests pass (or no test failures related to ethernet batch).

**Step 4: Commit**

```bash
git add backend/routers/interfaces/ethernet.py
git commit -m "fix: add config snapshot before ethernet batch execution

The Ethernet batch endpoint was missing ensure_snapshot_before_change(),
causing the UnsavedChangesBanner to not detect changes. Tunnel and VXLAN
routers already had this call."
```

---

### Task 1: Add convenience methods to tunnel API service

**Files:**
- Modify: `frontend/src/lib/api/tunnel.ts`

**Step 1: Add convenience methods after `deleteInterface()`**

Add these methods to the `TunnelService` class (after `deleteInterface`, before `refreshConfig`):

```typescript
  async createInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  async updateInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  async enableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "enable" }],
    });
  }

  async disableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "disable" }],
    });
  }
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

**Step 3: Commit**

```bash
git add frontend/src/lib/api/tunnel.ts
git commit -m "feat: add convenience methods to tunnel API service"
```

---

### Task 2: Add convenience methods to VXLAN API service

**Files:**
- Modify: `frontend/src/lib/api/vxlan.ts`

**Step 1: Add the same convenience methods to `VxlanService`**

Add after `deleteInterface()`, before `refreshConfig()`:

```typescript
  async createInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  async updateInterface(
    interfaceName: string,
    operations: BatchOperation[]
  ): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations,
    });
  }

  async enableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "enable" }],
    });
  }

  async disableInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "disable" }],
    });
  }
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

**Step 3: Commit**

```bash
git add frontend/src/lib/api/vxlan.ts
git commit -m "feat: add convenience methods to VXLAN API service"
```

---

### Task 3: Update TunnelModal to use semantic service methods

**Files:**
- Modify: `frontend/src/components/network/TunnelModal.tsx:316-319`

**Step 1: Replace direct batchConfigure call with semantic methods**

Replace lines 316-319:

```typescript
      await tunnelService.batchConfigure({
        interface: mode === "create" ? interfaceName.trim() : tunnel!.name,
        operations,
      });
```

With:

```typescript
      if (mode === "create") {
        await tunnelService.createInterface(interfaceName.trim(), operations);
      } else {
        await tunnelService.updateInterface(tunnel!.name, operations);
      }
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

**Step 3: Commit**

```bash
git add frontend/src/components/network/TunnelModal.tsx
git commit -m "refactor: use semantic service methods in TunnelModal"
```

---

### Task 4: Update VxlanModal to use semantic service methods

**Files:**
- Modify: `frontend/src/components/network/VxlanModal.tsx:375-378`

**Step 1: Replace direct batchConfigure call with semantic methods**

Replace lines 375-378:

```typescript
      await vxlanService.batchConfigure({
        interface: interfaceName.trim(),
        operations,
      });
```

With:

```typescript
      if (mode === "create") {
        await vxlanService.createInterface(interfaceName.trim(), operations);
      } else {
        await vxlanService.updateInterface(vxlan!.name, operations);
      }
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors.

**Step 3: Commit**

```bash
git add frontend/src/components/network/VxlanModal.tsx
git commit -m "refactor: use semantic service methods in VxlanModal"
```

---

### Task 5: Final verification

**Step 1: Run full TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

**Step 2: Run backend tests**

Run: `cd backend && python3 -m pytest -x -q 2>&1 | tail -10`
Expected: All pass.

**Step 3: Verify API surface alignment**

Run: `grep -n "async \(create\|update\|enable\|disable\|delete\|batch\|refresh\)" frontend/src/lib/api/ethernet.ts frontend/src/lib/api/tunnel.ts frontend/src/lib/api/vxlan.ts`

Expected: All three services have the same set of methods.

**Step 4: Verify Ethernet snapshot fix**

Run: `grep -n "ensure_snapshot_before_change" backend/routers/interfaces/ethernet.py backend/routers/interfaces/tunnel.py backend/routers/interfaces/vxlan.py`

Expected: All three routers call `ensure_snapshot_before_change`.
