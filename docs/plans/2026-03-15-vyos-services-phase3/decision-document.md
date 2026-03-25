# Decision Document — VyOS Services Phase 3

**Goal:** Implement Router Advert, TFTP Server, Broadcast Relay, and Conntrack Sync across all architecture layers.
**Date:** 2026-03-15
**Based on:** `discovery-report.md`
**Status:** DRAFT

---

## Approach Summary

Phase 3 implements four VyOS services across all architecture layers: **Router Advert** (`service router-advert`), **TFTP Server** (`service tftp-server`), **Broadcast Relay** (`service broadcast-relay`), and **Conntrack Sync** (`service conntrack-sync`). Each service follows the established three-layer backend pattern (Mapper → Builder → Router) and the standard frontend pattern (Types → Service → Components → Page). The implementation replicates the exact patterns from Phase 1 (NTP, SSH, DNS Forwarding) without deviation.

Implementation order: TFTP (simplest) → Broadcast Relay → Router Advert → Conntrack Sync (most complex). Starting simple validates the scaffolding (FeatureGroup additions, layout changes, registration) with minimal risk.

---

## Key Decisions

1. **FeatureGroup enum additions required** — Add `ROUTER_ADVERT`, `TFTP_SERVER`, `BROADCAST_RELAY`, `CONNTRACK_SYNC` to backend `rbac_permissions.py` (Python enum + all 5 permission dicts/lists) and frontend `user-management.ts` (TypeScript enum). No Prisma migration — the DB column is `TEXT NOT NULL`, not a PG enum.

2. **Services layout gets 4 new entries** — Add to `ServiceType` union and `allServices` array in `layout.tsx`. Icons: Radio (Router Advert), FileUp (TFTP), ArrowLeftRight (Broadcast Relay), RefreshCw (Conntrack Sync).

3. **No Prisma migration** — The `FeatureGroup` enum in `schema.prisma` is cosmetic legacy. Phase 1 and Phase 2 didn't add migrations either.

4. **Simplest-first order** — TFTP → Broadcast Relay → Router Advert → Conntrack Sync. Validates scaffolding early.

5. **No shared abstractions** — Each service is self-contained (matching Phase 1/2 approach). Consistency via pattern copying, not inheritance.

---

## VyOS CLI Command Trees

### TFTP Server (Low complexity)
```
set service tftp-server
  directory <path>           # root directory
  listen-address <ip>        # multi-value
  port <1-65535>             # default 69
  allow-upload               # v1.5 only (flag)
```

### Broadcast Relay (Low-Medium complexity)
```
set service broadcast-relay
  id <1-99>                  # relay instance
    description <text>
    interface <name>         # multi-value
    address <ip>             # destination broadcast address
    port <1-65535>           # UDP port
    disable                  # flag
```

### Router Advert (Medium-High complexity)
```
set service router-advert
  interface <name>           # per-interface (collection)
    prefix <prefix>          # sub-collection (2001:db8::/64)
      autonomous-flag / no-autonomous-flag  # v1.4 vs v1.5 naming
      on-link-flag / no-on-link-flag
      preferred-lifetime <seconds>
      valid-lifetime <seconds>
    name-server <ipv6>       # RDNSS, multi-value
    cur-hop-limit <0-255>
    default-lifetime <0-9000>
    default-preference <high|medium|low>
    link-mtu <integer>
    managed-flag / other-config-flag
    send-advert / no-send-advert    # v1.5 vs v1.4 naming
    interval { max <4-1800>, min <3-1350> }
    reachable-time / retrans-timer
    dnssl <domain>           # v1.5 only
    route <prefix>           # v1.5 only
```

### Conntrack Sync (High complexity)
```
set service conntrack-sync
  accept-protocol <protocol>     # multi-value
  disable-external-cache         # flag
  event-listen-queue-size <int>  # v1.5 only
  expect-sync <module>           # multi-value
  failover-mechanism
    vrrp { sync-group <name> }
    cluster { group <name> }     # v1.4 only (deprecated in v1.5)
  interface <name>
    port <1-65535>
  listen-address <ip>            # v1.5 only
  mcast-group <ip>
  sync-queue-size <int>          # v1.5 only
  startup-resync                 # v1.5 only
```

