"""
Tunnel Interface Batch Builder

Provides all tunnel interface batch operations.
Supports GRE, GRETAP, IPIP, SIT, and ERSPAN encapsulation types.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class TunnelInterfaceBuilderMixin:
    """Complete batch builder for tunnel interface operations"""

    def __init__(self, version: str):
        """Initialize tunnel interface batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get all feature mappers for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_tunnel"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "TunnelInterfaceBuilderMixin":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "TunnelInterfaceBuilderMixin":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "TunnelInterfaceBuilderMixin":
        """Add multiple 'set' operations to the batch."""
        for path in paths:
            self.add_set(path)
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Common Interface Operations
    # ========================================================================

    def set_interface_description(
        self, interface: str, description: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set interface description"""
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete interface description"""
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(
        self, interface: str, address: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(
        self, interface: str, address: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Delete interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(
        self, interface: str, mtu: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Disable interface (administratively down)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Enable interface (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "TunnelInterfaceBuilderMixin":
        """Assign interface to VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str, vrf: str) -> "TunnelInterfaceBuilderMixin":
        """Remove interface from VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete entire interface configuration"""
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    # ========================================================================
    # IP Options
    # ========================================================================

    def set_ip_adjust_mss(
        self, interface: str, mss: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set IPv4 TCP MSS"""
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ip_adjust_mss_clamp_to_pmtu(
        self, interface: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Enable IPv4 MSS clamping to PMTU"""
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ip_arp_cache_timeout(
        self, interface: str, timeout: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set ARP cache timeout"""
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, timeout)
        return self.add_set(path)

    def set_ip_disable_arp_filter(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Disable ARP filter"""
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_set(path)

    def set_ip_enable_arp_accept(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Enable ARP accept"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_set(path)

    def set_ip_enable_arp_announce(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Enable ARP announce"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_set(path)

    def set_ip_enable_arp_ignore(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Enable ARP ignore"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_set(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Enable proxy ARP"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_set(path)

    def set_ip_source_validation(
        self, interface: str, mode: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set source validation mode (strict/loose/disable)"""
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete source validation"""
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Options
    # ========================================================================

    def set_ipv6_adjust_mss(
        self, interface: str, mss: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set IPv6 TCP MSS"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ipv6_adjust_mss_clamp_to_pmtu(
        self, interface: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Enable IPv6 MSS clamping to PMTU"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ipv6_disable_forwarding(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Disable IPv6 forwarding"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def set_ipv6_dup_addr_detect_transmits(
        self, interface: str, count: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set IPv6 DAD transmits"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, count)
        return self.add_set(path)

    # ========================================================================
    # Tunnel-Specific Operations
    # ========================================================================

    def set_encapsulation(
        self, interface: str, encap: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel encapsulation type (gre, gretap, ipip, sit, erspan)"""
        path = self.mappers[self.interface_mapper_key].get_encapsulation(interface, encap)
        return self.add_set(path)

    def set_source_address(
        self, interface: str, address: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel source address"""
        path = self.mappers[self.interface_mapper_key].get_source_address(interface, address)
        return self.add_set(path)

    def delete_source_address(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete tunnel source address"""
        path = self.mappers[self.interface_mapper_key].get_source_address_path(interface)
        return self.add_delete(path)

    def set_remote(
        self, interface: str, remote: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel remote endpoint"""
        path = self.mappers[self.interface_mapper_key].get_remote(interface, remote)
        return self.add_set(path)

    def delete_remote(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete tunnel remote endpoint"""
        path = self.mappers[self.interface_mapper_key].get_remote_path(interface)
        return self.add_delete(path)

    def set_source_interface(
        self, interface: str, source_iface: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel source interface"""
        path = self.mappers[self.interface_mapper_key].get_source_interface(interface, source_iface)
        return self.add_set(path)

    def delete_source_interface(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete tunnel source interface"""
        path = self.mappers[self.interface_mapper_key].get_source_interface_path(interface)
        return self.add_delete(path)

    def set_enable_multicast(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Enable multicast on tunnel"""
        path = self.mappers[self.interface_mapper_key].get_enable_multicast(interface)
        return self.add_set(path)

    def delete_enable_multicast(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Disable multicast on tunnel"""
        path = self.mappers[self.interface_mapper_key].get_enable_multicast(interface)
        return self.add_delete(path)

    # ========================================================================
    # Tunnel Parameters: IP
    # ========================================================================

    def set_parameters_ip_ttl(
        self, interface: str, ttl: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel IP TTL"""
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_ttl(interface, ttl)
        return self.add_set(path)

    def delete_parameters_ip_ttl(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete tunnel IP TTL"""
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_ttl_path(interface)
        return self.add_delete(path)

    def set_parameters_ip_tos(
        self, interface: str, tos: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel IP TOS"""
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_tos(interface, tos)
        return self.add_set(path)

    def delete_parameters_ip_tos(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete tunnel IP TOS"""
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_tos_path(interface)
        return self.add_delete(path)

    def set_parameters_ip_key(
        self, interface: str, key: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set tunnel GRE key"""
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_key(interface, key)
        return self.add_set(path)

    def delete_parameters_ip_key(self, interface: str) -> "TunnelInterfaceBuilderMixin":
        """Delete tunnel GRE key"""
        path = self.mappers[self.interface_mapper_key].get_parameters_ip_key_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Tunnel Parameters: ERSPAN
    # ========================================================================

    def set_erspan_direction(
        self, interface: str, direction: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set ERSPAN direction (ingress/egress)"""
        path = self.mappers[self.interface_mapper_key].get_erspan_direction(interface, direction)
        return self.add_set(path)

    def set_erspan_idx(
        self, interface: str, idx: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set ERSPAN index"""
        path = self.mappers[self.interface_mapper_key].get_erspan_idx(interface, idx)
        return self.add_set(path)

    def set_erspan_version(
        self, interface: str, version: str
    ) -> "TunnelInterfaceBuilderMixin":
        """Set ERSPAN version"""
        path = self.mappers[self.interface_mapper_key].get_erspan_version(interface, version)
        return self.add_set(path)
