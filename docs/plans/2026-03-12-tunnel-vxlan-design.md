# Tunnel & VXLAN Interface Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add tunnel (GRE, GRETAP, IPIP, SIT, ERSPAN) and VXLAN interface management to VyManager, following the existing three-layer backend pattern (Router → Builder → Mapper → pyvyos) and the frontend patterns established by the Ethernet interface implementation.

**Architecture:** Shared base layer with type-specific extensions. Common interface properties (addresses, description, MTU, disable, VRF, IP/IPv6 options) are factored into reusable mapper/builder methods that tunnel and VXLAN implementations compose. No inheritance hierarchy — each mapper/builder is self-contained (matching the existing Ethernet/Dummy pattern) but extracts common path patterns into helper methods.

**Tech Stack:** FastAPI (Python), Next.js (TypeScript), Tailwind CSS v4, shadcn/ui

**Key References:**
- `backend/vyos_mappers/interfaces/ethernet.py` — reference mapper (768 lines, extends `BaseFeatureMapper`)
- `backend/vyos_builders/interfaces/ethernet.py` — reference builder (914 lines, `EthernetInterfaceBuilderMixin`)
- `backend/routers/interfaces/ethernet.py` — reference router (1464 lines, `POST /batch` at line 689)
- `backend/vyos_mappers/__init__.py` — mapper registration (line 68: `CommandMapperRegistry.register_feature(...)`)
- `backend/vyos_builders/__init__.py` — builder aliases (line 37: `EthernetBatchBuilder = EthernetInterfaceBuilderMixin`)
- `backend/vyos_service.py` — batch creation methods (line 78: `create_ethernet_batch()`)
- `backend/app.py` — router inclusion (line 255: `app.include_router(ethernet.router)`)
- `frontend/src/lib/api/ethernet.ts` — service class pattern
- `frontend/src/lib/api/types/ethernet.ts` — type definitions pattern
- `frontend/src/components/network/ComprehensiveEthernetModal.tsx` — tabbed modal (1282 lines)
- `frontend/src/app/network/interfaces/page.tsx` — interfaces page (549 lines, currently ethernet-only)

---

### Task 0: Tunnel Interface Mapper

**Files:**
- Create: `backend/vyos_mappers/interfaces/tunnel.py`
- Test: `backend/tests/test_tunnel_mapper.py`

**Step 1: Write the failing test**

Create `backend/tests/test_tunnel_mapper.py`:

