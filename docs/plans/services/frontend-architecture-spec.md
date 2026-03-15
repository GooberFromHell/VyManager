# Frontend Architecture Specification — VyOS Services Phase 1

**For Agent:** frontend-architect
**Task:** Design the UI layout and component structure for the Services page and Phase 1 services

## Your Mission

Design the frontend architecture for VyOS service management. This includes the main Services page layout, API service modules, type definitions, and component structure for DNS Forwarding, NTP, and SSH.

## Reference Implementations to Study

Read these files thoroughly:

1. **DHCP page (closest service reference):**
   - `frontend/src/app/(default)/(app)/network/dhcp/page.tsx` — multi-tab service page
   - `frontend/src/components/services/` — all DHCP modal components
   - `frontend/src/lib/api/dhcp.ts` — DHCP API service
   - `frontend/src/lib/api/types/dhcp.ts` or inline types in dhcp.ts

2. **Services page (current placeholder):**
   - `frontend/src/app/(default)/(app)/system/services/page.tsx` — currently shows InProgress

3. **Sidebar navigation:**
   - `frontend/src/components/layout/Sidebar.tsx` — navigation structure and permission checks

4. **Permissions:**
   - `frontend/src/hooks/usePermissions.ts` — permission check hook
   - `frontend/src/lib/api/user-management.ts` — FeatureGroup enum

5. **UI patterns (multiple reference pages):**
   - `frontend/src/app/(default)/(app)/firewall/groups/page.tsx` — card grid + search + filter
   - `frontend/src/app/(default)/(app)/network/nat/page.tsx` — sidebar + content pane
   - `frontend/src/app/(default)/(app)/system/settings/page.tsx` — settings form layout

## Services Page Design

The `system/services/page.tsx` should be transformed from an InProgress placeholder into a tab-based service management page. Consider two options and recommend one:

**Option A: Top-level tabs for each service**
```
[DNS] [NTP] [SSH] [DHCP Relay] [LLDP] [SNMP] ...
```
Each tab loads the full service management UI.

**Option B: Sidebar navigation (like static-failover)**
```
┌──────────────┬──────────────────────────┐
│ DNS Fwd      │                          │
│ NTP          │  Selected service        │
│ SSH          │  management UI           │
│ DHCP Relay   │                          │
│ ...          │                          │
└──────────────┴──────────────────────────┘
```

Consider which matches the existing codebase patterns better. The DHCP page uses tabs. The static-failover page uses a sidebar. Choose based on how many services will eventually be listed (11+).

## Per-Service UI Design

For each service, design:

### API Types (`frontend/src/lib/api/types/[service].ts`)

Define TypeScript interfaces for:
- Configuration response (what the GET /config endpoint returns)
- Capabilities response (what features are available per version)
- Batch request/response types
- Individual item types (e.g., DNS server entry, NTP server entry)

### API Service (`frontend/src/lib/api/[service].ts`)

Standard methods following the Ethernet pattern:
```typescript
class ServiceNameService {
  getCapabilities(): Promise<Capabilities>
  getConfig(): Promise<ConfigResponse>
  batchConfigure(request: BatchRequest): Promise<VyOSResponse>
  createItem(name: string, operations: BatchOperation[]): Promise<VyOSResponse>
  updateItem(name: string, operations: BatchOperation[]): Promise<VyOSResponse>
  deleteItem(name: string): Promise<VyOSResponse>
  refreshConfig(): Promise<{ success: boolean }>
}
```

### Components (`frontend/src/components/services/[service]/`)

For each service, define what modals/components are needed:
- Create modal (what fields, what validation)
- Edit modal (what's editable, what's fixed)
- Delete confirmation modal
- Service-specific components (e.g., DNS domain forwarding table)

### Page Integration

How the service appears within the Services page:
- Tab/sidebar entry
- Permission check (`FeatureGroup.X`)
- Main content layout (table? cards? form?)
- Loading/error/empty states

## Output Format

For each service, produce:

```markdown
## [Service Name] Frontend Spec

### Types
- Interface definitions with all fields and their types
- Capabilities shape

### API Service
- Class name and file path
- Method signatures
- Endpoint mappings

### Components
- List of components needed
- Props interfaces
- Form fields and validation rules

### Page Layout
- Wireframe description or ASCII mockup
- Data display format (table/cards/form)
- Action buttons and their behaviors
```

## Constraints

- Use shadcn/ui components exclusively (already configured in the project)
- Follow dark-mode-only styling (project is hardcoded dark theme)
- Use `usePermissions()` hook for all permission checks
- All mutations must call `service.refreshConfig()` after success
- Use `onSuccess` callback pattern for modal → parent data refresh
- Component files go in `frontend/src/components/services/[service-name]/`
- API service files go in `frontend/src/lib/api/[service-name].ts`
- Type files go in `frontend/src/lib/api/types/[service-name].ts`
