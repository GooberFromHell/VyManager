"""Broadcast Relay mapper version-specific implementations."""
from .v1_4 import BroadcastRelayMapperV1_4
from .v1_5 import BroadcastRelayMapperV1_5


def get_broadcast_relay_mapper(version: str):
    """Factory to get version-specific Broadcast Relay mapper."""
    # Import here to avoid circular import
    from ..broadcast_relay import BroadcastRelayMapper
    # BroadcastRelayMapper handles version differences internally via delegation
    return BroadcastRelayMapper(version)


__all__ = ["BroadcastRelayMapperV1_4", "BroadcastRelayMapperV1_5", "get_broadcast_relay_mapper"]