```python
import pytest
from vyos_mappers.interfaces.tunnel import TunnelInterfaceMapper


class TestTunnelMapperPaths:
    """Test CLI path generation for tunnel interfaces."""

    def setup_method(self):
        self.mapper = TunnelInterfaceMapper("1.5")

    # --- Common interface properties ---
    def test_description(self):
        assert self.mapper.get_description("tun0", "GRE tunnel") == [
            "interfaces", "tunnel", "tun0", "description", "GRE tunnel"
        ]

    def test_description_path(self):
        assert self.mapper.get_description_path("tun0") == [
            "interfaces", "tunnel", "tun0", "description"
        ]

    def test_address(self):
        assert self.mapper.get_address("tun0", "10.0.0.1/30") == [
            "interfaces", "tunnel", "tun0", "address", "10.0.0.1/30"
        ]

    def test_mtu(self):
        assert self.mapper.get_mtu("tun0", "1476") == [
            "interfaces", "tunnel", "tun0", "mtu", "1476"
        ]

    def test_mtu_path(self):
        assert self.mapper.get_mtu_path("tun0") == [
            "interfaces", "tunnel", "tun0", "mtu"
        ]

    def test_disable(self):
        assert self.mapper.get_disable("tun0") == [
            "interfaces", "tunnel", "tun0", "disable"
        ]

    def test_vrf(self):
        assert self.mapper.get_vrf("tun0", "MGMT") == [
            "interfaces", "tunnel", "tun0", "vrf", "MGMT"
        ]

    def test_interface_path(self):
        assert self.mapper.get_interface("tun0") == [
            "interfaces", "tunnel", "tun0"
        ]

    # --- IP options ---
    def test_ip_adjust_mss(self):
        assert self.mapper.get_ip_adjust_mss("tun0", "1400") == [
            "interfaces", "tunnel", "tun0", "ip", "adjust-mss", "1400"
        ]

    def test_ip_source_validation(self):
        assert self.mapper.get_ip_source_validation("tun0", "strict") == [
            "interfaces", "tunnel", "tun0", "ip", "source-validation", "strict"
        ]

    def test_ip_enable_arp_accept(self):
        assert self.mapper.get_ip_enable_arp_accept("tun0") == [
            "interfaces", "tunnel", "tun0", "ip", "enable-arp-accept"
        ]

    # --- IPv6 options ---
    def test_ipv6_disable_forwarding(self):
        assert self.mapper.get_ipv6_disable_forwarding("tun0") == [
            "interfaces", "tunnel", "tun0", "ipv6", "disable-forwarding"
        ]

    def test_ipv6_adjust_mss(self):
        assert self.mapper.get_ipv6_adjust_mss("tun0", "1400") == [
            "interfaces", "tunnel", "tun0", "ipv6", "adjust-mss", "1400"
        ]

    # --- Tunnel-specific ---
    def test_encapsulation(self):
        assert self.mapper.get_encapsulation("tun0", "gre") == [
            "interfaces", "tunnel", "tun0", "encapsulation", "gre"
        ]

    def test_source_address(self):
        assert self.mapper.get_source_address("tun0", "192.168.1.1") == [
            "interfaces", "tunnel", "tun0", "source-address", "192.168.1.1"
        ]

    def test_source_address_path(self):
        assert self.mapper.get_source_address_path("tun0") == [
            "interfaces", "tunnel", "tun0", "source-address"
        ]

    def test_remote(self):
        assert self.mapper.get_remote("tun0", "10.0.0.2") == [
            "interfaces", "tunnel", "tun0", "remote", "10.0.0.2"
        ]

    def test_remote_path(self):
        assert self.mapper.get_remote_path("tun0") == [
            "interfaces", "tunnel", "tun0", "remote"
        ]

    def test_source_interface(self):
        assert self.mapper.get_source_interface("tun0", "eth0") == [
            "interfaces", "tunnel", "tun0", "source-interface", "eth0"
        ]

    def test_source_interface_path(self):
        assert self.mapper.get_source_interface_path("tun0") == [
            "interfaces", "tunnel", "tun0", "source-interface"
        ]

    def test_enable_multicast(self):
        assert self.mapper.get_enable_multicast("tun0") == [
            "interfaces", "tunnel", "tun0", "enable-multicast"
        ]

    def test_parameters_ip_ttl(self):
        assert self.mapper.get_parameters_ip_ttl("tun0", "64") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "ttl", "64"
        ]

    def test_parameters_ip_ttl_path(self):
        assert self.mapper.get_parameters_ip_ttl_path("tun0") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "ttl"
        ]

    def test_parameters_ip_tos(self):
        assert self.mapper.get_parameters_ip_tos("tun0", "inherit") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "tos", "inherit"
        ]

    def test_parameters_ip_key(self):
        assert self.mapper.get_parameters_ip_key("tun0", "1") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "key", "1"
        ]

    def test_parameters_ip_key_path(self):
        assert self.mapper.get_parameters_ip_key_path("tun0") == [
            "interfaces", "tunnel", "tun0", "parameters", "ip", "key"
        ]

    def test_erspan_direction(self):
        assert self.mapper.get_erspan_direction("tun0", "ingress") == [
            "interfaces", "tunnel", "tun0", "parameters", "erspan", "direction", "ingress"
        ]

    def test_erspan_idx(self):
        assert self.mapper.get_erspan_idx("tun0", "1") == [
            "interfaces", "tunnel", "tun0", "parameters", "erspan", "idx", "1"
        ]

    def test_erspan_version(self):
        assert self.mapper.get_erspan_version("tun0", "2") == [
            "interfaces", "tunnel", "tun0", "parameters", "erspan", "version", "2"
        ]


class TestTunnelMapperParsing:
    """Test config parsing for tunnel interfaces."""

    def setup_method(self):
        self.mapper = TunnelInterfaceMapper("1.5")

    def test_parse_single_interface(self):
        config = {
            "address": ["10.0.0.1/30"],
            "description": "GRE to datacenter",
            "encapsulation": "gre",
            "source-address": "192.168.1.1",
            "remote": "10.10.10.1",
            "mtu": "1476",
        }
        result = self.mapper.parse_single_interface("tun0", config)
        assert result["name"] == "tun0"
        assert result["type"] == "tunnel"
        assert result["addresses"] == ["10.0.0.1/30"]
        assert result["description"] == "GRE to datacenter"
        assert result["encapsulation"] == "gre"
        assert result["source_address"] == "192.168.1.1"
        assert result["remote"] == "10.10.10.1"
        assert result["mtu"] == "1476"

    def test_parse_disabled_interface(self):
        config = {"encapsulation": "ipip", "disable": {}}
        result = self.mapper.parse_single_interface("tun1", config)
        assert result["disable"] is True

    def test_parse_erspan_parameters(self):
        config = {
            "encapsulation": "erspan",
            "parameters": {
                "erspan": {"direction": "ingress", "idx": "1", "version": "2"}
            },
        }
        result = self.mapper.parse_single_interface("tun2", config)
        assert result["parameters"]["erspan"]["direction"] == "ingress"
        assert result["parameters"]["erspan"]["idx"] == "1"
        assert result["parameters"]["erspan"]["version"] == "2"

    def test_parse_interfaces_of_type(self):
        config = {
            "tun0": {"encapsulation": "gre", "address": "10.0.0.1/30"},
            "tun1": {"encapsulation": "ipip"},
        }
        result = self.mapper.parse_interfaces_of_type(config)
        assert result["total"] == 2
        assert len(result["interfaces"]) == 2
        assert result["by_type"]["tunnel"] == 2
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest tests/test_tunnel_mapper.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'vyos_mappers.interfaces.tunnel'`

**Step 3: Write minimal implementation**

Create `backend/vyos_mappers/interfaces/tunnel.py`:

