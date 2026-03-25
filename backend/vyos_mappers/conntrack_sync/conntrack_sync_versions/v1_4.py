"""VyOS 1.4 Conntrack Sync Service mapper - version-specific differences."""
from typing import List


class ConntrackSyncMapperV1_4:
    """Version-specific mapper for VyOS 1.4 conntrack-sync commands.

    Key differences in 1.4:
    - Supports 'cluster' failover mechanism (deprecated in v1.5)
    - No listen-address support
    - No event-listen-queue-size support
    - No sync-queue-size support
    - No startup-resync support
    """

    def has_cluster(self) -> bool:
        return True

    def get_failover_mechanism_cluster_group(self, name: str) -> List[str]:
        return ["service", "conntrack-sync", "failover-mechanism", "cluster", "group", name]

    def get_failover_mechanism_cluster_group_path(self) -> List[str]:
        return ["service", "conntrack-sync", "failover-mechanism", "cluster", "group"]

    def has_listen_address(self) -> bool:
        return False

    def has_event_listen_queue_size(self) -> bool:
        return False

    def has_sync_queue_size(self) -> bool:
        return False

    def has_startup_resync(self) -> bool:
        return False
