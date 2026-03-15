# Frontend Implementation Instructions — VyOS Services Phase 1

**For Agent:** implementer-frontend
**Prerequisites:** Frontend architecture spec AND backend implementation must be completed first

## Your Mission

Implement the API services, type definitions, components, and page layout for Phase 1 services (DNS Forwarding, NTP, SSH) following the architecture spec produced by `frontend-architect`.

## Before You Start

1. Read the architecture spec at `docs/plans/services/frontend-architecture-spec-output.md` (produced by frontend-architect)
2. Read CLAUDE.md for project conventions
3. Verify the backend endpoints are available (backend implementation must be done first)

## Implementation Order (Per Service)

### Step 1: Create Type Definitions

Create `frontend/src/lib/api/types/[service].ts` with:
- Configuration response interface
- Capabilities response interface
- Batch request/operation types
- Individual item interfaces

**Reference:** `frontend/src/lib/api/types/tunnel.ts` or `frontend/src/lib/api/types/vxlan.ts`

### Step 2: Create API Service

Create `frontend/src/lib/api/[service].ts` with standard methods:
```typescript
class [Service]Service {
  async getCapabilities(): Promise<Capabilities>
  async getConfig(): Promise<ConfigResponse>
  async batchConfigure(request: BatchRequest): Promise<VyOSResponse>
  async createItem(name: string, operations: BatchOperation[]): Promise<VyOSResponse>
  async updateItem(name: string, operations: BatchOperation[]): Promise<VyOSResponse>
  async deleteItem(name: string): Promise<VyOSResponse>
  async refreshConfig(): Promise<{ success: boolean }>
}

export const [service]Service = new [Service]Service();
```

**Reference:** `frontend/src/lib/api/tunnel.ts` (after the refactor — has full method set)

### Step 3: Create Modal Components

Create in `frontend/src/components/services/[service]/`:
- `Create[Service]Modal.tsx` — form for creating new entries
- `Edit[Service]Modal.tsx` — form for editing (pre-populated)
- `Delete[Service]Modal.tsx` — confirmation dialog

**Modal submission pattern (CRITICAL):**
```typescript
const handleSubmit = async () => {
  try {
    setLoading(true);
    const operations = buildOperations();

    if (mode === "create") {
      await service.createItem(name, operations);
    } else {
      await service.updateItem(name, operations);
    }

    // MUST call refreshConfig after mutation
    await service.refreshConfig();

    onSuccess();
    onOpenChange(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Operation failed");
  } finally {
    setLoading(false);
  }
};
```

**Reference:** `frontend/src/components/network/TunnelModal.tsx`

### Step 4: Build the Services Page

Transform `frontend/src/app/(default)/(app)/system/services/page.tsx` from InProgress placeholder to a full service management page.

Follow the layout design from the frontend-architect's spec. The page should:
1. Check permissions via `usePermissions()`
2. Load capabilities and config for all services
3. Display services in tabs or sidebar (per architect spec)
4. Wire up CRUD modals with `onSuccess` callbacks
5. Handle loading/error/empty states

### Step 5: Update Sidebar Navigation

In `frontend/src/components/layout/Sidebar.tsx`:
- Update the System section to include a proper link to Services
- Or create a new "Services" top-level nav category if the architect spec calls for it

### Step 6: Verify

Run: `cd frontend && npx tsc --noEmit`
Expected: Zero errors.

### Step 7: Commit (per service)

```bash
git add frontend/src/lib/api/types/[service].ts frontend/src/lib/api/[service].ts frontend/src/components/services/[service]/
git commit -m "feat: add [service] service frontend (types, API service, components)"
```

Final page commit:
```bash
git add frontend/src/app/\(default\)/\(app\)/system/services/page.tsx frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: implement services page with DNS, NTP, SSH tabs"
```

## UI Design Guidelines

- **Dark mode only** — no light theme considerations
- **shadcn/ui components** — use Dialog, Card, Table, Tabs, Input, Select, Checkbox, Badge, Button, etc.
- **Icons** — use lucide-react (Globe for DNS, Clock for NTP, Key for SSH)
- **Loading states** — use `<Loader2 className="h-8 w-8 animate-spin" />` pattern
- **Error states** — use Card with destructive styling and retry button
- **Empty states** — show helpful message with create action

## After All Three Services

1. Run TypeScript check: `cd frontend && npx tsc --noEmit`
2. Run linter: `cd frontend && npm run lint`
3. Update the tracker at `docs/plans/vyos-services-tracker.md`