```python
"""
Tunnel Interface Command Mapper

Handles tunnel-specific interface commands (GRE, GRETAP, IPIP, SIT, ERSPAN).
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class TunnelInterfaceMapper(BaseFeatureMapper):
    """Tunnel interface mapper with all tunnel interface operations"""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "tunnel"

    # ========================================================================
    # Common Interface Properties (same pattern as ethernet.py)
    # ========================================================================

    def get_description(self, interface: str, description: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "address", address]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "mtu"]

    def get_interface(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface]

    def get_disable(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "vrf", vrf]

    # --- IP Options ---
    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "arp-cache-timeout", timeout]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "disable-arp-filter"]

    def get_ip_enable_arp_accept(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-accept"]

    def get_ip_enable_arp_announce(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-announce"]

    def get_ip_enable_arp_ignore(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-ignore"]

    def get_ip_enable_proxy_arp(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "enable-proxy-arp"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ip", "source-validation"]

    # --- IPv6 Options ---
    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "ipv6", "dup-addr-detect-transmits", count]

    # ========================================================================
    # Tunnel-Specific Properties
    # ========================================================================

    def get_encapsulation(self, interface: str, encap: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "encapsulation", encap]

    def get_source_address(self, interface: str, address: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "source-address", address]

    def get_source_address_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "source-address"]

    def get_remote(self, interface: str, remote: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "remote", remote]

    def get_remote_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "remote"]

    def get_source_interface(self, interface: str, iface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "source-interface", iface]

    def get_source_interface_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "source-interface"]

    def get_enable_multicast(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "enable-multicast"]

    # --- Parameters: IP ---
    def get_parameters_ip_ttl(self, interface: str, ttl: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "ttl", ttl]

    def get_parameters_ip_ttl_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "ttl"]

    def get_parameters_ip_tos(self, interface: str, tos: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "tos", tos]

    def get_parameters_ip_tos_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "tos"]

    def get_parameters_ip_key(self, interface: str, key: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "key", key]

    def get_parameters_ip_key_path(self, interface: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "ip", "key"]

    # --- Parameters: ERSPAN ---
    def get_erspan_direction(self, interface: str, direction: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "erspan", "direction", direction]

    def get_erspan_idx(self, interface: str, idx: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "erspan", "idx", idx]

    def get_erspan_version(self, interface: str, version: str) -> List[str]:
        return ["interfaces", self.interface_type, interface, "parameters", "erspan", "version", version]

    # ========================================================================
    # Config Parsing Methods
    # ========================================================================

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

    def _parse_ip_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        ip = config.get("ip", {})
        if not ip:
            return None
        return {
            "adjust_mss": ip.get("adjust-mss"),
            "arp_cache_timeout": ip.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in ip,
            "enable_arp_accept": "enable-arp-accept" in ip,
            "enable_arp_announce": "enable-arp-announce" in ip,
            "enable_arp_ignore": "enable-arp-ignore" in ip,
            "enable_proxy_arp": "enable-proxy-arp" in ip,
            "source_validation": ip.get("source-validation"),
        }

    def _parse_ipv6_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        ipv6 = config.get("ipv6", {})
        if not ipv6:
            return None
        return {
            "adjust_mss": ipv6.get("adjust-mss"),
            "disable_forwarding": "disable-forwarding" in ipv6,
            "dup_addr_detect_transmits": ipv6.get("dup-addr-detect-transmits"),
        }

    def _parse_parameters(self, config: Dict[str, Any]) -> Dict[str, Any]:
        params = config.get("parameters", {})
        if not params:
            return None
        result = {}
        ip_params = params.get("ip", {})
        if ip_params:
            result["ip"] = {
                "ttl": ip_params.get("ttl"),
                "tos": ip_params.get("tos"),
                "key": ip_params.get("key"),
            }
        erspan_params = params.get("erspan", {})
        if erspan_params:
            result["erspan"] = {
                "direction": erspan_params.get("direction"),
                "idx": erspan_params.get("idx"),
                "version": erspan_params.get("version"),
            }
        return result if result else None

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        addresses = self._parse_addresses(config)
        disabled = "disable" in config

        return {
            "name": name,
            "type": self.interface_type,
            "addresses": addresses,
            "description": config.get("description"),
            "vrf": config.get("vrf"),
            "mtu": config.get("mtu"),
            "disable": disabled if disabled else None,
            "encapsulation": config.get("encapsulation"),
            "source_address": config.get("source-address"),
            "remote": config.get("remote"),
            "source_interface": config.get("source-interface"),
            "enable_multicast": "enable-multicast" in config,
            "ip": self._parse_ip_config(config),
            "ipv6": self._parse_ipv6_config(config),
            "parameters": self._parse_parameters(config),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        interfaces = []
        by_vrf = {}

        for iface_name, iface_config in config.items():
            if not isinstance(iface_config, dict):
                continue
            interface = self.parse_single_interface(iface_name, iface_config)
            interfaces.append(interface)
            if interface.get("vrf"):
                vrf = interface["vrf"]
                by_vrf[vrf] = by_vrf.get(vrf, 0) + 1

        return {
            "interfaces": interfaces,
            "total": len(interfaces),
            "by_type": {self.interface_type: len(interfaces)},
            "by_vrf": by_vrf,
        }
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest tests/test_tunnel_mapper.py -v`
Expected: All tests PASS

**Step 5: Create version-specific mapper files**

Create `backend/vyos_mappers/interfaces/tunnel_versions/__init__.py`:

```python
"""Tunnel Interface Mapper - Version-Specific Implementations"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..tunnel import TunnelInterfaceMapper


def get_tunnel_mapper(version: str) -> "TunnelInterfaceMapper":
    from .v1_4 import TunnelMapper_v1_4
    from .v1_5 import TunnelMapper_v1_5

    version_map = {
        "1.4": TunnelMapper_v1_4,
        "1.5": TunnelMapper_v1_5,
    }
    mapper_class = version_map.get(version, TunnelMapper_v1_5)
    return mapper_class(version)


__all__ = ["get_tunnel_mapper"]
```

Create `backend/vyos_mappers/interfaces/tunnel_versions/v1_4.py`:

```python
"""Tunnel Interface Mapper - VyOS 1.4"""

from ..tunnel import TunnelInterfaceMapper


class TunnelMapper_v1_4(TunnelInterfaceMapper):
    """VyOS 1.4 tunnel interface mapper. Inherits all base methods."""
    pass
```

