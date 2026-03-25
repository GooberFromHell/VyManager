"""
Broadcast Relay Service Batch Builder

Provides all broadcast relay batch operations following the standard pattern.
Relay instances are identified by a numeric relay_id (1-99).
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class BroadcastRelayBatchBuilder:
    """Complete batch builder for broadcast relay service operations."""

    def __init__(self, version: str):
        """Initialize Broadcast Relay batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "broadcast_relay"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "BroadcastRelayBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "BroadcastRelayBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
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
    # Relay ID Operations
    # ========================================================================

    def set_id(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Create a relay instance node."""
        path = self.mappers[self.mapper_key].get_id(relay_id)
        return self.add_set(path)

    def delete_id(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Delete an entire relay instance."""
        path = self.mappers[self.mapper_key].get_id_path(relay_id)
        return self.add_delete(path)

    # ========================================================================
    # Description Operations
    # ========================================================================

    def set_description(self, relay_id: str, desc: str) -> "BroadcastRelayBatchBuilder":
        """Set relay instance description."""
        path = self.mappers[self.mapper_key].get_description(relay_id, desc)
        return self.add_set(path)

    def delete_description(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Delete relay instance description."""
        path = self.mappers[self.mapper_key].get_description_path(relay_id)
        return self.add_delete(path)

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, relay_id: str, iface: str) -> "BroadcastRelayBatchBuilder":
        """Add an interface to a relay instance."""
        path = self.mappers[self.mapper_key].get_interface(relay_id, iface)
        return self.add_set(path)

    def delete_interface(self, relay_id: str, iface: str) -> "BroadcastRelayBatchBuilder":
        """Remove an interface from a relay instance."""
        path = self.mappers[self.mapper_key].get_interface_path(relay_id, iface)
        return self.add_delete(path)

    # ========================================================================
    # Address Operations
    # ========================================================================

    def set_address(self, relay_id: str, addr: str) -> "BroadcastRelayBatchBuilder":
        """Set destination broadcast address for a relay instance."""
        path = self.mappers[self.mapper_key].get_address(relay_id, addr)
        return self.add_set(path)

    def delete_address(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Delete destination broadcast address from a relay instance."""
        path = self.mappers[self.mapper_key].get_address_path(relay_id)
        return self.add_delete(path)

    # ========================================================================
    # Port Operations
    # ========================================================================

    def set_port(self, relay_id: str, port: str) -> "BroadcastRelayBatchBuilder":
        """Set UDP port for a relay instance."""
        path = self.mappers[self.mapper_key].get_port(relay_id, port)
        return self.add_set(path)

    def delete_port(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Delete UDP port from a relay instance."""
        path = self.mappers[self.mapper_key].get_port_path(relay_id)
        return self.add_delete(path)

    # ========================================================================
    # Disable Flag Operations
    # ========================================================================

    def set_disable(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Disable a relay instance."""
        path = self.mappers[self.mapper_key].get_disable(relay_id)
        return self.add_set(path)

    def delete_disable(self, relay_id: str) -> "BroadcastRelayBatchBuilder":
        """Re-enable a relay instance (remove disable flag)."""
        path = self.mappers[self.mapper_key].get_disable_path(relay_id)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        return {
            "version": self.version,
            "fields": {
                "id": {"supported": True, "description": "Relay instance number (1-99)"},
                "description": {"supported": True, "description": "Human-readable description for the relay instance"},
                "interface": {"supported": True, "description": "Network interfaces participating in relay (multi-value)"},
                "address": {"supported": True, "description": "Destination broadcast address"},
                "port": {"supported": True, "description": "UDP port to relay (1-65535)"},
                "disable": {"supported": True, "description": "Disable relay instance without deleting it"},
            },
        }
