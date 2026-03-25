# Backend Architecture Specification Output -- Phase 1 Services

**Produced by:** backend-architect agent
**Date:** 2026-03-14
**Reference implementations studied:** DHCP mapper/builder/router, System router, Ethernet router (snapshot pattern)

---

## Table of Contents

1. [DNS Forwarding Backend Spec](#1-dns-forwarding-backend-spec)
2. [NTP Backend Spec](#2-ntp-backend-spec)
3. [SSH Backend Spec](#3-ssh-backend-spec)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Registration & Wiring](#5-registration--wiring)

---

## 1. DNS Forwarding Backend Spec

### VyOS CLI Path Analysis

**Base path:** `set service dns forwarding`

Both VyOS 1.4 and 1.5 use the same base path. Key version differences:

| Feature | v1.4 | v1.5 |
|---------|------|------|
| Base path | `service dns forwarding` | `service dns forwarding` (same) |
| `authoritative-domain` records | Not available | Available (A, AAAA, CNAME, NS, PTR, SPF, SRV, TXT, NAPTR) |
| `timeout` | Supported | Supported |
| Core features | All present | All present + authoritative domains |

**VyOS CLI commands covered:**

```
set service dns forwarding system
set service dns forwarding dhcp <interface>
set service dns forwarding name-server <address>
set service dns forwarding name-server <address> port <port>
set service dns forwarding domain <domain-name> name-server <address>
set service dns forwarding domain <domain-name> addnta
set service dns forwarding domain <domain-name> recursion-desired
set service dns forwarding allow-from <network>
set service dns forwarding dnssec <off|process-no-validate|process|log-fail|validate>
set service dns forwarding ignore-hosts-file
set service dns forwarding cache-size <0-2147483647>
set service dns forwarding negative-ttl <0-7200>
set service dns forwarding timeout <10-60000>
set service dns forwarding listen-address <address>
set service dns forwarding source-address <address>
set service dns forwarding no-serve-rfc1918
set service dns forwarding authoritative-domain <domain> ...  (v1.5 only)
```

### Mapper: `DNSForwardingMapper`

**File:** `backend/vyos_mappers/dns_forwarding/dns_forwarding.py`

**Base class methods (v1.5 features):**

```python
class DNSForwardingMapper(BaseFeatureMapper):
    """Base mapper for DNS forwarding configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = DNSForwardingMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = DNSForwardingMapperV1_5()
        else:
            self.version_mapper = DNSForwardingMapperV1_5()

    # ==================== Global Settings ====================

    def get_system(self) -> List[str]:
        """set service dns forwarding system"""
        return ["service", "dns", "forwarding", "system"]

    def get_system_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "system"]

    def get_dhcp_interface(self, interface: str) -> List[str]:
        """set service dns forwarding dhcp <interface>"""
        return ["service", "dns", "forwarding", "dhcp", interface]

    def get_dhcp_interface_path(self, interface: str) -> List[str]:
        return ["service", "dns", "forwarding", "dhcp", interface]

    def get_cache_size(self, size: str) -> List[str]:
        """set service dns forwarding cache-size <size>"""
        return ["service", "dns", "forwarding", "cache-size", size]

    def get_cache_size_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "cache-size"]

    def get_negative_ttl(self, ttl: str) -> List[str]:
        """set service dns forwarding negative-ttl <ttl>"""
        return ["service", "dns", "forwarding", "negative-ttl", ttl]

    def get_negative_ttl_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "negative-ttl"]

    def get_timeout(self, timeout: str) -> List[str]:
        """set service dns forwarding timeout <timeout>"""
        return ["service", "dns", "forwarding", "timeout", timeout]

    def get_timeout_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "timeout"]

    def get_dnssec(self, mode: str) -> List[str]:
        """set service dns forwarding dnssec <mode>"""
        return ["service", "dns", "forwarding", "dnssec", mode]

    def get_dnssec_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "dnssec"]

    def get_ignore_hosts_file(self) -> List[str]:
        """set service dns forwarding ignore-hosts-file"""
        return ["service", "dns", "forwarding", "ignore-hosts-file"]

    def get_ignore_hosts_file_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "ignore-hosts-file"]

    def get_no_serve_rfc1918(self) -> List[str]:
        """set service dns forwarding no-serve-rfc1918"""
        return ["service", "dns", "forwarding", "no-serve-rfc1918"]

    def get_no_serve_rfc1918_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "no-serve-rfc1918"]

    # ==================== Listen / Source Addresses ====================

    def get_listen_address(self, address: str) -> List[str]:
        """set service dns forwarding listen-address <address>"""
        return ["service", "dns", "forwarding", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "listen-address", address]

    def get_source_address(self, address: str) -> List[str]:
        """set service dns forwarding source-address <address>"""
        return ["service", "dns", "forwarding", "source-address", address]

    def get_source_address_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "source-address", address]

    # ==================== Allow-From ====================

    def get_allow_from(self, network: str) -> List[str]:
        """set service dns forwarding allow-from <network>"""
        return ["service", "dns", "forwarding", "allow-from", network]

    def get_allow_from_path(self, network: str) -> List[str]:
        return ["service", "dns", "forwarding", "allow-from", network]

    # ==================== Name Servers ====================

    def get_name_server(self, address: str) -> List[str]:
        """set service dns forwarding name-server <address>"""
        return ["service", "dns", "forwarding", "name-server", address]

    def get_name_server_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "name-server", address]

    def get_name_server_port(self, address: str, port: str) -> List[str]:
        """set service dns forwarding name-server <address> port <port>"""
        return ["service", "dns", "forwarding", "name-server", address, "port", port]

    def get_name_server_port_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "name-server", address, "port"]

    # ==================== Domain Forwarding ====================

    def get_domain(self, domain: str) -> List[str]:
        """set service dns forwarding domain <domain>"""
        return ["service", "dns", "forwarding", "domain", domain]

    def get_domain_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain]

    def get_domain_name_server(self, domain: str, address: str) -> List[str]:
        """set service dns forwarding domain <domain> name-server <address>"""
        return ["service", "dns", "forwarding", "domain", domain, "name-server", address]

    def get_domain_name_server_path(self, domain: str, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain, "name-server", address]

    def get_domain_addnta(self, domain: str) -> List[str]:
        """set service dns forwarding domain <domain> addnta"""
        return ["service", "dns", "forwarding", "domain", domain, "addnta"]

    def get_domain_addnta_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain, "addnta"]

    def get_domain_recursion_desired(self, domain: str) -> List[str]:
        """set service dns forwarding domain <domain> recursion-desired"""
        return ["service", "dns", "forwarding", "domain", domain, "recursion-desired"]

    def get_domain_recursion_desired_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain, "recursion-desired"]

    # ==================== Authoritative Domain (v1.5 only - delegate) ====================

    def has_authoritative_domains(self) -> bool:
        """Check if this version supports authoritative domains."""
        return self.version_mapper.has_authoritative_domains()

    def get_authoritative_domain(self, domain: str) -> List[str]:
        """set service dns forwarding authoritative-domain <domain> (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_authoritative_domain'):
            return self.version_mapper.get_authoritative_domain(domain)
        return []

    def get_authoritative_domain_path(self, domain: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_authoritative_domain_path'):
            return self.version_mapper.get_authoritative_domain_path(domain)
        return []

    def get_authoritative_domain_disable(self, domain: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_authoritative_domain_disable'):
            return self.version_mapper.get_authoritative_domain_disable(domain)
        return []

    def get_authoritative_domain_disable_path(self, domain: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_authoritative_domain_disable_path'):
            return self.version_mapper.get_authoritative_domain_disable_path(domain)
        return []
```

### v1.4 Overrides

**File:** `backend/vyos_mappers/dns_forwarding/dns_forwarding_versions/v1_4.py`

```python
class DNSForwardingMapperV1_4:
    """VyOS 1.4 DNS Forwarding - no authoritative domains."""

    def has_authoritative_domains(self) -> bool:
        return False
```

Minimal overrides because v1.4 and v1.5 share the same base CLI paths for DNS forwarding. The only difference is authoritative domain support.

### v1.5 Overrides

**File:** `backend/vyos_mappers/dns_forwarding/dns_forwarding_versions/v1_5.py`

```python
class DNSForwardingMapperV1_5:
    """VyOS 1.5 DNS Forwarding - adds authoritative domains."""

    def has_authoritative_domains(self) -> bool:
        return True

    def get_authoritative_domain(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain]

    def get_authoritative_domain_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain]

    def get_authoritative_domain_disable(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "disable"]

    def get_authoritative_domain_disable_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "disable"]
```

### Factory

**File:** `backend/vyos_mappers/dns_forwarding/dns_forwarding_versions/__init__.py`

```python
from .v1_4 import DNSForwardingMapperV1_4
from .v1_5 import DNSForwardingMapperV1_5

def get_dns_forwarding_mapper(version: str):
    from ..dns_forwarding import DNSForwardingMapper
    return DNSForwardingMapper(version)

__all__ = ["DNSForwardingMapperV1_4", "DNSForwardingMapperV1_5", "get_dns_forwarding_mapper"]
```

### Registration key: `"dns_forwarding"`

### Builder: `DNSForwardingBatchBuilder`

**File:** `backend/vyos_builders/dns_forwarding/dns_forwarding.py`

```python
class DNSForwardingBatchBuilder:
    """Batch builder for DNS forwarding operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "dns_forwarding"

    # Core batch ops: add_set, add_delete, clear, get_operations, operation_count, is_empty
    # (same pattern as DHCPBatchBuilder)

    # ==================== Global Settings ====================

    def set_system(self) -> "DNSForwardingBatchBuilder": ...
    def delete_system(self) -> "DNSForwardingBatchBuilder": ...
    def set_dhcp_interface(self, interface: str) -> "DNSForwardingBatchBuilder": ...
    def delete_dhcp_interface(self, interface: str) -> "DNSForwardingBatchBuilder": ...
    def set_cache_size(self, size: str) -> "DNSForwardingBatchBuilder": ...
    def delete_cache_size(self) -> "DNSForwardingBatchBuilder": ...
    def set_negative_ttl(self, ttl: str) -> "DNSForwardingBatchBuilder": ...
    def delete_negative_ttl(self) -> "DNSForwardingBatchBuilder": ...
    def set_timeout(self, timeout: str) -> "DNSForwardingBatchBuilder": ...
    def delete_timeout(self) -> "DNSForwardingBatchBuilder": ...
    def set_dnssec(self, mode: str) -> "DNSForwardingBatchBuilder": ...
    def delete_dnssec(self) -> "DNSForwardingBatchBuilder": ...
    def set_ignore_hosts_file(self) -> "DNSForwardingBatchBuilder": ...
    def delete_ignore_hosts_file(self) -> "DNSForwardingBatchBuilder": ...
    def set_no_serve_rfc1918(self) -> "DNSForwardingBatchBuilder": ...
    def delete_no_serve_rfc1918(self) -> "DNSForwardingBatchBuilder": ...

    # ==================== Listen / Source Addresses ====================

    def set_listen_address(self, address: str) -> "DNSForwardingBatchBuilder": ...
    def delete_listen_address(self, address: str) -> "DNSForwardingBatchBuilder": ...
    def set_source_address(self, address: str) -> "DNSForwardingBatchBuilder": ...
    def delete_source_address(self, address: str) -> "DNSForwardingBatchBuilder": ...

    # ==================== Allow-From ====================

    def set_allow_from(self, network: str) -> "DNSForwardingBatchBuilder": ...
    def delete_allow_from(self, network: str) -> "DNSForwardingBatchBuilder": ...

    # ==================== Name Servers ====================

    def set_name_server(self, address: str) -> "DNSForwardingBatchBuilder": ...
    def delete_name_server(self, address: str) -> "DNSForwardingBatchBuilder": ...
    def set_name_server_port(self, address: str, port: str) -> "DNSForwardingBatchBuilder": ...
    def delete_name_server_port(self, address: str) -> "DNSForwardingBatchBuilder": ...

    # ==================== Domain Forwarding ====================

    def set_domain(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def delete_domain(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def set_domain_name_server(self, domain: str, address: str) -> "DNSForwardingBatchBuilder": ...
    def delete_domain_name_server(self, domain: str, address: str) -> "DNSForwardingBatchBuilder": ...
    def set_domain_addnta(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def delete_domain_addnta(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def set_domain_recursion_desired(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def delete_domain_recursion_desired(self, domain: str) -> "DNSForwardingBatchBuilder": ...

    # ==================== Authoritative Domain (v1.5 only) ====================

    def set_authoritative_domain(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def delete_authoritative_domain(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def set_authoritative_domain_disable(self, domain: str) -> "DNSForwardingBatchBuilder": ...
    def delete_authoritative_domain_disable(self, domain: str) -> "DNSForwardingBatchBuilder": ...

    # ==================== Capabilities ====================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "has_authoritative_domains": is_v15,
            "fields": {
                "listen_addresses":   {"supported": True, "description": "Addresses to listen on"},
                "allow_from":         {"supported": True, "description": "Networks allowed to query"},
                "name_servers":       {"supported": True, "description": "Upstream DNS servers"},
                "domains":            {"supported": True, "description": "Domain-specific forwarding"},
                "cache_size":         {"supported": True, "description": "DNS cache size (0-2147483647)"},
                "negative_ttl":       {"supported": True, "description": "Negative TTL (0-7200)"},
                "timeout":            {"supported": True, "description": "Query timeout (10-60000)"},
                "dnssec":             {"supported": True, "description": "DNSSEC validation mode"},
                "no_serve_rfc1918":   {"supported": True, "description": "Block private IP reverse lookups"},
                "system":             {"supported": True, "description": "Use system name servers"},
                "ignore_hosts_file":  {"supported": True, "description": "Ignore /etc/hosts"},
                "source_addresses":   {"supported": True, "description": "Source addresses for outbound queries"},
                "dhcp_interfaces":    {"supported": True, "description": "DHCP interfaces for name servers"},
                "authoritative_domains": {"supported": is_v15, "description": "Authoritative DNS zones (v1.5+)"},
            },
        }
```

### Supported Batch Operations Table

| Operation | Method | Args (besides self) | Notes |
|-----------|--------|---------------------|-------|
| `set_system` | `set_system()` | none | Enable system name servers |
| `delete_system` | `delete_system()` | none | |
| `set_listen_address` | `set_listen_address(address)` | 1 | Multi-value |
| `delete_listen_address` | `delete_listen_address(address)` | 1 | |
| `set_allow_from` | `set_allow_from(network)` | 1 | Multi-value |
| `delete_allow_from` | `delete_allow_from(network)` | 1 | |
| `set_name_server` | `set_name_server(address)` | 1 | Multi-value |
| `delete_name_server` | `delete_name_server(address)` | 1 | |
| `set_name_server_port` | `set_name_server_port(address, port)` | 2 | |
| `delete_name_server_port` | `delete_name_server_port(address)` | 1 | |
| `set_cache_size` | `set_cache_size(size)` | 1 | |
| `delete_cache_size` | `delete_cache_size()` | 0 | |
| `set_negative_ttl` | `set_negative_ttl(ttl)` | 1 | |
| `delete_negative_ttl` | `delete_negative_ttl()` | 0 | |
| `set_timeout` | `set_timeout(timeout)` | 1 | |
| `delete_timeout` | `delete_timeout()` | 0 | |
| `set_dnssec` | `set_dnssec(mode)` | 1 | off/process-no-validate/process/log-fail/validate |
| `delete_dnssec` | `delete_dnssec()` | 0 | |
| `set_no_serve_rfc1918` | `set_no_serve_rfc1918()` | 0 | |
| `delete_no_serve_rfc1918` | `delete_no_serve_rfc1918()` | 0 | |
| `set_ignore_hosts_file` | `set_ignore_hosts_file()` | 0 | |
| `delete_ignore_hosts_file` | `delete_ignore_hosts_file()` | 0 | |
| `set_source_address` | `set_source_address(address)` | 1 | |
| `delete_source_address` | `delete_source_address(address)` | 1 | |
| `set_dhcp_interface` | `set_dhcp_interface(interface)` | 1 | |
| `delete_dhcp_interface` | `delete_dhcp_interface(interface)` | 1 | |
| `set_domain` | `set_domain(domain)` | 1 | Create empty domain |
| `delete_domain` | `delete_domain(domain)` | 1 | Delete entire domain |
| `set_domain_name_server` | `set_domain_name_server(domain, address)` | 2 | |
| `delete_domain_name_server` | `delete_domain_name_server(domain, address)` | 2 | |
| `set_domain_addnta` | `set_domain_addnta(domain)` | 1 | |
| `delete_domain_addnta` | `delete_domain_addnta(domain)` | 1 | |
| `set_domain_recursion_desired` | `set_domain_recursion_desired(domain)` | 1 | |
| `delete_domain_recursion_desired` | `delete_domain_recursion_desired(domain)` | 1 | |
| `set_authoritative_domain` | `set_authoritative_domain(domain)` | 1 | v1.5 only |
| `delete_authoritative_domain` | `delete_authoritative_domain(domain)` | 1 | v1.5 only |

### Router: `/vyos/dns-forwarding`

**File:** `backend/routers/dns_forwarding/dns_forwarding.py`

**Prefix:** `APIRouter(prefix="/vyos/dns-forwarding", tags=["dns-forwarding"])`

#### Pydantic Models

```python
class DNSDomainForward(BaseModel):
    """DNS domain-specific forwarding entry."""
    domain: str = Field(..., description="Domain name to forward")
    name_servers: List[str] = Field(default_factory=list, description="Servers for this domain")
    addnta: bool = False
    recursion_desired: bool = False


class DNSForwardingConfigResponse(BaseModel):
    """Full DNS forwarding configuration."""
    listen_addresses: List[str] = Field(default_factory=list)
    allow_from: List[str] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    source_addresses: List[str] = Field(default_factory=list)
    dhcp_interfaces: List[str] = Field(default_factory=list)
    domains: List[DNSDomainForward] = Field(default_factory=list)
    cache_size: Optional[str] = None
    negative_ttl: Optional[str] = None
    timeout: Optional[str] = None
    dnssec: Optional[str] = None
    no_serve_rfc1918: bool = False
    system: bool = False
    ignore_hosts_file: bool = False


class DNSForwardingBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class DNSForwardingBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary item (address, domain, network, ...)")
    operations: List[DNSForwardingBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
```

#### GET /capabilities

Returns version-aware feature flags from `builder.get_capabilities()`. Uses `FeatureGroup.DNS_FORWARDING` for RBAC.

#### GET /config

Reads from `full_config["service"]["dns"]["forwarding"]` and normalizes into `DNSForwardingConfigResponse`. Parses:
- `listen-address` -> dict keys to list
- `allow-from` -> dict keys to list
- `name-server` -> dict keys to list (each may have `port` sub-key)
- `source-address` -> dict keys to list
- `dhcp` -> dict keys to list
- `domain` -> iterate entries, each with `name-server` sub-dict and optional `addnta`/`recursion-desired` flags
- Scalar values: `cache-size`, `negative-ttl`, `timeout`, `dnssec`
- Boolean flags: `no-serve-rfc1918` (presence check), `system` (presence check), `ignore-hosts-file` (presence check)

#### POST /batch

Follows the System router pattern (item_name + operations list). Calls `ensure_snapshot_before_change(instance_id, current_config)` before executing. Uses `inspect.signature` to determine argument count per builder method. The `item_name` is always the first arg for methods requiring parameters.

Internal builder methods are blocked via `_INTERNAL_BUILDER_METHODS` frozenset.

### RBAC

**New FeatureGroup:** `DNS_FORWARDING = "DNS_FORWARDING"`

Add to `FeatureGroup` enum in `rbac_permissions.py`. Should be a child of a new `SERVICES` parent group (or can stand alone initially). Add to all built-in role permission maps (ADMIN: WRITE, OPERATOR: WRITE, VIEWER: READ).

---

## 2. NTP Backend Spec

### VyOS CLI Path Analysis

**Base path:** `set service ntp` (both v1.4 and v1.5)

Note: VyOS 1.2/1.3 used `set system ntp` but since VyManager only targets v1.4+, the path is always `set service ntp`.

| Feature | v1.4 | v1.5 |
|---------|------|------|
| Base path | `service ntp` | `service ntp` (same) |
| `server <addr> ptp` | Not available | Available |
| `server <addr> interleave` | Not available | Available |
| `ptp` (PTP support) | Not available | Available |
| `timestamp interface` | Not available | Available |
| Core features | All present | All present + PTP/interleave |

**VyOS CLI commands covered:**

```
set service ntp server <address>
set service ntp server <address> noselect
set service ntp server <address> nts
set service ntp server <address> pool
set service ntp server <address> prefer
set service ntp server <address> ptp           (v1.5 only)
set service ntp server <address> interleave    (v1.5 only)
set service ntp listen-address <address>
set service ntp allow-client address <address>
set service ntp vrf <name>
set service ntp leap-second <ignore|smear|system|timezone>
set service ntp ptp                            (v1.5 only)
set service ntp ptp port <port>                (v1.5 only)
set service ntp timestamp interface <iface>    (v1.5 only)
set service ntp timestamp interface <iface> receive-filter <all|ntp|ptp|none>  (v1.5 only)
```

### Mapper: `NTPMapper`

**File:** `backend/vyos_mappers/ntp/ntp.py`

```python
class NTPMapper(BaseFeatureMapper):
    """Base mapper for NTP service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = NTPMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = NTPMapperV1_5()
        else:
            self.version_mapper = NTPMapperV1_5()

    # ==================== Server Commands ====================

    def get_server(self, address: str) -> List[str]:
        """set service ntp server <address>"""
        return ["service", "ntp", "server", address]

    def get_server_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address]

    def get_server_noselect(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "noselect"]

    def get_server_noselect_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "noselect"]

    def get_server_nts(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "nts"]

    def get_server_nts_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "nts"]

    def get_server_pool(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "pool"]

    def get_server_pool_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "pool"]

    def get_server_prefer(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "prefer"]

    def get_server_prefer_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "prefer"]

    # ==================== v1.5 server options (delegate) ====================

    def has_ptp(self) -> bool:
        return self.version_mapper.has_ptp()

    def has_interleave(self) -> bool:
        return self.version_mapper.has_interleave()

    def get_server_ptp(self, address: str) -> List[str]:
        """set service ntp server <address> ptp (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_server_ptp'):
            return self.version_mapper.get_server_ptp(address)
        return []

    def get_server_ptp_path(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_server_ptp_path'):
            return self.version_mapper.get_server_ptp_path(address)
        return []

    def get_server_interleave(self, address: str) -> List[str]:
        """set service ntp server <address> interleave (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_server_interleave'):
            return self.version_mapper.get_server_interleave(address)
        return []

    def get_server_interleave_path(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_server_interleave_path'):
            return self.version_mapper.get_server_interleave_path(address)
        return []

    # ==================== Listen Address ====================

    def get_listen_address(self, address: str) -> List[str]:
        return ["service", "ntp", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "ntp", "listen-address", address]

    # ==================== Allow Client ====================

    def get_allow_client(self, address: str) -> List[str]:
        """set service ntp allow-client address <address>"""
        return ["service", "ntp", "allow-client", "address", address]

    def get_allow_client_path(self, address: str) -> List[str]:
        return ["service", "ntp", "allow-client", "address", address]

    # ==================== VRF ====================

    def get_vrf(self, name: str) -> List[str]:
        return ["service", "ntp", "vrf", name]

    def get_vrf_path(self) -> List[str]:
        return ["service", "ntp", "vrf"]

    # ==================== Leap Second ====================

    def get_leap_second(self, mode: str) -> List[str]:
        """set service ntp leap-second <mode>"""
        return ["service", "ntp", "leap-second", mode]

    def get_leap_second_path(self) -> List[str]:
        return ["service", "ntp", "leap-second"]

    # ==================== PTP (v1.5 only - delegate) ====================

    def get_ptp(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp'):
            return self.version_mapper.get_ptp()
        return []

    def get_ptp_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp_path'):
            return self.version_mapper.get_ptp_path()
        return []

    def get_ptp_port(self, port: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp_port'):
            return self.version_mapper.get_ptp_port(port)
        return []

    def get_ptp_port_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp_port_path'):
            return self.version_mapper.get_ptp_port_path()
        return []
```

### v1.4 Overrides

**File:** `backend/vyos_mappers/ntp/ntp_versions/v1_4.py`

```python
class NTPMapperV1_4:
    """VyOS 1.4 NTP - no PTP, no interleave."""

    def has_ptp(self) -> bool:
        return False

    def has_interleave(self) -> bool:
        return False
```

### v1.5 Overrides

**File:** `backend/vyos_mappers/ntp/ntp_versions/v1_5.py`

```python
class NTPMapperV1_5:
    """VyOS 1.5 NTP - adds PTP, interleave, timestamp interface."""

    def has_ptp(self) -> bool:
        return True

    def has_interleave(self) -> bool:
        return True

    def get_server_ptp(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "ptp"]

    def get_server_ptp_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "ptp"]

    def get_server_interleave(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "interleave"]

    def get_server_interleave_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "interleave"]

    def get_ptp(self) -> List[str]:
        return ["service", "ntp", "ptp"]

    def get_ptp_path(self) -> List[str]:
        return ["service", "ntp", "ptp"]

    def get_ptp_port(self, port: str) -> List[str]:
        return ["service", "ntp", "ptp", "port", port]

    def get_ptp_port_path(self) -> List[str]:
        return ["service", "ntp", "ptp", "port"]
```

### Factory

**File:** `backend/vyos_mappers/ntp/ntp_versions/__init__.py`

```python
from .v1_4 import NTPMapperV1_4
from .v1_5 import NTPMapperV1_5

def get_ntp_mapper(version: str):
    from ..ntp import NTPMapper
    return NTPMapper(version)

__all__ = ["NTPMapperV1_4", "NTPMapperV1_5", "get_ntp_mapper"]
```

### Registration key: `"ntp"`

### Builder: `NTPBatchBuilder`

**File:** `backend/vyos_builders/ntp/ntp.py`

```python
class NTPBatchBuilder:
    """Batch builder for NTP service operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ntp"

    # Core batch ops (same as DHCP pattern)

    # Server operations
    def set_server(self, address: str) -> "NTPBatchBuilder": ...
    def delete_server(self, address: str) -> "NTPBatchBuilder": ...
    def set_server_noselect(self, address: str) -> "NTPBatchBuilder": ...
    def delete_server_noselect(self, address: str) -> "NTPBatchBuilder": ...
    def set_server_nts(self, address: str) -> "NTPBatchBuilder": ...
    def delete_server_nts(self, address: str) -> "NTPBatchBuilder": ...
    def set_server_pool(self, address: str) -> "NTPBatchBuilder": ...
    def delete_server_pool(self, address: str) -> "NTPBatchBuilder": ...
    def set_server_prefer(self, address: str) -> "NTPBatchBuilder": ...
    def delete_server_prefer(self, address: str) -> "NTPBatchBuilder": ...
    def set_server_ptp(self, address: str) -> "NTPBatchBuilder": ...        # v1.5
    def delete_server_ptp(self, address: str) -> "NTPBatchBuilder": ...     # v1.5
    def set_server_interleave(self, address: str) -> "NTPBatchBuilder": ... # v1.5
    def delete_server_interleave(self, address: str) -> "NTPBatchBuilder": ... # v1.5

    # Listen address
    def set_listen_address(self, address: str) -> "NTPBatchBuilder": ...
    def delete_listen_address(self, address: str) -> "NTPBatchBuilder": ...

    # Allow client
    def set_allow_client(self, address: str) -> "NTPBatchBuilder": ...
    def delete_allow_client(self, address: str) -> "NTPBatchBuilder": ...

    # VRF
    def set_vrf(self, name: str) -> "NTPBatchBuilder": ...
    def delete_vrf(self) -> "NTPBatchBuilder": ...

    # Leap second
    def set_leap_second(self, mode: str) -> "NTPBatchBuilder": ...
    def delete_leap_second(self) -> "NTPBatchBuilder": ...

    # PTP (v1.5 only)
    def set_ptp(self) -> "NTPBatchBuilder": ...
    def delete_ptp(self) -> "NTPBatchBuilder": ...
    def set_ptp_port(self, port: str) -> "NTPBatchBuilder": ...
    def delete_ptp_port(self) -> "NTPBatchBuilder": ...

    # Capabilities
    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "has_ptp": is_v15,
            "has_interleave": is_v15,
            "fields": {
                "servers":          {"supported": True, "description": "NTP server addresses"},
                "listen_addresses": {"supported": True, "description": "Addresses to listen on for clients"},
                "allow_clients":    {"supported": True, "description": "Networks allowed to query"},
                "vrf":              {"supported": True, "description": "VRF to use"},
                "leap_second":      {"supported": True, "description": "Leap second handling mode"},
                "server_noselect":  {"supported": True, "description": "Mark server as noselect"},
                "server_nts":       {"supported": True, "description": "Enable NTS for server"},
                "server_pool":      {"supported": True, "description": "Mark server as pool"},
                "server_prefer":    {"supported": True, "description": "Mark server as preferred"},
                "server_ptp":       {"supported": is_v15, "description": "PTP server option (v1.5+)"},
                "server_interleave": {"supported": is_v15, "description": "Interleave mode (v1.5+)"},
                "ptp":              {"supported": is_v15, "description": "PTP support (v1.5+)"},
            },
        }
```

### Supported Batch Operations Table

| Operation | Method | Args | Notes |
|-----------|--------|------|-------|
| `set_server` | `set_server(address)` | 1 | Add NTP server |
| `delete_server` | `delete_server(address)` | 1 | Remove NTP server (entire node) |
| `set_server_noselect` | `set_server_noselect(address)` | 1 | |
| `delete_server_noselect` | `delete_server_noselect(address)` | 1 | |
| `set_server_nts` | `set_server_nts(address)` | 1 | |
| `delete_server_nts` | `delete_server_nts(address)` | 1 | |
| `set_server_pool` | `set_server_pool(address)` | 1 | |
| `delete_server_pool` | `delete_server_pool(address)` | 1 | |
| `set_server_prefer` | `set_server_prefer(address)` | 1 | |
| `delete_server_prefer` | `delete_server_prefer(address)` | 1 | |
| `set_server_ptp` | `set_server_ptp(address)` | 1 | v1.5 only |
| `delete_server_ptp` | `delete_server_ptp(address)` | 1 | v1.5 only |
| `set_server_interleave` | `set_server_interleave(address)` | 1 | v1.5 only |
| `delete_server_interleave` | `delete_server_interleave(address)` | 1 | v1.5 only |
| `set_listen_address` | `set_listen_address(address)` | 1 | Multi-value |
| `delete_listen_address` | `delete_listen_address(address)` | 1 | |
| `set_allow_client` | `set_allow_client(address)` | 1 | Multi-value |
| `delete_allow_client` | `delete_allow_client(address)` | 1 | |
| `set_vrf` | `set_vrf(name)` | 1 | |
| `delete_vrf` | `delete_vrf()` | 0 | |
| `set_leap_second` | `set_leap_second(mode)` | 1 | ignore/smear/system/timezone |
| `delete_leap_second` | `delete_leap_second()` | 0 | |
| `set_ptp` | `set_ptp()` | 0 | v1.5 only |
| `delete_ptp` | `delete_ptp()` | 0 | v1.5 only |
| `set_ptp_port` | `set_ptp_port(port)` | 1 | v1.5 only |
| `delete_ptp_port` | `delete_ptp_port()` | 0 | v1.5 only |

### Router: `/vyos/ntp`

**File:** `backend/routers/ntp/ntp.py`

**Prefix:** `APIRouter(prefix="/vyos/ntp", tags=["ntp"])`

#### Pydantic Models

```python
class NTPServer(BaseModel):
    """NTP server configuration."""
    address: str = Field(..., description="Server hostname or IP")
    noselect: bool = False
    nts: bool = False
    pool: bool = False
    prefer: bool = False
    ptp: bool = False        # v1.5 only
    interleave: bool = False # v1.5 only


class NTPConfigResponse(BaseModel):
    """Full NTP configuration."""
    servers: List[NTPServer] = Field(default_factory=list)
    listen_addresses: List[str] = Field(default_factory=list)
    allow_clients: List[str] = Field(default_factory=list)
    vrf: Optional[str] = None
    leap_second: Optional[str] = None


class NTPBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class NTPBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary item (server address, listen address, etc.)")
    operations: List[NTPBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
```

#### GET /capabilities

Returns `builder.get_capabilities()`. RBAC: `FeatureGroup.NTP`.

#### GET /config

Reads from `full_config["service"]["ntp"]` and normalizes:
- `server` -> iterate dict entries, check each for `noselect`, `nts`, `pool`, `prefer`, `ptp`, `interleave` flags
- `listen-address` -> dict keys to list
- `allow-client` -> `address` sub-dict keys to list
- `vrf` -> scalar
- `leap-second` -> scalar

#### POST /batch

Same pattern as System router. Calls `ensure_snapshot_before_change()`.
Uses `item_name` + operations. `_INTERNAL_BUILDER_METHODS` blocklist.

### RBAC

**New FeatureGroup:** `NTP = "NTP"`

Child of `SERVICES` parent (or standalone). ADMIN: WRITE, OPERATOR: WRITE, VIEWER: READ.

---

## 3. SSH Backend Spec

### VyOS CLI Path Analysis

**Base path:** `set service ssh` (both v1.4 and v1.5)

| Feature | v1.4 | v1.5 |
|---------|------|------|
| Base path | `service ssh` | `service ssh` (same) |
| Ciphers keyword | `ciphers` (plural) | `cipher` (singular) |
| `fido` options | Not available | Available (`pin-required`, `touch-required`) |
| `pubkey-accepted-algorithm` | Not available | Available |
| `trusted-user-ca` | Not available | Available |
| Core features | All present | All present + fido/pubkey/ca |

**IMPORTANT version difference:** v1.4 uses `ciphers` (plural) while v1.5 uses `cipher` (singular). This is a breaking change that the version mapper MUST handle.

**VyOS CLI commands covered:**

```
set service ssh port <port>
set service ssh listen-address <address>
set service ssh ciphers <cipher>                       (v1.4)
set service ssh cipher <cipher>                        (v1.5)
set service ssh disable-password-authentication
set service ssh disable-host-validation
set service ssh mac <mac>
set service ssh access-control allow user <name>
set service ssh access-control deny user <name>
set service ssh access-control allow group <name>
set service ssh access-control deny group <name>
set service ssh client-keepalive-interval <interval>
set service ssh key-exchange <kex>
set service ssh loglevel <quiet|fatal|error|info|verbose>
set service ssh vrf <name>
set service ssh dynamic-protection
set service ssh dynamic-protection allow-from <address>
set service ssh dynamic-protection block-time <sec>
set service ssh dynamic-protection detect-time <sec>
set service ssh dynamic-protection threshold <sec>
set service ssh fido pin-required                      (v1.5 only)
set service ssh fido touch-required                    (v1.5 only)
set service ssh pubkey-accepted-algorithm <name>       (v1.5 only)
set service ssh trusted-user-ca <name>                 (v1.5 only)
```

### Mapper: `SSHMapper`

**File:** `backend/vyos_mappers/ssh/ssh.py`

```python
class SSHMapper(BaseFeatureMapper):
    """Base mapper for SSH service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = SSHMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = SSHMapperV1_5()
        else:
            self.version_mapper = SSHMapperV1_5()

    # ==================== Basic Settings ====================

    def get_port(self, port: str) -> List[str]:
        return ["service", "ssh", "port", port]

    def get_port_path(self) -> List[str]:
        return ["service", "ssh", "port"]

    def get_listen_address(self, address: str) -> List[str]:
        return ["service", "ssh", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "ssh", "listen-address", address]

    def get_disable_password_authentication(self) -> List[str]:
        return ["service", "ssh", "disable-password-authentication"]

    def get_disable_password_authentication_path(self) -> List[str]:
        return ["service", "ssh", "disable-password-authentication"]

    def get_disable_host_validation(self) -> List[str]:
        return ["service", "ssh", "disable-host-validation"]

    def get_disable_host_validation_path(self) -> List[str]:
        return ["service", "ssh", "disable-host-validation"]

    def get_loglevel(self, level: str) -> List[str]:
        return ["service", "ssh", "loglevel", level]

    def get_loglevel_path(self) -> List[str]:
        return ["service", "ssh", "loglevel"]

    def get_client_keepalive_interval(self, interval: str) -> List[str]:
        return ["service", "ssh", "client-keepalive-interval", interval]

    def get_client_keepalive_interval_path(self) -> List[str]:
        return ["service", "ssh", "client-keepalive-interval"]

    def get_vrf(self, name: str) -> List[str]:
        return ["service", "ssh", "vrf", name]

    def get_vrf_path(self) -> List[str]:
        return ["service", "ssh", "vrf"]

    # ==================== Cipher (version-aware, delegate) ====================

    def get_cipher(self, cipher: str) -> List[str]:
        """Version-aware: v1.4='ciphers', v1.5='cipher'"""
        return self.version_mapper.get_cipher(cipher)

    def get_cipher_path(self, cipher: str) -> List[str]:
        return self.version_mapper.get_cipher_path(cipher)

    def get_cipher_config_key(self) -> str:
        """Returns 'ciphers' for v1.4, 'cipher' for v1.5. Used by config parser."""
        return self.version_mapper.get_cipher_config_key()

    # ==================== Key Exchange ====================

    def get_key_exchange(self, kex: str) -> List[str]:
        return ["service", "ssh", "key-exchange", kex]

    def get_key_exchange_path(self, kex: str) -> List[str]:
        return ["service", "ssh", "key-exchange", kex]

    # ==================== MAC ====================

    def get_mac(self, mac: str) -> List[str]:
        return ["service", "ssh", "mac", mac]

    def get_mac_path(self, mac: str) -> List[str]:
        return ["service", "ssh", "mac", mac]

    # ==================== Access Control ====================

    def get_access_control_allow_user(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "user", user]

    def get_access_control_allow_user_path(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "user", user]

    def get_access_control_deny_user(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "user", user]

    def get_access_control_deny_user_path(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "user", user]

    def get_access_control_allow_group(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "group", group]

    def get_access_control_allow_group_path(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "group", group]

    def get_access_control_deny_group(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "group", group]

    def get_access_control_deny_group_path(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "group", group]

    # ==================== Dynamic Protection ====================

    def get_dynamic_protection(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection"]

    def get_dynamic_protection_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection"]

    def get_dynamic_protection_allow_from(self, address: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "allow-from", address]

    def get_dynamic_protection_allow_from_path(self, address: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "allow-from", address]

    def get_dynamic_protection_block_time(self, seconds: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "block-time", seconds]

    def get_dynamic_protection_block_time_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "block-time"]

    def get_dynamic_protection_detect_time(self, seconds: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "detect-time", seconds]

    def get_dynamic_protection_detect_time_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "detect-time"]

    def get_dynamic_protection_threshold(self, count: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "threshold", count]

    def get_dynamic_protection_threshold_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "threshold"]

    # ==================== v1.5 Features (delegate) ====================

    def has_fido(self) -> bool:
        return self.version_mapper.has_fido()

    def has_pubkey_accepted_algorithm(self) -> bool:
        return self.version_mapper.has_pubkey_accepted_algorithm()

    def has_trusted_user_ca(self) -> bool:
        return self.version_mapper.has_trusted_user_ca()

    def get_fido_pin_required(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_pin_required'):
            return self.version_mapper.get_fido_pin_required()
        return []

    def get_fido_pin_required_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_pin_required_path'):
            return self.version_mapper.get_fido_pin_required_path()
        return []

    def get_fido_touch_required(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_touch_required'):
            return self.version_mapper.get_fido_touch_required()
        return []

    def get_fido_touch_required_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_touch_required_path'):
            return self.version_mapper.get_fido_touch_required_path()
        return []

    def get_pubkey_accepted_algorithm(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_pubkey_accepted_algorithm'):
            return self.version_mapper.get_pubkey_accepted_algorithm(name)
        return []

    def get_pubkey_accepted_algorithm_path(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_pubkey_accepted_algorithm_path'):
            return self.version_mapper.get_pubkey_accepted_algorithm_path(name)
        return []

    def get_trusted_user_ca(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_trusted_user_ca'):
            return self.version_mapper.get_trusted_user_ca(name)
        return []

    def get_trusted_user_ca_path(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_trusted_user_ca_path'):
            return self.version_mapper.get_trusted_user_ca_path(name)
        return []
```

### v1.4 Overrides

**File:** `backend/vyos_mappers/ssh/ssh_versions/v1_4.py`

```python
class SSHMapperV1_4:
    """VyOS 1.4 SSH - uses 'ciphers' (plural), no fido/pubkey-accepted/trusted-ca."""

    def get_cipher(self, cipher: str) -> List[str]:
        """v1.4 uses 'ciphers' (plural)."""
        return ["service", "ssh", "ciphers", cipher]

    def get_cipher_path(self, cipher: str) -> List[str]:
        return ["service", "ssh", "ciphers", cipher]

    def get_cipher_config_key(self) -> str:
        return "ciphers"

    def has_fido(self) -> bool:
        return False

    def has_pubkey_accepted_algorithm(self) -> bool:
        return False

    def has_trusted_user_ca(self) -> bool:
        return False
```

### v1.5 Overrides

**File:** `backend/vyos_mappers/ssh/ssh_versions/v1_5.py`

```python
class SSHMapperV1_5:
    """VyOS 1.5 SSH - uses 'cipher' (singular), adds fido/pubkey/trusted-ca."""

    def get_cipher(self, cipher: str) -> List[str]:
        """v1.5 uses 'cipher' (singular)."""
        return ["service", "ssh", "cipher", cipher]

    def get_cipher_path(self, cipher: str) -> List[str]:
        return ["service", "ssh", "cipher", cipher]

    def get_cipher_config_key(self) -> str:
        return "cipher"

    def has_fido(self) -> bool:
        return True

    def has_pubkey_accepted_algorithm(self) -> bool:
        return True

    def has_trusted_user_ca(self) -> bool:
        return True

    def get_fido_pin_required(self) -> List[str]:
        return ["service", "ssh", "fido", "pin-required"]

    def get_fido_pin_required_path(self) -> List[str]:
        return ["service", "ssh", "fido", "pin-required"]

    def get_fido_touch_required(self) -> List[str]:
        return ["service", "ssh", "fido", "touch-required"]

    def get_fido_touch_required_path(self) -> List[str]:
        return ["service", "ssh", "fido", "touch-required"]

    def get_pubkey_accepted_algorithm(self, name: str) -> List[str]:
        return ["service", "ssh", "pubkey-accepted-algorithm", name]

    def get_pubkey_accepted_algorithm_path(self, name: str) -> List[str]:
        return ["service", "ssh", "pubkey-accepted-algorithm", name]

    def get_trusted_user_ca(self, name: str) -> List[str]:
        return ["service", "ssh", "trusted-user-ca", name]

    def get_trusted_user_ca_path(self, name: str) -> List[str]:
        return ["service", "ssh", "trusted-user-ca", name]
```

### Factory

**File:** `backend/vyos_mappers/ssh/ssh_versions/__init__.py`

```python
from .v1_4 import SSHMapperV1_4
from .v1_5 import SSHMapperV1_5

def get_ssh_mapper(version: str):
    from ..ssh import SSHMapper
    return SSHMapper(version)

__all__ = ["SSHMapperV1_4", "SSHMapperV1_5", "get_ssh_mapper"]
```

### Registration key: `"ssh"`

### Builder: `SSHBatchBuilder`

**File:** `backend/vyos_builders/ssh/ssh.py`

```python
class SSHBatchBuilder:
    """Batch builder for SSH service operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ssh"

    # Core batch ops (same as DHCP pattern)

    # Basic settings
    def set_port(self, port: str) -> "SSHBatchBuilder": ...
    def delete_port(self) -> "SSHBatchBuilder": ...
    def set_listen_address(self, address: str) -> "SSHBatchBuilder": ...
    def delete_listen_address(self, address: str) -> "SSHBatchBuilder": ...
    def set_disable_password_authentication(self) -> "SSHBatchBuilder": ...
    def delete_disable_password_authentication(self) -> "SSHBatchBuilder": ...
    def set_disable_host_validation(self) -> "SSHBatchBuilder": ...
    def delete_disable_host_validation(self) -> "SSHBatchBuilder": ...
    def set_loglevel(self, level: str) -> "SSHBatchBuilder": ...
    def delete_loglevel(self) -> "SSHBatchBuilder": ...
    def set_client_keepalive_interval(self, interval: str) -> "SSHBatchBuilder": ...
    def delete_client_keepalive_interval(self) -> "SSHBatchBuilder": ...
    def set_vrf(self, name: str) -> "SSHBatchBuilder": ...
    def delete_vrf(self) -> "SSHBatchBuilder": ...

    # Cipher (version-aware via mapper)
    def set_cipher(self, cipher: str) -> "SSHBatchBuilder": ...
    def delete_cipher(self, cipher: str) -> "SSHBatchBuilder": ...

    # Key exchange
    def set_key_exchange(self, kex: str) -> "SSHBatchBuilder": ...
    def delete_key_exchange(self, kex: str) -> "SSHBatchBuilder": ...

    # MAC
    def set_mac(self, mac: str) -> "SSHBatchBuilder": ...
    def delete_mac(self, mac: str) -> "SSHBatchBuilder": ...

    # Access control
    def set_access_control_allow_user(self, user: str) -> "SSHBatchBuilder": ...
    def delete_access_control_allow_user(self, user: str) -> "SSHBatchBuilder": ...
    def set_access_control_deny_user(self, user: str) -> "SSHBatchBuilder": ...
    def delete_access_control_deny_user(self, user: str) -> "SSHBatchBuilder": ...
    def set_access_control_allow_group(self, group: str) -> "SSHBatchBuilder": ...
    def delete_access_control_allow_group(self, group: str) -> "SSHBatchBuilder": ...
    def set_access_control_deny_group(self, group: str) -> "SSHBatchBuilder": ...
    def delete_access_control_deny_group(self, group: str) -> "SSHBatchBuilder": ...

    # Dynamic protection
    def set_dynamic_protection(self) -> "SSHBatchBuilder": ...
    def delete_dynamic_protection(self) -> "SSHBatchBuilder": ...
    def set_dynamic_protection_allow_from(self, address: str) -> "SSHBatchBuilder": ...
    def delete_dynamic_protection_allow_from(self, address: str) -> "SSHBatchBuilder": ...
    def set_dynamic_protection_block_time(self, seconds: str) -> "SSHBatchBuilder": ...
    def delete_dynamic_protection_block_time(self) -> "SSHBatchBuilder": ...
    def set_dynamic_protection_detect_time(self, seconds: str) -> "SSHBatchBuilder": ...
    def delete_dynamic_protection_detect_time(self) -> "SSHBatchBuilder": ...
    def set_dynamic_protection_threshold(self, count: str) -> "SSHBatchBuilder": ...
    def delete_dynamic_protection_threshold(self) -> "SSHBatchBuilder": ...

    # v1.5 only features
    def set_fido_pin_required(self) -> "SSHBatchBuilder": ...
    def delete_fido_pin_required(self) -> "SSHBatchBuilder": ...
    def set_fido_touch_required(self) -> "SSHBatchBuilder": ...
    def delete_fido_touch_required(self) -> "SSHBatchBuilder": ...
    def set_pubkey_accepted_algorithm(self, name: str) -> "SSHBatchBuilder": ...
    def delete_pubkey_accepted_algorithm(self, name: str) -> "SSHBatchBuilder": ...
    def set_trusted_user_ca(self, name: str) -> "SSHBatchBuilder": ...
    def delete_trusted_user_ca(self, name: str) -> "SSHBatchBuilder": ...

    # Capabilities
    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = "1.5" in self.version or "latest" in self.version
        mapper = self.mappers[self.mapper_key]
        return {
            "version": self.version,
            "cipher_key": mapper.get_cipher_config_key(),  # 'ciphers' or 'cipher'
            "has_fido": is_v15,
            "has_pubkey_accepted_algorithm": is_v15,
            "has_trusted_user_ca": is_v15,
            "fields": {
                "port":               {"supported": True, "description": "SSH port (default 22)"},
                "listen_addresses":   {"supported": True, "description": "Addresses to listen on"},
                "ciphers":            {"supported": True, "description": "Allowed ciphers"},
                "key_exchange":       {"supported": True, "description": "Allowed key exchange algorithms"},
                "mac":                {"supported": True, "description": "Allowed MAC algorithms"},
                "disable_password_authentication": {"supported": True, "description": "Require key-based auth"},
                "disable_host_validation": {"supported": True, "description": "Skip host key validation"},
                "loglevel":           {"supported": True, "description": "Logging level"},
                "client_keepalive_interval": {"supported": True, "description": "Keepalive interval"},
                "access_control":     {"supported": True, "description": "User/group allow/deny lists"},
                "dynamic_protection": {"supported": True, "description": "Brute-force protection"},
                "vrf":                {"supported": True, "description": "VRF to use"},
                "fido":               {"supported": is_v15, "description": "FIDO authentication (v1.5+)"},
                "pubkey_accepted_algorithm": {"supported": is_v15, "description": "Accepted pubkey algorithms (v1.5+)"},
                "trusted_user_ca":    {"supported": is_v15, "description": "Trusted CA keys (v1.5+)"},
            },
        }
```

### Supported Batch Operations Table

| Operation | Method | Args | Notes |
|-----------|--------|------|-------|
| `set_port` | `set_port(port)` | 1 | |
| `delete_port` | `delete_port()` | 0 | |
| `set_listen_address` | `set_listen_address(address)` | 1 | Multi-value |
| `delete_listen_address` | `delete_listen_address(address)` | 1 | |
| `set_cipher` | `set_cipher(cipher)` | 1 | Version-aware path |
| `delete_cipher` | `delete_cipher(cipher)` | 1 | |
| `set_key_exchange` | `set_key_exchange(kex)` | 1 | Multi-value |
| `delete_key_exchange` | `delete_key_exchange(kex)` | 1 | |
| `set_mac` | `set_mac(mac)` | 1 | Multi-value |
| `delete_mac` | `delete_mac(mac)` | 1 | |
| `set_disable_password_authentication` | (no args) | 0 | Flag |
| `delete_disable_password_authentication` | (no args) | 0 | |
| `set_disable_host_validation` | (no args) | 0 | Flag |
| `delete_disable_host_validation` | (no args) | 0 | |
| `set_loglevel` | `set_loglevel(level)` | 1 | quiet/fatal/error/info/verbose |
| `delete_loglevel` | `delete_loglevel()` | 0 | |
| `set_client_keepalive_interval` | `set_client_keepalive_interval(interval)` | 1 | |
| `delete_client_keepalive_interval` | `delete_client_keepalive_interval()` | 0 | |
| `set_vrf` | `set_vrf(name)` | 1 | |
| `delete_vrf` | `delete_vrf()` | 0 | |
| `set_access_control_allow_user` | `...(user)` | 1 | |
| `delete_access_control_allow_user` | `...(user)` | 1 | |
| `set_access_control_deny_user` | `...(user)` | 1 | |
| `delete_access_control_deny_user` | `...(user)` | 1 | |
| `set_access_control_allow_group` | `...(group)` | 1 | |
| `delete_access_control_allow_group` | `...(group)` | 1 | |
| `set_access_control_deny_group` | `...(group)` | 1 | |
| `delete_access_control_deny_group` | `...(group)` | 1 | |
| `set_dynamic_protection` | (no args) | 0 | Enable |
| `delete_dynamic_protection` | (no args) | 0 | Disable entire node |
| `set_dynamic_protection_allow_from` | `...(address)` | 1 | |
| `delete_dynamic_protection_allow_from` | `...(address)` | 1 | |
| `set_dynamic_protection_block_time` | `...(seconds)` | 1 | |
| `delete_dynamic_protection_block_time` | `...()` | 0 | |
| `set_dynamic_protection_detect_time` | `...(seconds)` | 1 | |
| `delete_dynamic_protection_detect_time` | `...()` | 0 | |
| `set_dynamic_protection_threshold` | `...(count)` | 1 | |
| `delete_dynamic_protection_threshold` | `...()` | 0 | |
| `set_fido_pin_required` | (no args) | 0 | v1.5 only |
| `delete_fido_pin_required` | (no args) | 0 | v1.5 only |
| `set_fido_touch_required` | (no args) | 0 | v1.5 only |
| `delete_fido_touch_required` | (no args) | 0 | v1.5 only |
| `set_pubkey_accepted_algorithm` | `...(name)` | 1 | v1.5 only |
| `delete_pubkey_accepted_algorithm` | `...(name)` | 1 | v1.5 only |
| `set_trusted_user_ca` | `...(name)` | 1 | v1.5 only |
| `delete_trusted_user_ca` | `...(name)` | 1 | v1.5 only |

### Router: `/vyos/ssh`

**File:** `backend/routers/ssh/ssh.py`

**Prefix:** `APIRouter(prefix="/vyos/ssh", tags=["ssh"])`

#### Pydantic Models

```python
class SSHDynamicProtection(BaseModel):
    """SSH dynamic protection (brute-force defense) config."""
    enabled: bool = False
    allow_from: List[str] = Field(default_factory=list)
    block_time: Optional[str] = None
    detect_time: Optional[str] = None
    threshold: Optional[str] = None


class SSHAccessControl(BaseModel):
    """SSH access control configuration."""
    allow_users: List[str] = Field(default_factory=list)
    deny_users: List[str] = Field(default_factory=list)
    allow_groups: List[str] = Field(default_factory=list)
    deny_groups: List[str] = Field(default_factory=list)


class SSHConfigResponse(BaseModel):
    """Full SSH service configuration."""
    port: Optional[str] = None
    listen_addresses: List[str] = Field(default_factory=list)
    ciphers: List[str] = Field(default_factory=list)
    key_exchange: List[str] = Field(default_factory=list)
    mac: List[str] = Field(default_factory=list)
    disable_password_authentication: bool = False
    disable_host_validation: bool = False
    loglevel: Optional[str] = None
    client_keepalive_interval: Optional[str] = None
    vrf: Optional[str] = None
    access_control: SSHAccessControl = Field(default_factory=SSHAccessControl)
    dynamic_protection: SSHDynamicProtection = Field(default_factory=SSHDynamicProtection)


class SSHBatchOperation(BaseModel):
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class SSHBatchRequest(BaseModel):
    item_name: str = Field(..., description="Primary item (address, cipher, user, ...)")
    operations: List[SSHBatchOperation]


class VyOSResponse(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
```

#### GET /capabilities

Returns `builder.get_capabilities()`. RBAC: `FeatureGroup.SSH`.

#### GET /config

Reads from `full_config["service"]["ssh"]` and normalizes:
- `port` -> scalar
- `listen-address` -> dict keys to list
- `ciphers` (v1.4) or `cipher` (v1.5) -> dict keys to list. **Use `mapper.get_cipher_config_key()` to determine key.**
- `key-exchange` -> dict keys to list
- `mac` -> dict keys to list
- `disable-password-authentication` -> presence check
- `disable-host-validation` -> presence check
- `loglevel` -> scalar
- `client-keepalive-interval` -> scalar
- `vrf` -> scalar
- `access-control` -> parse `allow`/`deny` -> `user`/`group` sub-dicts
- `dynamic-protection` -> parse presence + sub-keys (`allow-from`, `block-time`, `detect-time`, `threshold`)

#### POST /batch

Same pattern as System/DNS/NTP routers. Calls `ensure_snapshot_before_change()`.

### RBAC

**New FeatureGroup:** `SSH = "SSH"`

Child of `SERVICES` parent (or standalone). ADMIN: WRITE, OPERATOR: WRITE, VIEWER: READ.

---

## 4. Shared Infrastructure

### New FeatureGroups to Add

In `backend/rbac_permissions.py`, add to the `FeatureGroup` enum:

```python
# Services
SERVICES = "SERVICES"
DNS_FORWARDING = "DNS_FORWARDING"
NTP = "NTP"
SSH = "SSH"
```

Add `SERVICES` as parent that grants child permissions to `DNS_FORWARDING`, `NTP`, `SSH` (in `_apply_parent_child_permissions`).

Add all four to all built-in role permission maps:
- ADMIN: WRITE
- OPERATOR: WRITE
- VIEWER: READ

### File Structure

```
backend/
  vyos_mappers/
    dns_forwarding/
      __init__.py                          # exports DNSForwardingMapper
      dns_forwarding.py                    # DNSForwardingMapper class
      dns_forwarding_versions/
        __init__.py                        # factory + exports
        v1_4.py                            # DNSForwardingMapperV1_4
        v1_5.py                            # DNSForwardingMapperV1_5
    ntp/
      __init__.py                          # exports NTPMapper
      ntp.py                               # NTPMapper class
      ntp_versions/
        __init__.py                        # factory + exports
        v1_4.py                            # NTPMapperV1_4
        v1_5.py                            # NTPMapperV1_5
    ssh/
      __init__.py                          # exports SSHMapper
      ssh.py                               # SSHMapper class
      ssh_versions/
        __init__.py                        # factory + exports
        v1_4.py                            # SSHMapperV1_4
        v1_5.py                            # SSHMapperV1_5
  vyos_builders/
    dns_forwarding/
      __init__.py                          # exports DNSForwardingBatchBuilder
      dns_forwarding.py                    # DNSForwardingBatchBuilder
    ntp/
      __init__.py                          # exports NTPBatchBuilder
      ntp.py                               # NTPBatchBuilder
    ssh/
      __init__.py                          # exports SSHBatchBuilder
      ssh.py                               # SSHBatchBuilder
  routers/
    dns_forwarding/
      __init__.py                          # (empty)
      dns_forwarding.py                    # FastAPI router
    ntp/
      __init__.py                          # (empty)
      ntp.py                               # FastAPI router
    ssh/
      __init__.py                          # (empty)
      ssh.py                               # FastAPI router
```

---

## 5. Registration & Wiring

### Mapper Registration (`backend/vyos_mappers/__init__.py`)

Add these imports and registrations:

```python
from .dns_forwarding import DNSForwardingMapper
from .dns_forwarding.dns_forwarding_versions import get_dns_forwarding_mapper
from .ntp import NTPMapper
from .ntp.ntp_versions import get_ntp_mapper
from .ssh import SSHMapper
from .ssh.ssh_versions import get_ssh_mapper

# DNS Forwarding uses factory for version-specific mappers
CommandMapperRegistry.register_feature("dns_forwarding", get_dns_forwarding_mapper)
# NTP uses factory for version-specific mappers
CommandMapperRegistry.register_feature("ntp", get_ntp_mapper)
# SSH uses factory for version-specific mappers
CommandMapperRegistry.register_feature("ssh", get_ssh_mapper)
```

Add to `__all__`:
```python
"DNSForwardingMapper",
"NTPMapper",
"SSHMapper",
```

### Builder Registration (`backend/vyos_builders/__init__.py`)

Add these imports:

```python
from .dns_forwarding import DNSForwardingBatchBuilder
from .ntp import NTPBatchBuilder
from .ssh import SSHBatchBuilder
```

Add to `__all__`:
```python
"DNSForwardingBatchBuilder",
"NTPBatchBuilder",
"SSHBatchBuilder",
```

### Router Registration (`backend/app.py`)

Add these includes:

```python
from routers.dns_forwarding.dns_forwarding import router as dns_forwarding_router
from routers.ntp.ntp import router as ntp_router
from routers.ssh.ssh import router as ssh_router

app.include_router(dns_forwarding_router)
app.include_router(ntp_router)
app.include_router(ssh_router)
```

### Key Pattern Notes for Implementers

1. **Config parsing:** VyOS config JSON uses dicts for multi-value nodes (each key is a value, value is `{}` or sub-config). Always handle both `dict` and `list` types when parsing multi-value fields.

2. **Batch endpoint pattern:** Follow the System router pattern (`item_name` + operations), NOT the DHCP pattern (`network_name` + `subnet` + operations). The System pattern is cleaner for flat services.

3. **`ensure_snapshot_before_change`:** Import from `routers.config.config` and call before `service.execute_batch(builder)`:
   ```python
   from routers.config.config import ensure_snapshot_before_change

   current_config = await run_in_threadpool(service.get_full_config)
   ensure_snapshot_before_change(instance_id, current_config)
   ```

4. **`_INTERNAL_BUILDER_METHODS` blocklist:** Same frozenset as System router:
   ```python
   _INTERNAL_BUILDER_METHODS = frozenset({
       "add_set", "add_delete", "get_operations", "is_empty", "clear",
       "get_capabilities", "operation_count",
   })
   ```

5. **RBAC imports:**
   ```python
   from fastapi_permissions import require_read_permission, require_write_permission
   from rbac_permissions import FeatureGroup
   ```

6. **Service execution:** Use `await run_in_threadpool(service.execute_batch, builder)` for batch operations.

7. **Config path:** DNS Forwarding config lives at `full_config["service"]["dns"]["forwarding"]` (note: nested path through `dns` then `forwarding`). NTP at `full_config["service"]["ntp"]`. SSH at `full_config["service"]["ssh"]`.

8. **SSH cipher key difference:** The config parser MUST use `mapper.get_cipher_config_key()` to determine whether to look for `ciphers` or `cipher` in the config JSON. Do NOT hardcode either.
