"""Conntrack Sync Service mapper for all VyOS versions.

Handles command path generation for conntrack-sync service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .conntrack_sync_versions import ConntrackSyncMapperV1_4, ConntrackSyncMapperV1_5


class ConntrackSyncMapper(BaseFeatureMapper):
    """Base mapper for conntrack-sync service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = ConntrackSyncMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = ConntrackSyncMapperV1_5()
        else:
            self.version_mapper = ConntrackSyncMapperV1_5()

    # ==================== Accept Protocol ====================

    def get_accept_protocol(self, protocol: str) -> List[str]:
        return ["service", "conntrack-sync", "accept-protocol", protocol]

    def get_accept_protocol_path(self, protocol: str) -> List[str]:
        return ["service", "conntrack-sync", "accept-protocol", protocol]

    # ==================== Disable External Cache ====================

    def get_disable_external_cache(self) -> List[str]:
        return ["service", "conntrack-sync", "disable-external-cache"]

    def get_disable_external_cache_path(self) -> List[str]:
        return ["service", "conntrack-sync", "disable-external-cache"]

    # ==================== Expect Sync ====================

    def get_expect_sync(self, module: str) -> List[str]:
        return ["service", "conntrack-sync", "expect-sync", module]

    def get_expect_sync_path(self, module: str) -> List[str]:
        return ["service", "conntrack-sync", "expect-sync", module]

    # ==================== Failover Mechanism - VRRP ====================

    def get_failover_mechanism_vrrp_sync_group(self, name: str) -> List[str]:
        return ["service", "conntrack-sync", "failover-mechanism", "vrrp", "sync-group", name]

    def get_failover_mechanism_vrrp_sync_group_path(self) -> List[str]:
        return ["service", "conntrack-sync", "failover-mechanism", "vrrp", "sync-group"]

    # ==================== Interface ====================

    def get_interface(self, iface: str) -> List[str]:
        return ["service", "conntrack-sync", "interface", iface]

    def get_interface_path(self, iface: str) -> List[str]:
        return ["service", "conntrack-sync", "interface", iface]

    def get_interface_port(self, iface: str, port: str) -> List[str]:
        return ["service", "conntrack-sync", "interface", iface, "port", port]

    def get_interface_port_path(self, iface: str) -> List[str]:
        return ["service", "conntrack-sync", "interface", iface, "port"]

    # ==================== Mcast Group ====================

    def get_mcast_group(self, addr: str) -> List[str]:
        return ["service", "conntrack-sync", "mcast-group", addr]

    def get_mcast_group_path(self) -> List[str]:
        return ["service", "conntrack-sync", "mcast-group"]

    # ==================== Version-delegated: cluster (v1.4 only) ====================

    def has_cluster(self) -> bool:
        return self.version_mapper.has_cluster()

    def get_failover_mechanism_cluster_group(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, "get_failover_mechanism_cluster_group"):
            return self.version_mapper.get_failover_mechanism_cluster_group(name)
        return []

    def get_failover_mechanism_cluster_group_path(self) -> List[str]:
        if hasattr(self.version_mapper, "get_failover_mechanism_cluster_group_path"):
            return self.version_mapper.get_failover_mechanism_cluster_group_path()
        return []

    # ==================== Version-delegated: listen-address (v1.5 only) ====================

    def has_listen_address(self) -> bool:
        return self.version_mapper.has_listen_address()

    def get_listen_address(self, addr: str) -> List[str]:
        if hasattr(self.version_mapper, "get_listen_address"):
            return self.version_mapper.get_listen_address(addr)
        return []

    def get_listen_address_path(self, addr: str) -> List[str]:
        if hasattr(self.version_mapper, "get_listen_address_path"):
            return self.version_mapper.get_listen_address_path(addr)
        return []

    # ==================== Version-delegated: event-listen-queue-size (v1.5 only) ====================

    def has_event_listen_queue_size(self) -> bool:
        return self.version_mapper.has_event_listen_queue_size()

    def get_event_listen_queue_size(self, size: str) -> List[str]:
        if hasattr(self.version_mapper, "get_event_listen_queue_size"):
            return self.version_mapper.get_event_listen_queue_size(size)
        return []

    def get_event_listen_queue_size_path(self) -> List[str]:
        if hasattr(self.version_mapper, "get_event_listen_queue_size_path"):
            return self.version_mapper.get_event_listen_queue_size_path()
        return []

    # ==================== Version-delegated: sync-queue-size (v1.5 only) ====================

    def has_sync_queue_size(self) -> bool:
        return self.version_mapper.has_sync_queue_size()

    def get_sync_queue_size(self, size: str) -> List[str]:
        if hasattr(self.version_mapper, "get_sync_queue_size"):
            return self.version_mapper.get_sync_queue_size(size)
        return []

    def get_sync_queue_size_path(self) -> List[str]:
        if hasattr(self.version_mapper, "get_sync_queue_size_path"):
            return self.version_mapper.get_sync_queue_size_path()
        return []

    # ==================== Version-delegated: startup-resync (v1.5 only) ====================

    def has_startup_resync(self) -> bool:
        return self.version_mapper.has_startup_resync()

    def get_startup_resync(self) -> List[str]:
        if hasattr(self.version_mapper, "get_startup_resync"):
            return self.version_mapper.get_startup_resync()
        return []

    def get_startup_resync_path(self) -> List[str]:
        if hasattr(self.version_mapper, "get_startup_resync_path"):
            return self.version_mapper.get_startup_resync_path()
        return []
