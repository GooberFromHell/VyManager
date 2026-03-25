"""
LLDP Service Batch Builder

Provides all LLDP batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class LLDPBatchBuilder:
    """Complete batch builder for LLDP service operations."""

    def __init__(self, version: str):
        """Initialize LLDP batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get LLDP mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "lldp"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "LLDPBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "LLDPBatchBuilder":
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
    # Interface Operations
    # ========================================================================

    def set_interface(self, interface_name: str) -> "LLDPBatchBuilder":
        """Add LLDP interface."""
        path = self.mappers[self.mapper_key].get_interface(interface_name)
        return self.add_set(path)

    def delete_interface(self, interface_name: str) -> "LLDPBatchBuilder":
        """Remove LLDP interface (entire node)."""
        path = self.mappers[self.mapper_key].get_interface_path(interface_name)
        return self.add_delete(path)

    # ========================================================================
    # Interface Disable Operations
    # ========================================================================

    def set_interface_disable(self, interface_name: str) -> "LLDPBatchBuilder":
        """Disable LLDP on interface."""
        path = self.mappers[self.mapper_key].get_interface_disable(interface_name)
        return self.add_set(path)

    def delete_interface_disable(self, interface_name: str) -> "LLDPBatchBuilder":
        """Re-enable LLDP on interface."""
        path = self.mappers[self.mapper_key].get_interface_disable_path(interface_name)
        return self.add_delete(path)

    # ========================================================================
    # Interface Location ELIN Operations
    # ========================================================================

    def set_interface_location_elin(self, interface_name: str, elin: str) -> "LLDPBatchBuilder":
        """Set ELIN location for interface."""
        path = self.mappers[self.mapper_key].get_interface_location_elin(interface_name, elin)
        return self.add_set(path)

    def delete_interface_location_elin(self, interface_name: str) -> "LLDPBatchBuilder":
        """Remove ELIN location from interface."""
        path = self.mappers[self.mapper_key].get_interface_location_elin_path(interface_name)
        return self.add_delete(path)

    # ========================================================================
    # SNMP Enable Operations
    # ========================================================================

    def set_snmp_enable(self) -> "LLDPBatchBuilder":
        """Enable SNMP for LLDP."""
        path = self.mappers[self.mapper_key].get_snmp_enable()
        return self.add_set(path)

    def delete_snmp_enable(self) -> "LLDPBatchBuilder":
        """Disable SNMP for LLDP."""
        path = self.mappers[self.mapper_key].get_snmp_enable_path()
        return self.add_delete(path)

    # ========================================================================
    # Legacy Protocol Operations (v1.4 only)
    # ========================================================================

    def set_legacy_protocol(self, protocol: str) -> "LLDPBatchBuilder":
        """Enable a legacy protocol (v1.4 only)."""
        path = self.mappers[self.mapper_key].get_legacy_protocol(protocol)
        return self.add_set(path)

    def delete_legacy_protocol(self, protocol: str) -> "LLDPBatchBuilder":
        """Disable a legacy protocol (v1.4 only)."""
        path = self.mappers[self.mapper_key].get_legacy_protocol_path(protocol)
        return self.add_delete(path)

    # ========================================================================
    # Management Address Operations (v1.5 only)
    # ========================================================================

    def set_management_address(self, ip: str) -> "LLDPBatchBuilder":
        """Set management address (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_management_address(ip)
        return self.add_set(path)

    def delete_management_address(self, ip: str) -> "LLDPBatchBuilder":
        """Remove management address (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_management_address_path(ip)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v14 = "1.4" in self.version
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "has_legacy_protocols": is_v14,
            "has_management_address": is_v15,
            "fields": {
                "interfaces": {"supported": True, "description": "LLDP interfaces"},
                "interface_disable": {"supported": True, "description": "Disable LLDP on interface"},
                "interface_location_elin": {"supported": True, "description": "ELIN location for interface"},
                "snmp_enable": {"supported": True, "description": "Enable SNMP for LLDP"},
                "legacy_protocols": {"supported": is_v14, "description": "Legacy protocols (v1.4 only)"},
                "management_address": {"supported": is_v15, "description": "Management address (v1.5+)"},
            },
        }
