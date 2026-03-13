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
