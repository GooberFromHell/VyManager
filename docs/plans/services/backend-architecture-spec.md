# Backend Architecture Specification — VyOS Services Phase 1

**For Agent:** backend-architect
**Task:** Design the backend structure for DNS Forwarding, NTP, and SSH services

## Your Mission

Design the mapper, builder, and router for each Phase 1 service. Output a detailed specification that `implementer-backend` can follow to build each layer. You must read existing implementations to understand exact patterns.

## Reference Implementations to Study

Read these files thoroughly before designing:

1. **DHCP (most similar service):**
   - `backend/vyos_mappers/dhcp/dhcp.py` — mapper with CLI path generation
   - `backend/vyos_mappers/dhcp/dhcp_versions/v1_4.py` — version overrides
   - `backend/vyos_mappers/dhcp/dhcp_versions/__init__.py` — factory function
   - `backend/vyos_builders/dhcp/dhcp.py` — batch builder
   - `backend/routers/dhcp/dhcp.py` — router with capabilities/config/batch endpoints

2. **System (some service settings already here):**
   - `backend/routers/system.py` — check what DNS/NTP/SSH settings already exist here
   - `backend/vyos_mappers/system/` — system mapper

3. **Ethernet (interface pattern reference):**
   - `backend/routers/interfaces/ethernet.py` — batch endpoint with `ensure_snapshot_before_change`

## CRITICAL: Check What Already Exists in System Router

The system router (`backend/routers/system.py`) may already handle some DNS, NTP, or SSH settings under `set system *` rather than `set service *`. VyOS has BOTH:
- `set system name-server` (system-level DNS)
- `set service dns forwarding` (DNS forwarding service)
- `set system ntp` (system NTP — NOTE: this may have moved to `set service ntp` in VyOS 1.4+)

**You must determine:** For each service, which VyOS CLI path is correct for v1.4 vs v1.5. Check the VyOS documentation or the existing mapper paths.

## Service Specifications to Design

### 1. DNS Forwarding

**VyOS CLI path:** `set service dns forwarding`
**Key settings:**
- `listen-address` (multiple) — addresses to listen on
- `allow-from` (multiple) — networks allowed to query
- `name-server` (multiple) — upstream DNS servers
- `domain` — forward specific domains to specific servers
- `cache-size` — DNS cache size
- `no-serve-rfc1918` — block private IP reverse lookups
- `system` — use system name servers

**Design output needed:**
- Mapper class with all get/set/delete path methods
- Version differences between v1.4 and v1.5
- Builder class with all operation methods
- Router with capabilities, config, and batch endpoints
- Pydantic request/response models
- Supported batch operations table

### 2. NTP

**VyOS CLI path:** `set service ntp` (v1.4+) or `set system ntp` (older)
**Key settings:**
- `server` (multiple) — NTP server addresses with options (noselect, prefer, pool)
- `listen-address` (multiple) — addresses to listen on
- `allow-client address` (multiple) — networks allowed to query
- `vrf` — VRF to use

**Design output needed:** Same as DNS Forwarding above.

### 3. SSH

**VyOS CLI path:** `set service ssh`
**Key settings:**
- `port` — SSH port (default 22)
- `listen-address` (multiple) — addresses to listen on
- `disable-password-authentication` — require key-based auth
- `disable-host-validation` — skip host key validation
- `loglevel` — logging level
- `client-keepalive-interval` — keepalive interval
- `ciphers` (multiple) — allowed ciphers
- `key-exchange` (multiple) — allowed key exchange algorithms
- `mac` (multiple) — allowed MAC algorithms
- `access-control allow user` (multiple) — allowed users
- `access-control deny user` (multiple) — denied users
- `vrf` — VRF to use

**Design output needed:** Same as DNS Forwarding above.

## Output Format

For each service, produce a spec document containing:

```markdown
## [Service Name] Backend Spec

### Mapper: [ClassName]
- Base class methods (v1.5 features)
- v1.4 overrides (what's different/unsupported)
- Registration key name

### Builder: [ClassName]
- All operation methods
- VyOS CLI paths generated

### Router: /vyos/[service]
- GET /capabilities response schema
- GET /config response schema
- POST /batch supported operations table
- Pydantic models

### RBAC
- FeatureGroup to use (create new if needed)
```

## Constraints

- Follow the three-layer pattern exactly (mapper → builder → router)
- All batch endpoints MUST call `ensure_snapshot_before_change()`
- Mappers MUST have `_versions/` with `v1_4.py`, `v1_5.py`, `__init__.py`
- All mappers MUST be registered in `backend/vyos_mappers/__init__.py`
- All routers MUST be included in `backend/app.py`
- Use existing Pydantic models (`VyOSResponse`, `InterfaceBatchRequest`) as templates
