# VyOS Services Implementation Tracker

**Team:** vyos-services
**Created:** 2026-03-14
**Updated:** 2026-03-15
**Status:** IN PROGRESS — Phase 3 next
**Updated:** 2026-03-15

## Overview

Implement VyOS service management across all architecture layers following the established router → builder → mapper → API service → UI pattern.

## Phase Status

| Phase       | Services                                             | Status      | Backend  | Frontend |
| ----------- | ---------------------------------------------------- | ----------- | -------- | -------- |
| **Phase 1** | DNS Forwarding, NTP, SSH                             | COMPLETE    | COMPLETE | COMPLETE |
| **Phase 2** | DHCP Relay, DHCPv6 Server, LLDP, SNMP                | COMPLETE    | COMPLETE | COMPLETE |
| **Phase 3** | Router Advert, TFTP, Broadcast Relay, Conntrack Sync | PENDING     | -        | -        |

## Phase 1: Core Services — COMPLETE

### DNS Forwarding (`set service dns forwarding`)

| Layer            | File                                                                       | Status   |
| ---------------- | -------------------------------------------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/dns_forwarding/`                                     | COMPLETE |
| Builder          | `backend/vyos_builders/dns_forwarding/`                                    | COMPLETE |
| Router           | `backend/routers/dns_forwarding/`                                          | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`                                         | COMPLETE |
| App inclusion    | `backend/app.py`                                                           | COMPLETE |
| API types        | `frontend/src/lib/api/types/dns-forwarding.ts`                             | COMPLETE |
| API service      | `frontend/src/lib/api/dns-forwarding.ts`                                   | COMPLETE |
| Components       | `frontend/src/components/services/dns-forwarding/`                         | COMPLETE |
| Page integration | `frontend/src/app/(default)/(app)/system/services/dns-forwarding/page.tsx` | COMPLETE |

### NTP (`set service ntp`)

| Layer            | File                                                            | Status   |
| ---------------- | --------------------------------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/ntp/`                                     | COMPLETE |
| Builder          | `backend/vyos_builders/ntp/`                                    | COMPLETE |
| Router           | `backend/routers/ntp/`                                          | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`                              | COMPLETE |
| App inclusion    | `backend/app.py`                                                | COMPLETE |
| API types        | `frontend/src/lib/api/types/ntp.ts`                             | COMPLETE |
| API service      | `frontend/src/lib/api/ntp.ts`                                   | COMPLETE |
| Components       | `frontend/src/components/services/ntp/`                         | COMPLETE |
| Page integration | `frontend/src/app/(default)/(app)/system/services/ntp/page.tsx` | COMPLETE |

### SSH (`set service ssh`)

| Layer            | File                                                            | Status   |
| ---------------- | --------------------------------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/ssh/`                                     | COMPLETE |
| Builder          | `backend/vyos_builders/ssh/`                                    | COMPLETE |
| Router           | `backend/routers/ssh/`                                          | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`                              | COMPLETE |
| App inclusion    | `backend/app.py`                                                | COMPLETE |
| API types        | `frontend/src/lib/api/types/ssh.ts`                             | COMPLETE |
| API service      | `frontend/src/lib/api/ssh.ts`                                   | COMPLETE |
| Components       | `frontend/src/components/services/ssh/`                         | COMPLETE |
| Page integration | `frontend/src/app/(default)/(app)/system/services/ssh/page.tsx` | COMPLETE |

### Services Page Layout

| Component                                   | Status   |
| ------------------------------------------- | -------- |
| Tab-based service selector (sidebar layout) | COMPLETE |
| Navigation sidebar update                   | COMPLETE |
| Permission integration (FeatureGroup)       | COMPLETE |

---

## Phase 2: Network Services — COMPLETE

### DHCP Relay (`set service dhcp-relay`)

