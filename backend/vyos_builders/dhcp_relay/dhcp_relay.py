"""
DHCP Relay Service Batch Builder

Provides all DHCP Relay batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DHCPRelayBatchBuilder:
    """Complete batch builder for DHCP Relay service operations."""

    def __init__(self, version: str):
        """Initialize DHCP Relay batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get DHCP Relay mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "dhcp_relay"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "DHCPRelayBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DHCPRelayBatchBuilder":
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
    # Server Operations
    # ========================================================================

    def set_server(self, address: str) -> "DHCPRelayBatchBuilder":
        """Add DHCP relay server."""
        path = self.mappers[self.mapper_key].get_server(address)
        return self.add_set(path)

    def delete_server(self, address: str) -> "DHCPRelayBatchBuilder":
        """Remove DHCP relay server."""
        path = self.mappers[self.mapper_key].get_server_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, name: str) -> "DHCPRelayBatchBuilder":
        """Add DHCP relay interface."""
        path = self.mappers[self.mapper_key].get_interface(name)
        return self.add_set(path)

    def delete_interface(self, name: str) -> "DHCPRelayBatchBuilder":
        """Remove DHCP relay interface."""
        path = self.mappers[self.mapper_key].get_interface_path(name)
        return self.add_delete(path)

    # ========================================================================
    # Relay Options Operations
    # ========================================================================

    def set_hop_count(self, count: str) -> "DHCPRelayBatchBuilder":
        """Set relay hop count."""
        path = self.mappers[self.mapper_key].get_hop_count(count)
        return self.add_set(path)

    def delete_hop_count(self) -> "DHCPRelayBatchBuilder":
        """Delete relay hop count."""
        path = self.mappers[self.mapper_key].get_hop_count_path()
        return self.add_delete(path)

    def set_max_size(self, size: str) -> "DHCPRelayBatchBuilder":
        """Set relay max size."""
        path = self.mappers[self.mapper_key].get_max_size(size)
        return self.add_set(path)

    def delete_max_size(self) -> "DHCPRelayBatchBuilder":
        """Delete relay max size."""
        path = self.mappers[self.mapper_key].get_max_size_path()
        return self.add_delete(path)

    def set_relay_agents_packets(self, mode: str) -> "DHCPRelayBatchBuilder":
        """Set relay agents packets mode."""
        path = self.mappers[self.mapper_key].get_relay_agents_packets(mode)
        return self.add_set(path)

    def delete_relay_agents_packets(self) -> "DHCPRelayBatchBuilder":
        """Delete relay agents packets mode."""
        path = self.mappers[self.mapper_key].get_relay_agents_packets_path()
        return self.add_delete(path)

    # ========================================================================
    # Listen Address Operations (v1.5 only)
    # ========================================================================

    def set_listen_address(self, address: str) -> "DHCPRelayBatchBuilder":
        """Set DHCP relay listen address (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "DHCPRelayBatchBuilder":
        """Delete DHCP relay listen address (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "has_listen_address": is_v15,
            "fields": {
                "servers": {"supported": True, "description": "Upstream DHCP server addresses"},
                "interfaces": {"supported": True, "description": "Interfaces to relay DHCP on"},
                "hop_count": {"supported": True, "description": "Relay hop count (1-255)"},
                "max_size": {"supported": True, "description": "Maximum packet size (64-1400)"},
                "relay_agents_packets": {"supported": True, "description": "Relay agents packets mode (append|discard|forward|replace)"},
                "listen_addresses": {"supported": is_v15, "description": "Listen addresses (v1.5+)"},
            },
        }
