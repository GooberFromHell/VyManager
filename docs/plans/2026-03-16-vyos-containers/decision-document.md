# Decision Document — VyOS Container Management

## Approach Summary

Container management will be implemented as a **single unified feature** ("container") spanning all three backend layers (mapper, builder, router) and the frontend (types, API service, page, components). The VyOS CLI has three top-level entities under `set container`: container names, container networks, and container registries — all sharing a common config root and tightly coupled operationally.

The frontend will present a **single page with a tabbed interface** (Containers, Networks, Registries). Unlike NTP/SSH/DNS which are under `set service`, containers live at `set container` — a top-level VyOS config node. Therefore containers get their **own sidebar entry** under System, NOT inside the Services layout.

Version differences are modest: `cap-add` → `capability` in v1.5, plus additive features (health-check, tmpfs, log-driver, sysctl). The mapper uses the established delegation pattern with v1.4 overrides.

## Key Decisions

1. **Single feature, single mapper/builder/router** — All three entities handled by one set of files. The SNMP implementation validates this pattern for multi-entity features. Splitting would triple registration overhead for tightly-coupled entities.

2. **Top-level sidebar item, NOT in Services layout** — `container` is NOT under `set service` in VyOS. Route: `/system/containers`. Own sidebar entry with `Container` icon from lucide-react.

3. **Tabbed page layout** — Three tabs: Containers, Networks, Registries. Each with table + create/edit/delete modals.

4. **Sectioned create/edit modal for containers** — Tabs within the modal: General (name, image, restart), Networking (network, ports), Storage (volumes, tmpfs), Environment (env vars, labels, capabilities), Advanced (memory, cpu, uid, gid, devices, sysctl, health-check).

5. **v1.4/v1.5 mapper delegation** — Base mapper = v1.5. v1.4 overrides `capability` → `cap-add` path and disables v1.5-only features via `has_*()` flags.

6. **Single FeatureGroup.CONTAINER permission** — No sub-permissions; entities are too coupled to manage independently.

## What to Reuse

- SNMP backend pattern for multi-entity mapper/builder/router
- NTP mapper pattern for version-aware delegation
- SNMP frontend page pattern for tabbed multi-entity display
- Existing UI components: Dialog, FormField, Tabs, Table, Badge, Input, Select
- Dynamic list add/remove pattern from existing modals
- `item_name` + `operations` batch API pattern

## What to Build

### Backend (~5 new directories, ~10 new files)
- `backend/vyos_mappers/container/` — Mapper + version overrides
- `backend/vyos_builders/container/` — Batch builder
- `backend/routers/container/` — FastAPI router with Pydantic models

### Frontend (~12 new files)
- `frontend/src/lib/api/types/container.ts` — TypeScript interfaces
- `frontend/src/lib/api/container.ts` — API service
- `frontend/src/app/(default)/(app)/system/containers/page.tsx` — Page
- `frontend/src/components/containers/` — 9 modals (3 entity types × create/edit/delete)

### Modifications (~5 existing files)
- `backend/rbac_permissions.py` — Add CONTAINER to FeatureGroup + role permissions
- `backend/vyos_mappers/__init__.py` — Register mapper
- `backend/vyos_builders/__init__.py` — Export builder
- `backend/app.py` — Include router
- `frontend/src/lib/api/user-management.ts` — Add frontend FeatureGroup
- `frontend/src/components/layout/Sidebar.tsx` — Add nav entry

## What NOT to Do

1. Do NOT split into 3 separate features (name/network/registry)
2. Do NOT place in Services layout — containers aren't VyOS services
3. Do NOT implement container runtime operations (image pull, start/stop, logs) — config only
4. Do NOT invent a new batch API format — reuse existing pattern
5. Do NOT validate container images against registries — strings only
6. Do NOT add container status monitoring — future follow-up

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Builder size (400-600 lines) | Medium | Organize in labeled sections, consistent naming |
| Frontend modal complexity | Medium | Tabbed sections, progressive disclosure |
| Config parsing depth | Medium | Defensive `isinstance(data, dict)` checks at every level |
| Version differences | Low | Well-bounded: one path rename + additive features |
| RBAC integration | Low | Mechanical — same as every other feature |

## Task Outline

| Phase | Tasks | Domain |
|-------|-------|--------|
| 1: Prerequisites | RBAC + registration in shared files | Backend + Frontend |
| 2: Backend | Mapper, Builder, Router | Python |
| 3: Frontend Types + API | TypeScript types, API service | TypeScript |
| 4: Frontend UI | Page + 9 modals + sidebar nav | React/Next.js |
| 5: Validation | Type check, lint, pattern audit | QA |