| Layer            | File                                           | Status   |
| ---------------- | ---------------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/dhcp_relay/`             | COMPLETE |
| Builder          | `backend/vyos_builders/dhcp_relay/`            | COMPLETE |
| Router           | `backend/routers/dhcp_relay/`                  | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`             | COMPLETE |
| App inclusion    | `backend/app.py`                               | COMPLETE |
| API types        | `frontend/src/lib/api/types/dhcp-relay.ts`     | COMPLETE |
| API service      | `frontend/src/lib/api/dhcp-relay.ts`           | COMPLETE |
| Components       | `frontend/src/components/services/dhcp-relay/` | COMPLETE |
| Page integration | Services page tab                              | COMPLETE |

### DHCPv6 Server (`set service dhcpv6-server`)

| Layer            | File                                              | Status   |
| ---------------- | ------------------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/dhcpv6_server/`             | COMPLETE |
| Builder          | `backend/vyos_builders/dhcpv6_server/`            | COMPLETE |
| Router           | `backend/routers/dhcpv6_server/`                  | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`                | COMPLETE |
| App inclusion    | `backend/app.py`                                  | COMPLETE |
| API types        | `frontend/src/lib/api/types/dhcpv6-server.ts`     | COMPLETE |
| API service      | `frontend/src/lib/api/dhcpv6-server.ts`           | COMPLETE |
| Components       | `frontend/src/components/services/dhcpv6-server/` | COMPLETE |
| Page integration | Services page tab                                 | COMPLETE |

### LLDP (`set service lldp`)

| Layer            | File                                     | Status   |
| ---------------- | ---------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/lldp/`             | COMPLETE |
| Builder          | `backend/vyos_builders/lldp/`            | COMPLETE |
| Router           | `backend/routers/lldp/`                  | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`       | COMPLETE |
| App inclusion    | `backend/app.py`                         | COMPLETE |
| API types        | `frontend/src/lib/api/types/lldp.ts`     | COMPLETE |
| API service      | `frontend/src/lib/api/lldp.ts`           | COMPLETE |
| Components       | `frontend/src/components/services/lldp/` | COMPLETE |
| Page integration | Services page tab                        | COMPLETE |

### SNMP (`set service snmp`)

| Layer            | File                                     | Status   |
| ---------------- | ---------------------------------------- | -------- |
| Mapper           | `backend/vyos_mappers/snmp/`             | COMPLETE |
| Builder          | `backend/vyos_builders/snmp/`            | COMPLETE |
| Router           | `backend/routers/snmp/`                  | COMPLETE |
| Registration     | `backend/vyos_mappers/__init__.py`       | COMPLETE |
| App inclusion    | `backend/app.py`                         | COMPLETE |
| API types        | `frontend/src/lib/api/types/snmp.ts`     | COMPLETE |
| API service      | `frontend/src/lib/api/snmp.ts`           | COMPLETE |
| Components       | `frontend/src/components/services/snmp/` | COMPLETE |
| Page integration | Services page tab                        | COMPLETE |

---

## Phase 3: Advanced Services

### Router Advert, TFTP, Broadcast Relay, Conntrack Sync
*(Detailed breakdown will be added when Phase 2 nears completion)*

**Status:** PENDING (ready to start)

---

## Completion Criteria

### Phase 1 — ALL MET
- [x] All batch endpoints call `ensure_snapshot_before_change()`
- [x] All services have `/capabilities`, `/config`, `/batch` endpoints
- [x] All mappers have `_versions/` with v1.4 and v1.5 support
- [x] All frontend services have standard method set
- [x] TypeScript compiles with zero errors
- [x] `/check-patterns` skill reports no violations

### Phase 2 — ALL MET
- [x] All batch endpoints call `ensure_snapshot_before_change()`
- [x] All services have `/capabilities`, `/config`, `/batch` endpoints
- [x] All mappers have `_versions/` with v1.4 and v1.5 support
- [x] All frontend services have standard method set
- [x] TypeScript compiles with zero errors
- [x] `/check-patterns` skill reports no violations