Create `backend/vyos_mappers/interfaces/tunnel_versions/v1_5.py`:

```python
"""Tunnel Interface Mapper - VyOS 1.5"""

from ..tunnel import TunnelInterfaceMapper


class TunnelMapper_v1_5(TunnelInterfaceMapper):
    """VyOS 1.5 tunnel interface mapper. Inherits all base methods."""
    pass
```

**Step 6: Register mapper and update `__init__` files**

Modify `backend/vyos_mappers/interfaces/__init__.py` — add `TunnelInterfaceMapper` import and export.

Modify `backend/vyos_mappers/__init__.py`:
- Add import: `from .interfaces.tunnel_versions import get_tunnel_mapper`
- Add import: `from .interfaces import TunnelInterfaceMapper`
- Add registration: `CommandMapperRegistry.register_feature("interface_tunnel", get_tunnel_mapper)`
- Add to `__all__`: `"TunnelInterfaceMapper"`

**Step 7: Run all tests**

Run: `cd backend && python3 -m pytest -v`
Expected: All PASS

**Step 8: Commit**

```bash
git add backend/vyos_mappers/interfaces/tunnel.py backend/vyos_mappers/interfaces/tunnel_versions/ backend/tests/test_tunnel_mapper.py backend/vyos_mappers/interfaces/__init__.py backend/vyos_mappers/__init__.py
git commit -m "feat: add tunnel interface mapper with version support"
```

---

### Task 1: Tunnel Interface Builder

**Files:**
- Create: `backend/vyos_builders/interfaces/tunnel.py`
- Test: `backend/tests/test_tunnel_builder.py`

**Step 1: Write the failing test**

Create `backend/tests/test_tunnel_builder.py`:

```python
import pytest
from vyos_builders.interfaces.tunnel import TunnelInterfaceBuilderMixin


class TestTunnelBuilder:
    def setup_method(self):
        self.builder = TunnelInterfaceBuilderMixin("1.5")

    def test_empty_batch(self):
        assert self.builder.is_empty()
        assert self.builder.operation_count() == 0

    def test_set_encapsulation(self):
        self.builder.set_encapsulation("tun0", "gre")
        ops = self.builder.get_operations()
        assert len(ops) == 1
        assert ops[0] == {"op": "set", "path": ["interfaces", "tunnel", "tun0", "encapsulation", "gre"]}

    def test_set_source_address(self):
        self.builder.set_source_address("tun0", "192.168.1.1")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "tunnel", "tun0", "source-address", "192.168.1.1"]

    def test_set_remote(self):
        self.builder.set_remote("tun0", "10.0.0.2")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "tunnel", "tun0", "remote", "10.0.0.2"]

    def test_set_description(self):
        self.builder.set_interface_description("tun0", "GRE tunnel")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "tunnel", "tun0", "description", "GRE tunnel"]

    def test_set_address(self):
        self.builder.set_interface_address("tun0", "10.0.0.1/30")
        ops = self.builder.get_operations()
        assert ops[0]["path"] == ["interfaces", "tunnel", "tun0", "address", "10.0.0.1/30"]

    def test_chainable_api(self):
        result = (
            self.builder
            .set_encapsulation("tun0", "gre")
            .set_source_address("tun0", "192.168.1.1")
            .set_remote("tun0", "10.0.0.2")
            .set_interface_description("tun0", "My tunnel")
            .set_interface_address("tun0", "10.0.0.1/30")
        )
        assert result is self.builder
        assert self.builder.operation_count() == 5

    def test_delete_operations(self):
        self.builder.delete_interface_description("tun0")
        self.builder.delete_source_address("tun0")
        ops = self.builder.get_operations()
        assert all(op["op"] == "delete" for op in ops)

    def test_erspan_parameters(self):
        self.builder.set_erspan_direction("tun0", "ingress")
        self.builder.set_erspan_idx("tun0", "1")
        self.builder.set_erspan_version("tun0", "2")
        ops = self.builder.get_operations()
        assert len(ops) == 3
        assert ops[0]["path"][-2:] == ["direction", "ingress"]

    def test_ttl_tos_key(self):
        self.builder.set_parameters_ip_ttl("tun0", "64")
        self.builder.set_parameters_ip_tos("tun0", "inherit")
        self.builder.set_parameters_ip_key("tun0", "42")
        ops = self.builder.get_operations()
        assert len(ops) == 3

    def test_clear(self):
        self.builder.set_encapsulation("tun0", "gre")
        self.builder.clear()
        assert self.builder.is_empty()

    def test_delete_interface(self):
        self.builder.delete_interface("tun0")
        ops = self.builder.get_operations()
        assert ops[0] == {"op": "delete", "path": ["interfaces", "tunnel", "tun0"]}
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest tests/test_tunnel_builder.py -v`
Expected: FAIL with `ModuleNotFoundError`

**Step 3: Write minimal implementation**

Create `backend/vyos_builders/interfaces/tunnel.py` following the pattern from `dummy.py` (lines 1-128). The builder uses `self.interface_mapper_key = "interface_tunnel"` and calls mapper methods via `self.mappers[self.interface_mapper_key]`.

Include all common interface methods (description, address, mtu, disable, vrf, IP/IPv6 options) plus tunnel-specific methods (encapsulation, source-address, remote, source-interface, enable-multicast, parameters/ip/ttl/tos/key, parameters/erspan/direction/idx/version).

