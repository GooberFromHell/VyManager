"""
SNMP Service Batch Builder

Provides all SNMP batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SNMPBatchBuilder:
    """Complete batch builder for SNMP service operations."""

    def __init__(self, version: str):
        """Initialize SNMP batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get SNMP mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "snmp"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "SNMPBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SNMPBatchBuilder":
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
    # Community Operations
    # ========================================================================

    def set_community(self, name: str) -> "SNMPBatchBuilder":
        """Add SNMP community."""
        path = self.mappers[self.mapper_key].get_community(name)
        return self.add_set(path)

    def delete_community(self, name: str) -> "SNMPBatchBuilder":
        """Remove SNMP community (entire node)."""
        path = self.mappers[self.mapper_key].get_community_path(name)
        return self.add_delete(path)

    def set_community_authorization(self, name: str, authorization: str) -> "SNMPBatchBuilder":
        """Set community authorization (ro or rw)."""
        path = self.mappers[self.mapper_key].get_community_authorization(name, authorization)
        return self.add_set(path)

    def delete_community_authorization(self, name: str) -> "SNMPBatchBuilder":
        """Remove community authorization."""
        path = self.mappers[self.mapper_key].get_community_authorization_path(name)
        return self.add_delete(path)

    def set_community_client(self, name: str, ip: str) -> "SNMPBatchBuilder":
        """Add client IP to community."""
        path = self.mappers[self.mapper_key].get_community_client(name, ip)
        return self.add_set(path)

    def delete_community_client(self, name: str, ip: str) -> "SNMPBatchBuilder":
        """Remove client IP from community."""
        path = self.mappers[self.mapper_key].get_community_client_path(name, ip)
        return self.add_delete(path)

    def set_community_network(self, name: str, cidr: str) -> "SNMPBatchBuilder":
        """Add network CIDR to community."""
        path = self.mappers[self.mapper_key].get_community_network(name, cidr)
        return self.add_set(path)

    def delete_community_network(self, name: str, cidr: str) -> "SNMPBatchBuilder":
        """Remove network CIDR from community."""
        path = self.mappers[self.mapper_key].get_community_network_path(name, cidr)
        return self.add_delete(path)

    # ========================================================================
    # Global Operations
    # ========================================================================

    def set_contact(self, contact: str) -> "SNMPBatchBuilder":
        """Set SNMP contact string."""
        path = self.mappers[self.mapper_key].get_contact(contact)
        return self.add_set(path)

    def delete_contact(self) -> "SNMPBatchBuilder":
        """Delete SNMP contact string."""
        path = self.mappers[self.mapper_key].get_contact_path()
        return self.add_delete(path)

    def set_description(self, description: str) -> "SNMPBatchBuilder":
        """Set SNMP description string."""
        path = self.mappers[self.mapper_key].get_description(description)
        return self.add_set(path)

    def delete_description(self) -> "SNMPBatchBuilder":
        """Delete SNMP description string."""
        path = self.mappers[self.mapper_key].get_description_path()
        return self.add_delete(path)

    def set_listen_address(self, address: str) -> "SNMPBatchBuilder":
        """Set SNMP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "SNMPBatchBuilder":
        """Delete SNMP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    def set_listen_address_port(self, address: str, port: str) -> "SNMPBatchBuilder":
        """Set port for SNMP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_port(address, port)
        return self.add_set(path)

    def delete_listen_address_port(self, address: str) -> "SNMPBatchBuilder":
        """Delete port for SNMP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_port_path(address)
        return self.add_delete(path)

    def set_location(self, location: str) -> "SNMPBatchBuilder":
        """Set SNMP location string."""
        path = self.mappers[self.mapper_key].get_location(location)
        return self.add_set(path)

    def delete_location(self) -> "SNMPBatchBuilder":
        """Delete SNMP location string."""
        path = self.mappers[self.mapper_key].get_location_path()
        return self.add_delete(path)

    def set_trap_source(self, address: str) -> "SNMPBatchBuilder":
        """Set SNMP trap source address."""
        path = self.mappers[self.mapper_key].get_trap_source(address)
        return self.add_set(path)

    def delete_trap_source(self) -> "SNMPBatchBuilder":
        """Delete SNMP trap source address."""
        path = self.mappers[self.mapper_key].get_trap_source_path()
        return self.add_delete(path)

    # ========================================================================
    # Trap Target Operations
    # ========================================================================

    def set_trap_target(self, address: str) -> "SNMPBatchBuilder":
        """Add SNMP trap target."""
        path = self.mappers[self.mapper_key].get_trap_target(address)
        return self.add_set(path)

    def delete_trap_target(self, address: str) -> "SNMPBatchBuilder":
        """Remove SNMP trap target (entire node)."""
        path = self.mappers[self.mapper_key].get_trap_target_path(address)
        return self.add_delete(path)

    def set_trap_target_community(self, address: str, community: str) -> "SNMPBatchBuilder":
        """Set community for trap target."""
        path = self.mappers[self.mapper_key].get_trap_target_community(address, community)
        return self.add_set(path)

    def delete_trap_target_community(self, address: str) -> "SNMPBatchBuilder":
        """Delete community for trap target."""
        path = self.mappers[self.mapper_key].get_trap_target_community_path(address)
        return self.add_delete(path)

    def set_trap_target_port(self, address: str, port: str) -> "SNMPBatchBuilder":
        """Set port for trap target."""
        path = self.mappers[self.mapper_key].get_trap_target_port(address, port)
        return self.add_set(path)

    def delete_trap_target_port(self, address: str) -> "SNMPBatchBuilder":
        """Delete port for trap target."""
        path = self.mappers[self.mapper_key].get_trap_target_port_path(address)
        return self.add_delete(path)

    # ========================================================================
    # v3 Group Operations
    # ========================================================================

    def set_v3_group(self, name: str) -> "SNMPBatchBuilder":
        """Add SNMPv3 group."""
        path = self.mappers[self.mapper_key].get_v3_group(name)
        return self.add_set(path)

    def delete_v3_group(self, name: str) -> "SNMPBatchBuilder":
        """Remove SNMPv3 group (entire node)."""
        path = self.mappers[self.mapper_key].get_v3_group_path(name)
        return self.add_delete(path)

    def set_v3_group_mode(self, name: str, mode: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 group mode (ro or rw)."""
        path = self.mappers[self.mapper_key].get_v3_group_mode(name, mode)
        return self.add_set(path)

    def set_v3_group_seclevel(self, name: str, seclevel: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 group security level (auth, priv, or noauth)."""
        path = self.mappers[self.mapper_key].get_v3_group_seclevel(name, seclevel)
        return self.add_set(path)

    def set_v3_group_view(self, name: str, view: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 group view."""
        path = self.mappers[self.mapper_key].get_v3_group_view(name, view)
        return self.add_set(path)

    # ========================================================================
    # v3 User Operations
    # ========================================================================

    def set_v3_user(self, name: str) -> "SNMPBatchBuilder":
        """Add SNMPv3 user."""
        path = self.mappers[self.mapper_key].get_v3_user(name)
        return self.add_set(path)

    def delete_v3_user(self, name: str) -> "SNMPBatchBuilder":
        """Remove SNMPv3 user (entire node)."""
        path = self.mappers[self.mapper_key].get_v3_user_path(name)
        return self.add_delete(path)

    def set_v3_user_auth_type(self, name: str, auth_type: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 user auth type (md5 or sha)."""
        path = self.mappers[self.mapper_key].get_v3_user_auth_type(name, auth_type)
        return self.add_set(path)

    def set_v3_user_auth_key(self, name: str, key: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 user auth plaintext key."""
        path = self.mappers[self.mapper_key].get_v3_user_auth_key(name, key)
        return self.add_set(path)

    def set_v3_user_privacy_type(self, name: str, privacy_type: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 user privacy type (aes or des)."""
        path = self.mappers[self.mapper_key].get_v3_user_privacy_type(name, privacy_type)
        return self.add_set(path)

    def set_v3_user_privacy_key(self, name: str, key: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 user privacy plaintext key."""
        path = self.mappers[self.mapper_key].get_v3_user_privacy_key(name, key)
        return self.add_set(path)

    def set_v3_user_group(self, name: str, group: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 user group."""
        path = self.mappers[self.mapper_key].get_v3_user_group(name, group)
        return self.add_set(path)

    def set_v3_user_mode(self, name: str, mode: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 user mode (ro or rw)."""
        path = self.mappers[self.mapper_key].get_v3_user_mode(name, mode)
        return self.add_set(path)

    # ========================================================================
    # v3 View Operations
    # ========================================================================

    def set_v3_view(self, name: str) -> "SNMPBatchBuilder":
        """Add SNMPv3 view."""
        path = self.mappers[self.mapper_key].get_v3_view(name)
        return self.add_set(path)

    def delete_v3_view(self, name: str) -> "SNMPBatchBuilder":
        """Remove SNMPv3 view (entire node)."""
        path = self.mappers[self.mapper_key].get_v3_view_path(name)
        return self.add_delete(path)

    def set_v3_view_oid(self, name: str, oid: str) -> "SNMPBatchBuilder":
        """Add OID to SNMPv3 view."""
        path = self.mappers[self.mapper_key].get_v3_view_oid(name, oid)
        return self.add_set(path)

    def delete_v3_view_oid(self, name: str, oid: str) -> "SNMPBatchBuilder":
        """Remove OID from SNMPv3 view."""
        path = self.mappers[self.mapper_key].get_v3_view_oid_path(name, oid)
        return self.add_delete(path)

    # ========================================================================
    # v3 Engine ID Operations
    # ========================================================================

    def set_v3_engineid(self, engineid: str) -> "SNMPBatchBuilder":
        """Set SNMPv3 engine ID."""
        path = self.mappers[self.mapper_key].get_v3_engineid(engineid)
        return self.add_set(path)

    def delete_v3_engineid(self) -> "SNMPBatchBuilder":
        """Delete SNMPv3 engine ID."""
        path = self.mappers[self.mapper_key].get_v3_engineid_path()
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        return {
            "version": self.version,
            "fields": {
                "communities": {"supported": True, "description": "SNMP community strings"},
                "contact": {"supported": True, "description": "System contact information"},
                "description": {"supported": True, "description": "System description"},
                "listen_addresses": {"supported": True, "description": "Addresses to listen on"},
                "location": {"supported": True, "description": "System location"},
                "trap_source": {"supported": True, "description": "Trap source address"},
                "trap_targets": {"supported": True, "description": "Trap destination targets"},
                "v3_groups": {"supported": True, "description": "SNMPv3 groups"},
                "v3_users": {"supported": True, "description": "SNMPv3 users"},
                "v3_views": {"supported": True, "description": "SNMPv3 views"},
                "v3_engineid": {"supported": True, "description": "SNMPv3 engine ID"},
            },
        }
