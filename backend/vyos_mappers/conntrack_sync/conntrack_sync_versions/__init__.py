"""Conntrack Sync mapper version-specific implementations."""
from .v1_4 import ConntrackSyncMapperV1_4
from .v1_5 import ConntrackSyncMapperV1_5


def get_conntrack_sync_mapper(version: str):
    """Factory to get version-specific conntrack-sync mapper."""
    from ..conntrack_sync import ConntrackSyncMapper
    return ConntrackSyncMapper(version)


__all__ = ["ConntrackSyncMapperV1_4", "ConntrackSyncMapperV1_5", "get_conntrack_sync_mapper"]