**Step 4: Run test to verify it passes**

Run: `cd backend && python3 -m pytest tests/test_tunnel_builder.py -v`

**Step 5: Register builder**

Modify `backend/vyos_builders/interfaces/__init__.py` — add `TunnelInterfaceBuilderMixin` import and export.

Modify `backend/vyos_builders/__init__.py`:
- Add import: `from .interfaces import TunnelInterfaceBuilderMixin`
- Add alias: `TunnelBatchBuilder = TunnelInterfaceBuilderMixin`
- Add to `__all__`: `"TunnelBatchBuilder"`

Modify `backend/vyos_service.py`:
- Add import: `TunnelBatchBuilder` (line 16-24)
- Add method: `create_tunnel_batch() -> TunnelBatchBuilder` (after line 92)
- Add `TunnelBatchBuilder` to `execute_batch()` Union type (line 119-127)

**Step 6: Run all tests**

Run: `cd backend && python3 -m pytest -v`

**Step 7: Commit**

```bash
git add backend/vyos_builders/interfaces/tunnel.py backend/tests/test_tunnel_builder.py backend/vyos_builders/interfaces/__init__.py backend/vyos_builders/__init__.py backend/vyos_service.py
git commit -m "feat: add tunnel interface batch builder"
```

---

### Task 2: Tunnel Interface Router

**Files:**
- Create: `backend/routers/interfaces/tunnel.py`
- Modify: `backend/routers/interfaces/__init__.py`
- Modify: `backend/app.py`

**Step 1: Write the router**

Create `backend/routers/interfaces/tunnel.py` following the pattern from `ethernet.py`. Key differences:

- `router = APIRouter(prefix="/vyos/tunnel", tags=["tunnel-interface"])`
- Response model `TunnelInterfacesConfigResponse` with tunnel-specific fields
- `GET /capabilities` — return tunnel-specific features (encapsulation types, parameters)
- `GET /config` — fetch `full_config.get("interfaces", {}).get("tunnel", {})`, parse with `TunnelInterfaceMapper`
- `POST /batch` — map operations to builder methods, execute via `service.create_tunnel_batch()`

Batch operations to support:
- Common: `set_description`, `delete_description`, `set_address`, `delete_address`, `set_mtu`, `delete_mtu`, `disable`, `enable`, `set_vrf`, `delete_vrf`, `delete_interface`
- IP: `set_ip_adjust_mss`, `set_ip_adjust_mss_clamp_to_pmtu`, `set_ip_arp_cache_timeout`, `set_ip_enable_arp_accept`, etc.
- IPv6: `set_ipv6_adjust_mss`, `set_ipv6_disable_forwarding`, `set_ipv6_dup_addr_detect_transmits`
- Tunnel-specific: `set_encapsulation`, `set_source_address`, `delete_source_address`, `set_remote`, `delete_remote`, `set_source_interface`, `delete_source_interface`, `set_enable_multicast`, `delete_enable_multicast`, `set_parameters_ip_ttl`, `delete_parameters_ip_ttl`, `set_parameters_ip_tos`, `delete_parameters_ip_tos`, `set_parameters_ip_key`, `delete_parameters_ip_key`, `set_erspan_direction`, `set_erspan_idx`, `set_erspan_version`

**Step 2: Register router**

Modify `backend/routers/interfaces/__init__.py`:
- Add: `from . import tunnel`
- Update `__all__`

Modify `backend/app.py`:
- Add import (after line 16): `from routers.interfaces import tunnel`
- Add inclusion (after line 256): `app.include_router(tunnel.router)`

**Step 3: Run all tests**

Run: `cd backend && python3 -m pytest -v`

**Step 4: Commit**

```bash
git add backend/routers/interfaces/tunnel.py backend/routers/interfaces/__init__.py backend/app.py
git commit -m "feat: add tunnel interface API router with batch endpoint"
```

---

### Task 3: VXLAN Interface Mapper

**Files:**
- Create: `backend/vyos_mappers/interfaces/vxlan.py`
- Create: `backend/vyos_mappers/interfaces/vxlan_versions/__init__.py`
- Create: `backend/vyos_mappers/interfaces/vxlan_versions/v1_4.py`
- Create: `backend/vyos_mappers/interfaces/vxlan_versions/v1_5.py`
- Test: `backend/tests/test_vxlan_mapper.py`

**Step 1: Write the failing test**

Create `backend/tests/test_vxlan_mapper.py` with tests covering:
- Common properties: description, address, mtu, disable, vrf, interface path
- IP/IPv6 options: adjust-mss, source-validation, disable-forwarding, etc.
- VXLAN-specific: vni, source-address, remote, group, port, source-interface, gpe, external, parameters/nolearning, parameters/neighbor-suppress
- Config parsing: parse_single_interface with VNI, remotes (string and list), group, parameters
- parse_interfaces_of_type aggregation

Pattern: Same structure as `test_tunnel_mapper.py` but with VXLAN paths (`["interfaces", "vxlan", ...]`).

**Step 2: Run test to verify it fails**

Run: `cd backend && python3 -m pytest tests/test_vxlan_mapper.py -v`

**Step 3: Write VXLAN mapper**

Create `backend/vyos_mappers/interfaces/vxlan.py` — same structure as tunnel mapper but with:
- `self.interface_type = "vxlan"`
- VXLAN-specific path methods: `get_vni`, `get_group`, `get_port`, `get_port_path`, `get_gpe`, `get_external`, `get_parameters_nolearning`, `get_parameters_neighbor_suppress`
- Note: `get_remote` returns per-remote path (VXLAN supports multiple remotes as separate `set` commands)
- Config parsing handles `remote` as both string and list (VyOS returns list when multiple)

