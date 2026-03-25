"""VyOS 1.5 Conntrack Sync Service mapper - version-specific differences."""
from typing import List


class ConntrackSyncMapperV1_5:
    """Version-specific mapper for VyOS 1.5 conntrack-sync commands.

    Key differences in 1.5:
    - No cluster failover mechanism (deprecated)
    - Adds listen-address support (multi-value)
    - Adds event-listen-queue-size
    - Adds sync-queue-size
    - Adds startup-resync flag
    """

    def has_cluster(self) -> bool:
        return False

    def has_listen_address(self) -> bool:
        return True

    def get_listen_address(self, addr: str) -> List[str]:
        return ["service", "conntrack-sync", "listen-address", addr]

    def get_listen_address_path(self, addr: str) -> List[str]:
        return ["service", "conntrack-sync", "listen-address", addr]

    def has_event_listen_queue_size(self) -> bool:
        return True

    def get_event_listen_queue_size(self, size: str) -> List[str]:
        return ["service", "conntrack-sync", "event-listen-queue-size", size]

    def get_event_listen_queue_size_path(self) -> List[str]:
        return ["service", "conntrack-sync", "event-listen-queue-size"]

    def has_sync_queue_size(self) -> bool:
        return True

    def get_sync_queue_size(self, size: str) -> List[str]:
        return ["service", "conntrack-sync", "sync-queue-size", size]

    def get_sync_queue_size_path(self) -> List[str]:
        return ["service", "conntrack-sync", "sync-queue-size"]

    def has_startup_resync(self) -> bool:
        return True

    def get_startup_resync(self) -> List[str]:
        return ["service", "conntrack-sync", "startup-resync"]

    def get_startup_resync_path(self) -> List[str]:
        return ["service", "conntrack-sync", "startup-resync"]
