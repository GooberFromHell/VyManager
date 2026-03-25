"""
Conntrack Sync Service Batch Builder

Provides all conntrack-sync batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class ConntrackSyncBatchBuilder:
    """Complete batch builder for conntrack-sync service operations."""

    def __init__(self, version: str):
        """Initialize conntrack-sync batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "conntrack_sync"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "ConntrackSyncBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ConntrackSyncBatchBuilder":
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
    # Accept Protocol
    # ========================================================================

    def set_accept_protocol(self, protocol: str) -> "ConntrackSyncBatchBuilder":
        """Add an accept-protocol entry."""
        path = self.mappers[self.mapper_key].get_accept_protocol(protocol)
        return self.add_set(path)

    def delete_accept_protocol(self, protocol: str) -> "ConntrackSyncBatchBuilder":
        """Remove an accept-protocol entry."""
        path = self.mappers[self.mapper_key].get_accept_protocol_path(protocol)
        return self.add_delete(path)

    # ========================================================================
    # Disable External Cache
    # ========================================================================

    def set_disable_external_cache(self) -> "ConntrackSyncBatchBuilder":
        """Enable disable-external-cache flag."""
        path = self.mappers[self.mapper_key].get_disable_external_cache()
        return self.add_set(path)

    def delete_disable_external_cache(self) -> "ConntrackSyncBatchBuilder":
        """Remove disable-external-cache flag."""
        path = self.mappers[self.mapper_key].get_disable_external_cache_path()
        return self.add_delete(path)

    # ========================================================================
    # Expect Sync
    # ========================================================================

    def set_expect_sync(self, module: str) -> "ConntrackSyncBatchBuilder":
        """Add an expect-sync module."""
        path = self.mappers[self.mapper_key].get_expect_sync(module)
        return self.add_set(path)

    def delete_expect_sync(self, module: str) -> "ConntrackSyncBatchBuilder":
        """Remove an expect-sync module."""
        path = self.mappers[self.mapper_key].get_expect_sync_path(module)
        return self.add_delete(path)

    # ========================================================================
    # Failover Mechanism - VRRP
    # ========================================================================

    def set_failover_mechanism_vrrp_sync_group(self, name: str) -> "ConntrackSyncBatchBuilder":
        """Set the VRRP sync-group for failover mechanism."""
        path = self.mappers[self.mapper_key].get_failover_mechanism_vrrp_sync_group(name)
        return self.add_set(path)

    def delete_failover_mechanism_vrrp_sync_group(self) -> "ConntrackSyncBatchBuilder":
        """Delete the VRRP sync-group for failover mechanism."""
        path = self.mappers[self.mapper_key].get_failover_mechanism_vrrp_sync_group_path()
        return self.add_delete(path)

    # ========================================================================
    # Failover Mechanism - Cluster (v1.4 only)
    # ========================================================================

    def set_failover_mechanism_cluster_group(self, name: str) -> "ConntrackSyncBatchBuilder":
        """Set the cluster group for failover mechanism (v1.4 only)."""
        path = self.mappers[self.mapper_key].get_failover_mechanism_cluster_group(name)
        return self.add_set(path)

    def delete_failover_mechanism_cluster_group(self) -> "ConntrackSyncBatchBuilder":
        """Delete the cluster group for failover mechanism (v1.4 only)."""
        path = self.mappers[self.mapper_key].get_failover_mechanism_cluster_group_path()
        return self.add_delete(path)

    # ========================================================================
    # Interface
    # ========================================================================

    def set_interface(self, iface: str) -> "ConntrackSyncBatchBuilder":
        """Add a sync interface."""
        path = self.mappers[self.mapper_key].get_interface(iface)
        return self.add_set(path)

    def delete_interface(self, iface: str) -> "ConntrackSyncBatchBuilder":
        """Remove a sync interface."""
        path = self.mappers[self.mapper_key].get_interface_path(iface)
        return self.add_delete(path)

    def set_interface_port(self, iface: str, port: str) -> "ConntrackSyncBatchBuilder":
        """Set the port for a sync interface."""
        path = self.mappers[self.mapper_key].get_interface_port(iface, port)
        return self.add_set(path)

    def delete_interface_port(self, iface: str) -> "ConntrackSyncBatchBuilder":
        """Delete the port for a sync interface."""
        path = self.mappers[self.mapper_key].get_interface_port_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Mcast Group
    # ========================================================================

    def set_mcast_group(self, addr: str) -> "ConntrackSyncBatchBuilder":
        """Set the multicast group address."""
        path = self.mappers[self.mapper_key].get_mcast_group(addr)
        return self.add_set(path)

    def delete_mcast_group(self) -> "ConntrackSyncBatchBuilder":
        """Delete the multicast group address."""
        path = self.mappers[self.mapper_key].get_mcast_group_path()
        return self.add_delete(path)

    # ========================================================================
    # Listen Address (v1.5 only)
    # ========================================================================

    def set_listen_address(self, addr: str) -> "ConntrackSyncBatchBuilder":
        """Add a listen address (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_listen_address(addr)
        return self.add_set(path)

    def delete_listen_address(self, addr: str) -> "ConntrackSyncBatchBuilder":
        """Remove a listen address (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_listen_address_path(addr)
        return self.add_delete(path)

    # ========================================================================
    # Event Listen Queue Size (v1.5 only)
    # ========================================================================

    def set_event_listen_queue_size(self, size: str) -> "ConntrackSyncBatchBuilder":
        """Set event-listen-queue-size (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_event_listen_queue_size(size)
        return self.add_set(path)

    def delete_event_listen_queue_size(self) -> "ConntrackSyncBatchBuilder":
        """Delete event-listen-queue-size (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_event_listen_queue_size_path()
        return self.add_delete(path)

    # ========================================================================
    # Sync Queue Size (v1.5 only)
    # ========================================================================

    def set_sync_queue_size(self, size: str) -> "ConntrackSyncBatchBuilder":
        """Set sync-queue-size (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_sync_queue_size(size)
        return self.add_set(path)

    def delete_sync_queue_size(self) -> "ConntrackSyncBatchBuilder":
        """Delete sync-queue-size (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_sync_queue_size_path()
        return self.add_delete(path)

    # ========================================================================
    # Startup Resync (v1.5 only)
    # ========================================================================

    def set_startup_resync(self) -> "ConntrackSyncBatchBuilder":
        """Enable startup-resync flag (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_startup_resync()
        return self.add_set(path)

    def delete_startup_resync(self) -> "ConntrackSyncBatchBuilder":
        """Disable startup-resync flag (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_startup_resync_path()
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        mapper = self.mappers[self.mapper_key]
        return {
            "version": self.version,
            "has_cluster": mapper.has_cluster(),
            "has_listen_address": mapper.has_listen_address(),
            "has_event_listen_queue_size": mapper.has_event_listen_queue_size(),
            "has_sync_queue_size": mapper.has_sync_queue_size(),
            "has_startup_resync": mapper.has_startup_resync(),
            "fields": {
                "accept_protocol": {"supported": True, "description": "Protocols to accept (tcp, udp, icmp)"},
                "disable_external_cache": {"supported": True, "description": "Disable external cache flag"},
                "expect_sync": {"supported": True, "description": "Expect sync modules (ftp, h323, nfs, sip, sqlnet)"},
                "failover_mechanism_vrrp": {"supported": True, "description": "VRRP-based failover mechanism"},
                "failover_mechanism_cluster": {"supported": mapper.has_cluster(), "description": "Cluster-based failover (v1.4 only)"},
                "interface": {"supported": True, "description": "Sync interfaces with optional port"},
                "mcast_group": {"supported": True, "description": "Multicast group address"},
                "listen_address": {"supported": mapper.has_listen_address(), "description": "Listen addresses (v1.5+)"},
                "event_listen_queue_size": {"supported": mapper.has_event_listen_queue_size(), "description": "Event listen queue size (v1.5+)"},
                "sync_queue_size": {"supported": mapper.has_sync_queue_size(), "description": "Sync queue size (v1.5+)"},
                "startup_resync": {"supported": mapper.has_startup_resync(), "description": "Startup resync flag (v1.5+)"},
            },
        }