Create version files (`vxlan_versions/__init__.py`, `v1_4.py`, `v1_5.py`) following tunnel pattern.

**Step 4: Register mapper**

Update `backend/vyos_mappers/interfaces/__init__.py` and `backend/vyos_mappers/__init__.py` with VXLAN imports and registration: `CommandMapperRegistry.register_feature("interface_vxlan", get_vxlan_mapper)`

**Step 5: Run all tests**

Run: `cd backend && python3 -m pytest -v`

**Step 6: Commit**

```bash
git add backend/vyos_mappers/interfaces/vxlan.py backend/vyos_mappers/interfaces/vxlan_versions/ backend/tests/test_vxlan_mapper.py backend/vyos_mappers/interfaces/__init__.py backend/vyos_mappers/__init__.py
git commit -m "feat: add VXLAN interface mapper with version support"
```

---

### Task 4: VXLAN Interface Builder and Router

**Files:**
- Create: `backend/vyos_builders/interfaces/vxlan.py`
- Create: `backend/routers/interfaces/vxlan.py`
- Test: `backend/tests/test_vxlan_builder.py`
- Modify: `backend/vyos_builders/interfaces/__init__.py`
- Modify: `backend/vyos_builders/__init__.py`
- Modify: `backend/vyos_service.py`
- Modify: `backend/routers/interfaces/__init__.py`
- Modify: `backend/app.py`

**Step 1: Write builder test**

Create `backend/tests/test_vxlan_builder.py` covering:
- `set_vni`, `set_source_address`, `set_remote`, `set_group`, `set_port`, `set_source_interface`, `set_gpe`, `set_external`, `set_nolearning`, `set_neighbor_suppress`
- Delete counterparts
- Common operations: description, address, mtu, disable, vrf
- Chainable API test
- Clear test

**Step 2: Write builder**

Create `backend/vyos_builders/interfaces/vxlan.py` — `VxlanInterfaceBuilderMixin` with `self.interface_mapper_key = "interface_vxlan"`. Include all common interface methods plus VXLAN-specific.

**Step 3: Write router**

Create `backend/routers/interfaces/vxlan.py`:
- `router = APIRouter(prefix="/vyos/vxlan", tags=["vxlan-interface"])`
- Endpoints: `GET /capabilities`, `GET /config`, `POST /batch`
- Config path: `full_config.get("interfaces", {}).get("vxlan", {})`

Batch operations: all common + `set_vni`, `set_source_address`, `delete_source_address`, `set_remote`, `delete_remote`, `set_group`, `delete_group`, `set_port`, `delete_port`, `set_source_interface`, `delete_source_interface`, `set_gpe`, `delete_gpe`, `set_external`, `delete_external`, `set_nolearning`, `delete_nolearning`, `set_neighbor_suppress`, `delete_neighbor_suppress`

**Step 4: Register everything**

- Builder: update `__init__` files, add `VxlanBatchBuilder` alias, add `create_vxlan_batch()` to `VyOSService`, add to `execute_batch()` Union
- Router: update `__init__` files, add `app.include_router(vxlan.router)` to `app.py`

**Step 5: Run all tests**

Run: `cd backend && python3 -m pytest -v`

**Step 6: Commit**

```bash
git add backend/vyos_builders/interfaces/vxlan.py backend/routers/interfaces/vxlan.py backend/tests/test_vxlan_builder.py backend/vyos_builders/interfaces/__init__.py backend/vyos_builders/__init__.py backend/vyos_service.py backend/routers/interfaces/__init__.py backend/app.py
git commit -m "feat: add VXLAN interface builder and API router"
```

---

### Task 5: Frontend Tunnel Types and Service

**Files:**
- Create: `frontend/src/lib/api/types/tunnel.ts`
- Create: `frontend/src/lib/api/tunnel.ts`

**Step 1: Create tunnel types**

Create `frontend/src/lib/api/types/tunnel.ts`:

```typescript
/**
 * TypeScript types for Tunnel Interface API
 */

export type TunnelEncapsulation = "gre" | "gretap" | "ipip" | "sit" | "erspan";

export interface IPConfig {
  adjust_mss?: string | null;
  arp_cache_timeout?: string | null;
  disable_arp_filter?: boolean | null;
  enable_arp_accept?: boolean | null;
  enable_arp_announce?: boolean | null;
  enable_arp_ignore?: boolean | null;
  enable_proxy_arp?: boolean | null;
  source_validation?: string | null;
}

export interface IPv6Config {
  adjust_mss?: string | null;
  disable_forwarding?: boolean | null;
  dup_addr_detect_transmits?: string | null;
}

export interface TunnelParameters {
  ip?: { ttl?: string | null; tos?: string | null; key?: string | null } | null;
  erspan?: { direction?: string | null; idx?: string | null; version?: string | null } | null;
}

export interface TunnelInterface {
  name: string;
  type: string;
  addresses: string[];
  description?: string | null;
  vrf?: string | null;
  mtu?: string | null;
  disable?: boolean | null;
  encapsulation?: string | null;
  source_address?: string | null;
  remote?: string | null;
  source_interface?: string | null;
  enable_multicast?: boolean | null;
  ip?: IPConfig | null;
  ipv6?: IPv6Config | null;
  parameters?: TunnelParameters | null;
}

export interface TunnelConfigResponse {
  interfaces: TunnelInterface[];
  total: number;
  by_type: Record<string, number>;
  by_vrf: Record<string, number>;
}

export interface TunnelCapabilities {
  version: string;
  version_number: number;
  features: Record<string, Record<string, boolean> | boolean>;
  encapsulation_types: TunnelEncapsulation[];
}

export interface BatchOperation {
  op: string;
  value?: string;
}

export interface BatchRequest {
  interface: string;
  operations: BatchOperation[];
}

export interface VyOSResponse {
  success: boolean;
  data?: Record<string, unknown> | null;
  error?: string | null;
}
```

