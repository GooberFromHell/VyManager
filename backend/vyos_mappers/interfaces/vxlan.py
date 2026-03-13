"""
VXLAN Interface Command Mapper

Handles VXLAN-specific interface commands (VNI, multicast group, remotes, etc).
Provides both command path generation (for writes) and config parsing (for reads).
"""

from typing import List, Dict, Any
from ..base import BaseFeatureMapper


class VxlanInterfaceMapper(BaseFeatureMapper):
    """VXLAN interface mapper with all VXLAN interface operations"""

    def __init__(self, version: str):
        super().__init__(version)
        self.interface_type = "vxlan"

    # ========================================================================
    # Common Interface Properties (same pattern as ethernet.py / tunnel.py)
    # ========================================================================

    def get_description(self, interface: str, description: str) -> List[str]:
        """Get command path for setting interface description."""
        return ["interfaces", self.interface_type, interface, "description", description]

    def get_description_path(self, interface: str) -> List[str]:
        """Get command path for description property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "description"]

    def get_address(self, interface: str, address: str) -> List[str]:
        """Get command path for setting interface address."""
        return ["interfaces", self.interface_type, interface, "address", address]

    def get_mtu(self, interface: str, mtu: str) -> List[str]:
        """Get command path for setting interface MTU."""
        return ["interfaces", self.interface_type, interface, "mtu", mtu]

    def get_mtu_path(self, interface: str) -> List[str]:
        """Get command path for MTU property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "mtu"]

    def get_interface(self, interface: str) -> List[str]:
        """Get command path for an interface (for deletion)."""
        return ["interfaces", self.interface_type, interface]

    def get_disable(self, interface: str) -> List[str]:
        """Get command path for disabling an interface."""
        return ["interfaces", self.interface_type, interface, "disable"]

    def get_vrf(self, interface: str, vrf: str) -> List[str]:
        """Get command path for assigning interface to VRF."""
        return ["interfaces", self.interface_type, interface, "vrf", vrf]

    # ========================================================================
    # IP Options
    # ========================================================================

    def get_ip_adjust_mss(self, interface: str, mss: str) -> List[str]:
        """Get command path for setting IPv4 TCP MSS."""
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", mss]

    def get_ip_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        """Get command path for enabling MSS clamping to PMTU (IPv4)."""
        return ["interfaces", self.interface_type, interface, "ip", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ip_arp_cache_timeout(self, interface: str, timeout: str) -> List[str]:
        """Get command path for ARP cache timeout."""
        return ["interfaces", self.interface_type, interface, "ip", "arp-cache-timeout", timeout]

    def get_ip_disable_arp_filter(self, interface: str) -> List[str]:
        """Get command path for disabling ARP filter."""
        return ["interfaces", self.interface_type, interface, "ip", "disable-arp-filter"]

    def get_ip_enable_arp_accept(self, interface: str) -> List[str]:
        """Get command path for enabling ARP accept."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-accept"]

    def get_ip_enable_arp_announce(self, interface: str) -> List[str]:
        """Get command path for enabling ARP announce."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-announce"]

    def get_ip_enable_arp_ignore(self, interface: str) -> List[str]:
        """Get command path for enabling ARP ignore."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-arp-ignore"]

    def get_ip_enable_proxy_arp(self, interface: str) -> List[str]:
        """Get command path for enabling proxy ARP."""
        return ["interfaces", self.interface_type, interface, "ip", "enable-proxy-arp"]

    def get_ip_source_validation(self, interface: str, mode: str) -> List[str]:
        """Get command path for source validation (strict/loose/disable)."""
        return ["interfaces", self.interface_type, interface, "ip", "source-validation", mode]

    def get_ip_source_validation_path(self, interface: str) -> List[str]:
        """Get command path for source validation (for deletion)."""
        return ["interfaces", self.interface_type, interface, "ip", "source-validation"]

    # ========================================================================
    # IPv6 Options
    # ========================================================================

    def get_ipv6_adjust_mss(self, interface: str, mss: str) -> List[str]:
        """Get command path for setting IPv6 TCP MSS."""
        return ["interfaces", self.interface_type, interface, "ipv6", "adjust-mss", mss]

    def get_ipv6_adjust_mss_clamp_mss_to_pmtu(self, interface: str) -> List[str]:
        """Get command path for enabling MSS clamping to PMTU (IPv6)."""
        return ["interfaces", self.interface_type, interface, "ipv6", "adjust-mss", "clamp-mss-to-pmtu"]

    def get_ipv6_disable_forwarding(self, interface: str) -> List[str]:
        """Get command path for disabling IPv6 forwarding."""
        return ["interfaces", self.interface_type, interface, "ipv6", "disable-forwarding"]

    def get_ipv6_dup_addr_detect_transmits(self, interface: str, count: str) -> List[str]:
        """Get command path for IPv6 DAD transmits."""
        return ["interfaces", self.interface_type, interface, "ipv6", "dup-addr-detect-transmits", count]

    # ========================================================================
    # VXLAN-Specific Properties
    # ========================================================================

    def get_vni(self, interface: str, vni: str) -> List[str]:
        """Get command path for setting VXLAN Network Identifier (VNI)."""
        return ["interfaces", self.interface_type, interface, "vni", vni]

    def get_vni_path(self, interface: str) -> List[str]:
        """Get command path for VNI property (for deletion)."""
        return ["interfaces", self.interface_type, interface, "vni"]

    def get_source_address(self, interface: str, address: str) -> List[str]:
        """Get command path for setting source address (VTEP source)."""
        return ["interfaces", self.interface_type, interface, "source-address", address]

    def get_source_address_path(self, interface: str) -> List[str]:
        """Get command path for source address (for deletion)."""
        return ["interfaces", self.interface_type, interface, "source-address"]

    def get_remote(self, interface: str, remote: str) -> List[str]:
        """Get command path for setting remote VTEP address.

        VXLAN supports multiple remotes; each remote is added with a separate set command.
        """
        return ["interfaces", self.interface_type, interface, "remote", remote]

    def get_remote_path(self, interface: str) -> List[str]:
        """Get command path for remote property (for deletion of all remotes)."""
        return ["interfaces", self.interface_type, interface, "remote"]

    def get_group(self, interface: str, group: str) -> List[str]:
        """Get command path for setting multicast group address."""
        return ["interfaces", self.interface_type, interface, "group", group]

    def get_group_path(self, interface: str) -> List[str]:
        """Get command path for multicast group (for deletion)."""
        return ["interfaces", self.interface_type, interface, "group"]

    def get_port(self, interface: str, port: str) -> List[str]:
        """Get command path for setting VXLAN destination port."""
        return ["interfaces", self.interface_type, interface, "port", port]

    def get_port_path(self, interface: str) -> List[str]:
        """Get command path for port (for deletion)."""
        return ["interfaces", self.interface_type, interface, "port"]

    def get_source_interface(self, interface: str, iface: str) -> List[str]:
        """Get command path for setting source interface."""
        return ["interfaces", self.interface_type, interface, "source-interface", iface]

    def get_source_interface_path(self, interface: str) -> List[str]:
        """Get command path for source interface (for deletion)."""
        return ["interfaces", self.interface_type, interface, "source-interface"]

    def get_gpe(self, interface: str) -> List[str]:
        """Get command path for enabling Generic Protocol Extension (GPE)."""
        return ["interfaces", self.interface_type, interface, "gpe"]

    def get_external(self, interface: str) -> List[str]:
        """Get command path for enabling external control plane."""
        return ["interfaces", self.interface_type, interface, "external"]

    # --- Parameters ---
    def get_parameters_nolearning(self, interface: str) -> List[str]:
        """Get command path for disabling MAC learning."""
        return ["interfaces", self.interface_type, interface, "parameters", "nolearning"]

    def get_parameters_neighbor_suppress(self, interface: str) -> List[str]:
        """Get command path for enabling ARP/ND neighbor suppression."""
        return ["interfaces", self.interface_type, interface, "parameters", "neighbor-suppress"]

    # ========================================================================
    # Config Parsing Methods
    # ========================================================================

    def _parse_addresses(self, config: Dict[str, Any]) -> List[str]:
        """Parse address field which can be string or list."""
        addresses = []
        if "address" in config:
            addr = config["address"]
            if isinstance(addr, list):
                addresses = addr
            elif isinstance(addr, str):
                addresses = [addr]
        return addresses

    def _parse_remotes(self, config: Dict[str, Any]) -> List[str]:
        """Parse remote field which can be string, list, or absent.

        VXLAN supports multiple remote VTEP addresses. VyOS returns a single
        string when there is one remote, or a list when there are multiple.
        Always returns a list for consistency.
        """
        if "remote" not in config:
            return []
        remote = config["remote"]
        if isinstance(remote, list):
            return remote
        elif isinstance(remote, str):
            return [remote]
        return []

    def _parse_ip_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse IP configuration options."""
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
        """Parse IPv6 configuration options."""
        ipv6 = config.get("ipv6", {})
        if not ipv6:
            return None
        return {
            "adjust_mss": ipv6.get("adjust-mss"),
            "disable_forwarding": "disable-forwarding" in ipv6,
            "dup_addr_detect_transmits": ipv6.get("dup-addr-detect-transmits"),
        }

    def _parse_parameters(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Parse VXLAN parameters (nolearning, neighbor-suppress)."""
        params = config.get("parameters", {})
        if not params:
            return None
        return {
            "nolearning": "nolearning" in params,
            "neighbor_suppress": "neighbor-suppress" in params,
        }

    def parse_single_interface(self, name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse a single VXLAN interface configuration from VyOS.

        Args:
            name: Interface name (e.g., "vxlan0")
            config: Raw interface config dictionary from VyOS

        Returns:
            Parsed interface data as dictionary
        """
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
            "vni": config.get("vni"),
            "source_address": config.get("source-address"),
            "remote": self._parse_remotes(config),
            "group": config.get("group"),
            "port": config.get("port"),
            "source_interface": config.get("source-interface"),
            "gpe": "gpe" in config,
            "external": "external" in config,
            "ip": self._parse_ip_config(config),
            "ipv6": self._parse_ipv6_config(config),
            "parameters": self._parse_parameters(config),
        }

    def parse_interfaces_of_type(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse all VXLAN interfaces.

        Args:
            config: Raw config dictionary for VXLAN interfaces from VyOS

        Returns:
            Dictionary with interfaces list and statistics
        """
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
