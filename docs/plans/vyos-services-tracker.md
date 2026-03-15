# VyOS Services Implementation Tracker

**Team:** vyos-services
**Created:** 2026-03-14
**Status:** IN PROGRESS

## Overview

Implement VyOS service management across all architecture layers following the established router → builder → mapper → API service → UI pattern.

## Phase Status

| Phase | Services | Status | Backend | Frontend |
|-------|----------|--------|---------|----------|
| **Phase 1** | DNS Forwarding, NTP, SSH | PENDING | - | - |
| **Phase 2** | DHCP Relay, DHCPv6 Server, LLDP, SNMP | PENDING | - | - |
| **Phase 3** | Router Advert, TFTP, Broadcast Relay, Conntrack Sync | PENDING | - | - |

## Phase 1: Core Services

### DNS Forwarding (`set service dns forwarding`)

| Layer | File | Status | Agent |
|-------|------|--------|-------|
| Mapper | `backend/vyos_mappers/dns_forwarding/` | PENDING | backend-architect |
| Builder | `backend/vyos_builders/dns_forwarding/` | PENDING | implementer-backend |
| Router | `backend/routers/dns_forwarding/` | PENDING | implementer-backend |
| Registration | `backend/vyos_mappers/__init__.py` | PENDING | implementer-backend |
| App inclusion | `backend/app.py` | PENDING | implementer-backend |
| API types | `frontend/src/lib/api/types/dns-forwarding.ts` | PENDING | implementer-frontend |
| API service | `frontend/src/lib/api/dns-forwarding.ts` | PENDING | implementer-frontend |
| Components | `frontend/src/components/services/dns/` | PENDING | implementer-frontend |
| Page integration | Services page tab | PENDING | implementer-frontend |

### NTP (`set service ntp`)

| Layer | File | Status | Agent |
|-------|------|--------|-------|
| Mapper | `backend/vyos_mappers/ntp/` | PENDING | backend-architect |
| Builder | `backend/vyos_builders/ntp/` | PENDING | implementer-backend |
| Router | `backend/routers/ntp/` | PENDING | implementer-backend |
| Registration | `backend/vyos_mappers/__init__.py` | PENDING | implementer-backend |
| App inclusion | `backend/app.py` | PENDING | implementer-backend |
| API types | `frontend/src/lib/api/types/ntp.ts` | PENDING | implementer-frontend |
| API service | `frontend/src/lib/api/ntp.ts` | PENDING | implementer-frontend |
| Components | `frontend/src/components/services/ntp/` | PENDING | implementer-frontend |
| Page integration | Services page tab | PENDING | implementer-frontend |

### SSH (`set service ssh`)

| Layer | File | Status | Agent |
|-------|------|--------|-------|
| Mapper | `backend/vyos_mappers/ssh/` | PENDING | backend-architect |
| Builder | `backend/vyos_builders/ssh/` | PENDING | implementer-backend |
| Router | `backend/routers/ssh/` | PENDING | implementer-backend |
| Registration | `backend/vyos_mappers/__init__.py` | PENDING | implementer-backend |
| App inclusion | `backend/app.py` | PENDING | implementer-backend |
| API types | `frontend/src/lib/api/types/ssh.ts` | PENDING | implementer-frontend |
| API service | `frontend/src/lib/api/ssh.ts` | PENDING | implementer-frontend |
| Components | `frontend/src/components/services/ssh/` | PENDING | implementer-frontend |
| Page integration | Services page tab | PENDING | implementer-frontend |

### Services Page Layout

| Component | Status | Agent |
|-----------|--------|-------|
| Tab-based service selector | PENDING | frontend-architect |
| Navigation sidebar update | PENDING | implementer-frontend |
| Permission integration | PENDING | implementer-frontend |

---

## Phase 2: Network Services

### DHCP Relay, DHCPv6 Server, LLDP, SNMP
*(Detailed breakdown will be added when Phase 1 nears completion)*

**Status:** BLOCKED by Phase 1

---

## Phase 3: Advanced Services

### Router Advert, TFTP, Broadcast Relay, Conntrack Sync
*(Detailed breakdown will be added when Phase 2 nears completion)*

**Status:** BLOCKED by Phase 2

---

## Agent Assignments

| Agent | Current Task | Status |
|-------|-------------|--------|
| backend-architect | Design backend specs for Phase 1 services | COMPLETE |
| frontend-architect | Design UI specs for services page + Phase 1 | COMPLETE |
| impl-dns-backend | Implement DNS Forwarding backend | IN PROGRESS |
| impl-ntp-backend | Implement NTP backend | IN PROGRESS |
| impl-ssh-backend | Implement SSH backend | IN PROGRESS |
| implementer-frontend | Awaiting backend completion | BLOCKED |
| lead | Orchestration and pattern verification | ACTIVE |

## Completion Criteria

- [ ] All batch endpoints call `ensure_snapshot_before_change()`
- [ ] All services have `/capabilities`, `/config`, `/batch` endpoints
- [ ] All mappers have `_versions/` with v1.4 and v1.5 support
- [ ] All frontend services have standard method set
- [ ] TypeScript compiles with zero errors
- [ ] Backend tests pass
- [ ] `/check-patterns` skill reports no violations