**Step 2: Create tunnel service**

Create `frontend/src/lib/api/tunnel.ts`:

```typescript
/**
 * Tunnel Interface API Service
 */

import { apiClient } from "./client";
import type {
  TunnelConfigResponse,
  TunnelCapabilities,
  BatchRequest,
  VyOSResponse,
  BatchOperation,
} from "./types/tunnel";

class TunnelService {
  async getCapabilities(): Promise<TunnelCapabilities> {
    return apiClient.get<TunnelCapabilities>("/vyos/tunnel/capabilities");
  }

  async getConfig(): Promise<TunnelConfigResponse> {
    return apiClient.get<TunnelConfigResponse>("/vyos/tunnel/config");
  }

  async batchConfigure(request: BatchRequest): Promise<VyOSResponse> {
    return apiClient.post<VyOSResponse>("/vyos/tunnel/batch", request);
  }

  async deleteInterface(interfaceName: string): Promise<VyOSResponse> {
    return this.batchConfigure({
      interface: interfaceName,
      operations: [{ op: "delete_interface" }],
    });
  }

  async refreshConfig(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/vyos/config/refresh");
  }
}

export const tunnelService = new TunnelService();
```

**Step 3: Commit**

```bash
git add frontend/src/lib/api/types/tunnel.ts frontend/src/lib/api/tunnel.ts
git commit -m "feat: add tunnel interface frontend types and service"
```

---

### Task 6: Frontend VXLAN Types and Service

**Files:**
- Create: `frontend/src/lib/api/types/vxlan.ts`
- Create: `frontend/src/lib/api/vxlan.ts`

Same pattern as Task 5 but with VXLAN-specific types:
- `VxlanInterface` with `vni`, `source_address`, `remote` (string[]), `group`, `port`, `source_interface`, `gpe`, `external`, `parameters.nolearning`, `parameters.neighbor_suppress`
- `VxlanConfigResponse`, `VxlanCapabilities`, `BatchOperation`, `BatchRequest`, `VyOSResponse`
- `VxlanService` class with `getCapabilities`, `getConfig`, `batchConfigure`, `deleteInterface`, `refreshConfig`

**Commit:**

```bash
git add frontend/src/lib/api/types/vxlan.ts frontend/src/lib/api/vxlan.ts
git commit -m "feat: add VXLAN interface frontend types and service"
```

---

### Task 7: Tunnel Interface Modal

**Files:**
- Create: `frontend/src/components/network/TunnelModal.tsx`

**Step 1: Write the modal component**

Create `frontend/src/components/network/TunnelModal.tsx` following the pattern from `ComprehensiveEthernetModal.tsx`. Key structure:

**Props:**
```typescript
interface TunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tunnel?: TunnelInterface | null;
  capabilities: TunnelCapabilities | null;
  onSuccess: () => void;
  mode: "create" | "edit";
}
```

**Tabs:**
1. **General** — interface name input (create: `tun` prefix + number, edit: readonly), encapsulation Select (GRE/GRETAP/IPIP/SIT/ERSPAN, create-only), source-address Input, remote Input, source-interface Input
2. **Addresses** — dynamic address list with add/remove buttons
3. **Parameters** — conditionally rendered based on encapsulation:
   - Always: TTL Input, TOS Input
   - GRE/GRETAP: Key Input
   - ERSPAN: Direction Select (ingress/egress), Index Input, Version Select (1/2)
4. **Common** — description Textarea, MTU Input, VRF Input, disable Checkbox

**Form state:** Individual `useState` hooks matching the ethernet modal pattern (lines 45-123 of `ComprehensiveEthernetModal.tsx`).

**buildOperations()** — build batch operations array from form state, diffing current vs. original for edit mode. Pattern: `addIfChanged(field, op_name, value)` helper.

**handleSubmit()** — validate required fields (encapsulation for create), call `tunnelService.batchConfigure()`, call `onSuccess()`, close modal.

**Step 2: Commit**

```bash
git add frontend/src/components/network/TunnelModal.tsx
git commit -m "feat: add tunnel interface modal component"
```

---

### Task 8: VXLAN Interface Modal

**Files:**
- Create: `frontend/src/components/network/VxlanModal.tsx`

Same structure as Task 7 but with VXLAN-specific tabs:

**Tabs:**
1. **General** — name (`vxlan` prefix), VNI Input (required, 1-16777215, create-only), source-address, source-interface, port Input (default 4789)
2. **Peers** — remote list (add/remove multiple remotes), multicast group Input. UI: when group has value, disable remote list and vice versa.
3. **Addresses** — dynamic address list
4. **Options** — GPE Checkbox, External Checkbox, Nolearning Checkbox, Neighbor-Suppress Checkbox
5. **Common** — description, MTU, VRF, disable

**Commit:**

```bash
git add frontend/src/components/network/VxlanModal.tsx
git commit -m "feat: add VXLAN interface modal component"
```

---

### Task 9: Delete Modals

