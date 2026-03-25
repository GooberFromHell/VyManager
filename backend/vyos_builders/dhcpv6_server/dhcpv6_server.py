"""
DHCPv6 Server Service Batch Builder

Provides all DHCPv6 Server batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DHCPv6ServerBatchBuilder:
    """Complete batch builder for DHCPv6 Server service operations."""

    def __init__(self, version: str):
        """Initialize DHCPv6 Server batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get DHCPv6 Server mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "dhcpv6_server"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "DHCPv6ServerBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DHCPv6ServerBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "delete", "path": path})
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
    # Preference Operations
    # ========================================================================

    def set_preference(self, value: str) -> "DHCPv6ServerBatchBuilder":
        """Set DHCPv6 server preference."""
        path = self.mappers[self.mapper_key].get_preference(value)
        return self.add_set(path)

    def delete_preference(self) -> "DHCPv6ServerBatchBuilder":
        """Delete DHCPv6 server preference."""
        path = self.mappers[self.mapper_key].get_preference_path()
        return self.add_delete(path)

    # ========================================================================
    # Shared Network Operations
    # ========================================================================

    def set_shared_network(self, network_name: str) -> "DHCPv6ServerBatchBuilder":
        """Create a shared network."""
        path = self.mappers[self.mapper_key].get_shared_network(network_name)
        return self.add_set(path)

    def delete_shared_network(self, network_name: str) -> "DHCPv6ServerBatchBuilder":
        """Delete a shared network."""
        path = self.mappers[self.mapper_key].get_shared_network_path(network_name)
        return self.add_delete(path)

    # ========================================================================
    # Subnet Operations
    # ========================================================================

    def set_subnet(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Create a subnet under a shared network."""
        path = self.mappers[self.mapper_key].get_subnet(network_name, prefix)
        return self.add_set(path)

    def delete_subnet(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete a subnet from a shared network."""
        path = self.mappers[self.mapper_key].get_subnet_path(network_name, prefix)
        return self.add_delete(path)

    # ========================================================================
    # Address Range Operations
    # ========================================================================

    def set_subnet_address_range_prefix(self, network_name: str, prefix: str, range_prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Set address range prefix for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_address_range_prefix(network_name, prefix, range_prefix)
        return self.add_set(path)

    def delete_subnet_address_range_prefix(self, network_name: str, prefix: str, range_prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete address range prefix from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_address_range_prefix_path(network_name, prefix, range_prefix)
        return self.add_delete(path)

    def set_subnet_address_range_start(self, network_name: str, prefix: str, start: str, stop: str) -> "DHCPv6ServerBatchBuilder":
        """Set address range start/stop for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_address_range_start(network_name, prefix, start, stop)
        return self.add_set(path)

    def delete_subnet_address_range_start(self, network_name: str, prefix: str, start: str) -> "DHCPv6ServerBatchBuilder":
        """Delete address range start from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_address_range_start_path(network_name, prefix, start)
        return self.add_delete(path)

    # ========================================================================
    # Subnet Option Operations
    # ========================================================================

    def set_subnet_domain_search(self, network_name: str, prefix: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        """Set domain search for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_domain_search(network_name, prefix, domain)
        return self.add_set(path)

    def delete_subnet_domain_search(self, network_name: str, prefix: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        """Delete domain search from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_domain_search_path(network_name, prefix, domain)
        return self.add_delete(path)

    def set_subnet_lease_time_default(self, network_name: str, prefix: str, seconds: str) -> "DHCPv6ServerBatchBuilder":
        """Set default lease time for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_lease_time_default(network_name, prefix, seconds)
        return self.add_set(path)

    def delete_subnet_lease_time_default(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete default lease time from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_lease_time_default_path(network_name, prefix)
        return self.add_delete(path)

    def set_subnet_lease_time_maximum(self, network_name: str, prefix: str, seconds: str) -> "DHCPv6ServerBatchBuilder":
        """Set maximum lease time for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_lease_time_maximum(network_name, prefix, seconds)
        return self.add_set(path)

    def delete_subnet_lease_time_maximum(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete maximum lease time from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_lease_time_maximum_path(network_name, prefix)
        return self.add_delete(path)

    def set_subnet_lease_time_minimum(self, network_name: str, prefix: str, seconds: str) -> "DHCPv6ServerBatchBuilder":
        """Set minimum lease time for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_lease_time_minimum(network_name, prefix, seconds)
        return self.add_set(path)

    def delete_subnet_lease_time_minimum(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete minimum lease time from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_lease_time_minimum_path(network_name, prefix)
        return self.add_delete(path)

    def set_subnet_name_server(self, network_name: str, prefix: str, address: str) -> "DHCPv6ServerBatchBuilder":
        """Set name server for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_name_server(network_name, prefix, address)
        return self.add_set(path)

    def delete_subnet_name_server(self, network_name: str, prefix: str, address: str) -> "DHCPv6ServerBatchBuilder":
        """Delete name server from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_name_server_path(network_name, prefix, address)
        return self.add_delete(path)

    def set_subnet_nis_domain(self, network_name: str, prefix: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        """Set NIS domain for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_nis_domain(network_name, prefix, domain)
        return self.add_set(path)

    def delete_subnet_nis_domain(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete NIS domain from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_nis_domain_path(network_name, prefix)
        return self.add_delete(path)

    def set_subnet_nisplus_domain(self, network_name: str, prefix: str, domain: str) -> "DHCPv6ServerBatchBuilder":
        """Set NIS+ domain for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_nisplus_domain(network_name, prefix, domain)
        return self.add_set(path)

    def delete_subnet_nisplus_domain(self, network_name: str, prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Delete NIS+ domain from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_nisplus_domain_path(network_name, prefix)
        return self.add_delete(path)

    def set_subnet_sip_server(self, network_name: str, prefix: str, server: str) -> "DHCPv6ServerBatchBuilder":
        """Set SIP server for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_sip_server(network_name, prefix, server)
        return self.add_set(path)

    def delete_subnet_sip_server(self, network_name: str, prefix: str, server: str) -> "DHCPv6ServerBatchBuilder":
        """Delete SIP server from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_sip_server_path(network_name, prefix, server)
        return self.add_delete(path)

    def set_subnet_sntp_server(self, network_name: str, prefix: str, address: str) -> "DHCPv6ServerBatchBuilder":
        """Set SNTP server for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_sntp_server(network_name, prefix, address)
        return self.add_set(path)

    def delete_subnet_sntp_server(self, network_name: str, prefix: str, address: str) -> "DHCPv6ServerBatchBuilder":
        """Delete SNTP server from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_sntp_server_path(network_name, prefix, address)
        return self.add_delete(path)

    # ========================================================================
    # Static Mapping Operations
    # ========================================================================

    def set_subnet_static_mapping(self, network_name: str, prefix: str, mapping_name: str) -> "DHCPv6ServerBatchBuilder":
        """Create a static mapping for a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_static_mapping(network_name, prefix, mapping_name)
        return self.add_set(path)

    def delete_subnet_static_mapping(self, network_name: str, prefix: str, mapping_name: str) -> "DHCPv6ServerBatchBuilder":
        """Delete a static mapping from a subnet."""
        path = self.mappers[self.mapper_key].get_subnet_static_mapping_path(network_name, prefix, mapping_name)
        return self.add_delete(path)

    def set_subnet_static_mapping_identifier(self, network_name: str, prefix: str, mapping_name: str, duid: str) -> "DHCPv6ServerBatchBuilder":
        """Set identifier (DUID) for a static mapping."""
        path = self.mappers[self.mapper_key].get_subnet_static_mapping_identifier(network_name, prefix, mapping_name, duid)
        return self.add_set(path)

    def set_subnet_static_mapping_ipv6_address(self, network_name: str, prefix: str, mapping_name: str, address: str) -> "DHCPv6ServerBatchBuilder":
        """Set IPv6 address for a static mapping."""
        path = self.mappers[self.mapper_key].get_subnet_static_mapping_ipv6_address(network_name, prefix, mapping_name, address)
        return self.add_set(path)

    def set_subnet_static_mapping_ipv6_prefix(self, network_name: str, prefix: str, mapping_name: str, ipv6_prefix: str) -> "DHCPv6ServerBatchBuilder":
        """Set IPv6 prefix for a static mapping."""
        path = self.mappers[self.mapper_key].get_subnet_static_mapping_ipv6_prefix(network_name, prefix, mapping_name, ipv6_prefix)
        return self.add_set(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        return {
            "version": self.version,
            "fields": {
                "preference": {"supported": True, "description": "Server preference value (0-65535)"},
                "shared_networks": {"supported": True, "description": "Shared network definitions"},
                "subnets": {"supported": True, "description": "IPv6 subnet configurations"},
                "address_ranges": {"supported": True, "description": "Address range prefix and start/stop"},
                "domain_search": {"supported": True, "description": "Domain search list"},
                "lease_time": {"supported": True, "description": "Lease time settings (default/max/min)"},
                "name_servers": {"supported": True, "description": "IPv6 name servers"},
                "nis_domain": {"supported": True, "description": "NIS domain"},
                "nisplus_domain": {"supported": True, "description": "NIS+ domain"},
                "sip_server": {"supported": True, "description": "SIP server addresses"},
                "sntp_server": {"supported": True, "description": "SNTP server addresses"},
                "static_mappings": {"supported": True, "description": "Static DUID-to-address mappings"},
            },
        }
