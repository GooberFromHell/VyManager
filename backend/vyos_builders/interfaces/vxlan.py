"""
VXLAN Interface Batch Builder

Provides all VXLAN interface batch operations.
VXLAN interfaces support VNI, multicast groups, multiple remotes,
GPE, external control plane, and parameters like nolearning and neighbor-suppress.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class VxlanInterfaceBuilderMixin:
    """Complete batch builder for VXLAN interface operations"""

    def __init__(self, version: str):
        """Initialize VXLAN interface batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get all feature mappers for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.interface_mapper_key = "interface_vxlan"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "VxlanInterfaceBuilderMixin":
        """Add a 'set' operation to the batch."""
        self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "VxlanInterfaceBuilderMixin":
        """Add a 'delete' operation to the batch."""
        self._operations.append({"op": "delete", "path": path})
        return self

    def add_multiple_sets(self, paths: List[List[str]]) -> "VxlanInterfaceBuilderMixin":
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
    ) -> "VxlanInterfaceBuilderMixin":
        """Set interface description"""
        path = self.mappers[self.interface_mapper_key].get_description(interface, description)
        return self.add_set(path)

    def delete_interface_description(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete interface description"""
        path = self.mappers[self.interface_mapper_key].get_description_path(interface)
        return self.add_delete(path)

    def set_interface_address(
        self, interface: str, address: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_set(path)

    def delete_interface_address(
        self, interface: str, address: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Delete interface address"""
        path = self.mappers[self.interface_mapper_key].get_address(interface, address)
        return self.add_delete(path)

    def set_interface_mtu(
        self, interface: str, mtu: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu(interface, mtu)
        return self.add_set(path)

    def delete_interface_mtu(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete interface MTU"""
        path = self.mappers[self.interface_mapper_key].get_mtu_path(interface)
        return self.add_delete(path)

    def delete_interface(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete entire interface configuration"""
        path = self.mappers[self.interface_mapper_key].get_interface(interface)
        return self.add_delete(path)

    def set_interface_disable(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable interface (administratively down)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_set(path)

    def delete_interface_disable(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable interface (remove disable flag)"""
        path = self.mappers[self.interface_mapper_key].get_disable(interface)
        return self.add_delete(path)

    def set_interface_vrf(self, interface: str, vrf: str) -> "VxlanInterfaceBuilderMixin":
        """Assign interface to VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_set(path)

    def delete_interface_vrf(self, interface: str, vrf: str) -> "VxlanInterfaceBuilderMixin":
        """Remove interface from VRF"""
        path = self.mappers[self.interface_mapper_key].get_vrf(interface, vrf)
        return self.add_delete(path)

    # ========================================================================
    # IP Options
    # ========================================================================

    def set_ip_adjust_mss(
        self, interface: str, mss: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set IPv4 TCP MSS"""
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ip_adjust_mss_clamp_to_pmtu(
        self, interface: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Enable IPv4 MSS clamping to PMTU"""
        path = self.mappers[self.interface_mapper_key].get_ip_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ip_arp_cache_timeout(
        self, interface: str, timeout: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set ARP cache timeout"""
        path = self.mappers[self.interface_mapper_key].get_ip_arp_cache_timeout(interface, timeout)
        return self.add_set(path)

    def set_ip_disable_arp_filter(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable ARP filter"""
        path = self.mappers[self.interface_mapper_key].get_ip_disable_arp_filter(interface)
        return self.add_set(path)

    def set_ip_enable_arp_accept(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable ARP accept"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_accept(interface)
        return self.add_set(path)

    def set_ip_enable_arp_announce(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable ARP announce"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_announce(interface)
        return self.add_set(path)

    def set_ip_enable_arp_ignore(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable ARP ignore"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_arp_ignore(interface)
        return self.add_set(path)

    def set_ip_enable_proxy_arp(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable proxy ARP"""
        path = self.mappers[self.interface_mapper_key].get_ip_enable_proxy_arp(interface)
        return self.add_set(path)

    def set_ip_source_validation(
        self, interface: str, mode: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set source validation mode (strict/loose/disable)"""
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation(interface, mode)
        return self.add_set(path)

    def delete_ip_source_validation(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete source validation"""
        path = self.mappers[self.interface_mapper_key].get_ip_source_validation_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Options
    # ========================================================================

    def set_ipv6_adjust_mss(
        self, interface: str, mss: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set IPv6 TCP MSS"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss(interface, mss)
        return self.add_set(path)

    def set_ipv6_adjust_mss_clamp_to_pmtu(
        self, interface: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Enable IPv6 MSS clamping to PMTU"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_adjust_mss_clamp_mss_to_pmtu(interface)
        return self.add_set(path)

    def set_ipv6_disable_forwarding(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable IPv6 forwarding"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_disable_forwarding(interface)
        return self.add_set(path)

    def set_ipv6_dup_addr_detect_transmits(
        self, interface: str, count: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set IPv6 DAD transmits"""
        path = self.mappers[self.interface_mapper_key].get_ipv6_dup_addr_detect_transmits(interface, count)
        return self.add_set(path)

    # ========================================================================
    # VXLAN-Specific Operations
    # ========================================================================

    def set_vni(
        self, interface: str, vni: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set VXLAN Network Identifier (VNI)"""
        path = self.mappers[self.interface_mapper_key].get_vni(interface, vni)
        return self.add_set(path)

    def delete_vni(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete VNI"""
        path = self.mappers[self.interface_mapper_key].get_vni_path(interface)
        return self.add_delete(path)

    def set_source_address(
        self, interface: str, address: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set VTEP source address"""
        path = self.mappers[self.interface_mapper_key].get_source_address(interface, address)
        return self.add_set(path)

    def delete_source_address(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete source address"""
        path = self.mappers[self.interface_mapper_key].get_source_address_path(interface)
        return self.add_delete(path)

    def set_remote(
        self, interface: str, remote: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Add a remote VTEP address (supports multiple remotes)"""
        path = self.mappers[self.interface_mapper_key].get_remote(interface, remote)
        return self.add_set(path)

    def delete_remote(
        self, interface: str, remote: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Delete a specific remote VTEP address"""
        path = self.mappers[self.interface_mapper_key].get_remote(interface, remote)
        return self.add_delete(path)

    def delete_all_remotes(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete all remote VTEP addresses"""
        path = self.mappers[self.interface_mapper_key].get_remote_path(interface)
        return self.add_delete(path)

    def set_group(
        self, interface: str, group: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set multicast group address"""
        path = self.mappers[self.interface_mapper_key].get_group(interface, group)
        return self.add_set(path)

    def delete_group(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete multicast group address"""
        path = self.mappers[self.interface_mapper_key].get_group_path(interface)
        return self.add_delete(path)

    def set_port(
        self, interface: str, port: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set VXLAN destination port"""
        path = self.mappers[self.interface_mapper_key].get_port(interface, port)
        return self.add_set(path)

    def delete_port(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete VXLAN destination port"""
        path = self.mappers[self.interface_mapper_key].get_port_path(interface)
        return self.add_delete(path)

    def set_source_interface(
        self, interface: str, iface: str
    ) -> "VxlanInterfaceBuilderMixin":
        """Set source interface"""
        path = self.mappers[self.interface_mapper_key].get_source_interface(interface, iface)
        return self.add_set(path)

    def delete_source_interface(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Delete source interface"""
        path = self.mappers[self.interface_mapper_key].get_source_interface_path(interface)
        return self.add_delete(path)

    def set_gpe(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable Generic Protocol Extension (GPE)"""
        path = self.mappers[self.interface_mapper_key].get_gpe(interface)
        return self.add_set(path)

    def delete_gpe(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable Generic Protocol Extension (GPE)"""
        path = self.mappers[self.interface_mapper_key].get_gpe(interface)
        return self.add_delete(path)

    def set_external(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable external control plane"""
        path = self.mappers[self.interface_mapper_key].get_external(interface)
        return self.add_set(path)

    def delete_external(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable external control plane"""
        path = self.mappers[self.interface_mapper_key].get_external(interface)
        return self.add_delete(path)

    # ========================================================================
    # VXLAN Parameters
    # ========================================================================

    def set_nolearning(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable MAC learning"""
        path = self.mappers[self.interface_mapper_key].get_parameters_nolearning(interface)
        return self.add_set(path)

    def delete_nolearning(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable MAC learning (remove nolearning flag)"""
        path = self.mappers[self.interface_mapper_key].get_parameters_nolearning(interface)
        return self.add_delete(path)

    def set_neighbor_suppress(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Enable ARP/ND neighbor suppression"""
        path = self.mappers[self.interface_mapper_key].get_parameters_neighbor_suppress(interface)
        return self.add_set(path)

    def delete_neighbor_suppress(self, interface: str) -> "VxlanInterfaceBuilderMixin":
        """Disable ARP/ND neighbor suppression"""
        path = self.mappers[self.interface_mapper_key].get_parameters_neighbor_suppress(interface)
        return self.add_delete(path)