**Files:**
- Create: `frontend/src/components/network/DeleteTunnelModal.tsx`
- Create: `frontend/src/components/network/DeleteVxlanModal.tsx`

Follow `DeleteEthernetModal.tsx` pattern (130 lines). Simple dialog with warning text, Cancel/Delete buttons. Calls `tunnelService.deleteInterface()` or `vxlanService.deleteInterface()`.

**Commit:**

```bash
git add frontend/src/components/network/DeleteTunnelModal.tsx frontend/src/components/network/DeleteVxlanModal.tsx
git commit -m "feat: add tunnel and VXLAN delete confirmation modals"
```

---

### Task 10: Interfaces Page Integration

**Files:**
- Modify: `frontend/src/app/network/interfaces/page.tsx`

**Step 1: Add tab navigation**

Add shadcn `Tabs` component wrapping three tab panels: Ethernet, Tunnel, VXLAN. Each tab panel contains its own card grid + create/edit/delete modal instances.

**Key changes to `page.tsx`:**

1. **New imports** (top):
   ```typescript
   import { tunnelService } from "@/lib/api/tunnel";
   import { vxlanService } from "@/lib/api/vxlan";
   import { TunnelModal } from "@/components/network/TunnelModal";
   import { VxlanModal } from "@/components/network/VxlanModal";
   import { DeleteTunnelModal } from "@/components/network/DeleteTunnelModal";
   import { DeleteVxlanModal } from "@/components/network/DeleteVxlanModal";
   import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
   ```

2. **New state** (after existing state, ~line 40):
   ```typescript
   const [activeTab, setActiveTab] = useState<string>("ethernet");
   // Tunnel state
   const [tunnelInterfaces, setTunnelInterfaces] = useState<TunnelInterface[]>([]);
   const [tunnelCapabilities, setTunnelCapabilities] = useState<TunnelCapabilities | null>(null);
   const [isCreateTunnelModalOpen, setIsCreateTunnelModalOpen] = useState(false);
   const [editingTunnel, setEditingTunnel] = useState<TunnelInterface | null>(null);
   const [deletingTunnel, setDeletingTunnel] = useState<TunnelInterface | null>(null);
   // VXLAN state
   const [vxlanInterfaces, setVxlanInterfaces] = useState<VxlanInterface[]>([]);
   const [vxlanCapabilities, setVxlanCapabilities] = useState<VxlanCapabilities | null>(null);
   const [isCreateVxlanModalOpen, setIsCreateVxlanModalOpen] = useState(false);
   const [editingVxlan, setEditingVxlan] = useState<VxlanInterface | null>(null);
   const [deletingVxlan, setDeletingVxlan] = useState<VxlanInterface | null>(null);
   ```

3. **Load data for active tab** — fetch tunnel/VXLAN data lazily when tab is selected:
   ```typescript
   const loadTunnelData = async () => { ... tunnelService.getConfig() + getCapabilities() };
   const loadVxlanData = async () => { ... vxlanService.getConfig() + getCapabilities() };
   ```

4. **Stats row** — update to show counts for all three types

5. **Main content area** — wrap in `<Tabs>` with three `<TabsContent>` panels:
   - Ethernet: existing card grid (no changes)
   - Tunnel: card grid with Name, Encapsulation badge, Source, Remote, Addresses, edit/delete buttons
   - VXLAN: card grid with Name, VNI badge, Source, Remote(s), Group, Addresses, edit/delete buttons

6. **Modals** — add TunnelModal (create + edit), DeleteTunnelModal, VxlanModal (create + edit), DeleteVxlanModal instances at bottom

**Step 2: Run lint and type check**

Run: `cd frontend && npm run lint && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add frontend/src/app/network/interfaces/page.tsx
git commit -m "feat: integrate tunnel and VXLAN tabs into interfaces page"
```

---

### Task 11: Update Component Index and Final Cleanup

**Files:**
- Modify: `frontend/src/components/network/index.ts` — add exports for new modals

**Step 1: Update barrel export**

Add exports for `TunnelModal`, `VxlanModal`, `DeleteTunnelModal`, `DeleteVxlanModal`.

**Step 2: Run full lint and type check**

Run:
```bash
cd frontend && npm run lint && npx tsc --noEmit
```

**Step 3: Run backend tests**

Run:
```bash
cd backend && python3 -m pytest -v
```

**Step 4: Commit**

```bash
git add frontend/src/components/network/index.ts
git commit -m "feat: export tunnel and VXLAN components from network index"
```

---

## Task Dependencies

```
Task 0 (Tunnel Mapper)  ──> Task 1 (Tunnel Builder) ──> Task 2 (Tunnel Router)
                                                                     │
Task 3 (VXLAN Mapper)   ──> Task 4 (VXLAN Builder + Router)          │
                                                                     │
Task 5 (Tunnel Types/Service) ──> Task 7 (Tunnel Modal) ──┐         │
                                                           ├──> Task 10 (Page Integration)
Task 6 (VXLAN Types/Service) ──> Task 8 (VXLAN Modal) ──┤
                                                           │
                                  Task 9 (Delete Modals) ──┘         │
                                                                     │
                                              Task 11 (Cleanup) <────┘
```

**Parallelizable:**
- Tasks 0-2 (tunnel backend) and Tasks 3-4 (VXLAN backend) can run in parallel
- Tasks 5+7 (tunnel frontend) and Tasks 6+8 (VXLAN frontend) can run in parallel
- Tasks 0-4 (all backend) and Tasks 5-9 (all frontend) can partially overlap