---

## What to Reuse

| Existing Asset | How It's Used |
|---------------|---------------|
| `backend/routers/ntp/ntp.py` | Primary reference for router pattern (config parsing, batch, models) |
| `backend/vyos_builders/ntp/ntp.py` | Reference for builder structure |
| `backend/vyos_mappers/ntp/ntp.py` + `_versions/` | Reference for mapper + version pattern |
| `frontend/src/lib/api/ntp.ts` | Reference for API service class |
| `frontend/src/lib/api/types/ntp.ts` | Reference for type definitions |
| `frontend/src/components/services/ntp/` | Reference for modal patterns |
| `frontend/src/app/.../services/ntp/page.tsx` | Reference for page pattern |
| `frontend/src/components/services/dns-forwarding/` | Reference for collection-based modals (create/edit/delete) |

---

## What to Build

### Backend (per service)
| Item | TFTP | Broadcast Relay | Router Advert | Conntrack Sync |
|------|------|-----------------|---------------|----------------|
| Mapper | ~10 methods | ~14 methods | ~40 methods | ~30 methods |
| Version v1.4 | 1 blocked feature | No differences | 4+ flag name changes | 3 blocked + 1 deprecated |
| Version v1.5 | Full | Full | Full + dnssl/route | Full - cluster |
| Builder | ~8 methods | ~12 methods | ~30 methods | ~24 methods |
| Router models | 2 simple | 3 (with instance) | 4 (nested interface→prefix) | 4 (multi-section) |
| Complexity | Low | Low-Medium | Medium-High | High |

### Frontend (per service)
| Item | TFTP | Broadcast Relay | Router Advert | Conntrack Sync |
|------|------|-----------------|---------------|----------------|
| Types file | Simple flat | Collection-based | Nested (interface→prefix) | Multi-section |
| Service class | Standard 4 methods | Standard + CRUD | Standard + CRUD | Standard + CRUD |
| Modals | 1 (Edit) | 3 (Create/Edit/Delete) | 3 (Add/Edit/Delete) | 3 (Edit/Add/Delete) |
| Page | Card display | Table of instances | Table of interfaces | Cards for sections |

### Shared (one-time)
| Item | Files | Complexity |
|------|-------|------------|
| FeatureGroup backend | `rbac_permissions.py` | Low |
| FeatureGroup frontend | `user-management.ts` | Low |
| Services layout | `layout.tsx` | Low |
| Mapper registration (x4) | `vyos_mappers/__init__.py` | Low |
| Builder export (x4) | `vyos_builders/__init__.py` | Low |
| Router inclusion (x4) | `app.py` | Low |

---

## What NOT to Do

- Do not modify the Prisma schema — DB column is TEXT, no migration needed
- Do not add new dependencies — all required UI/backend deps exist
- Do not deviate from the batch endpoint reflection pattern
- Do not create shared abstractions/base classes — follow copy-pattern approach
- Do not create unit tests — out of scope per goal contract
- Do not modify the VyOS proxy route — catch-all handles it

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Router Advert v1.4/v1.5 flag naming wrong | Medium | High | Verify against VyOS docs; implement v1.5 first, then v1.4 overrides |
| Router Advert nested config parsing errors | Medium | Medium | Model after DNS Forwarding domain parsing (similar nesting) |
| Conntrack Sync failover-mechanism version availability | Medium | High | Verify exact VyOS docs; gate cluster behind v1.4 capability flag |
| Conntrack Sync per-interface sub-keys | Low | Medium | Similar to NTP server sub-options; established pattern exists |
| FeatureGroup additions break permissions | Low | Medium | String-based system, no DB constraints; follow Phase 1/2 precedent |

---

## Task Outline

### Task 0: Infrastructure Setup (Cross-cutting)
Add 4 FeatureGroup entries to backend + frontend + layout. Verify compiles.

### Task 1-4: Per-Service Full Stack (TFTP → Broadcast Relay → Router Advert → Conntrack Sync)
Each: mapper + versions + builder + router + registration + types + service + components + page.

### Task 5: Final Verification
TypeScript check, lint, /check-patterns, tracker update.
