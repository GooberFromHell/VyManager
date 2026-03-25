"""DHCP Relay mapper version-specific implementations."""
from .v1_4 import DHCPRelayMapperV1_4
from .v1_5 import DHCPRelayMapperV1_5


def get_dhcp_relay_mapper(version: str):
    """Factory to get version-specific DHCP Relay mapper."""
    # Import here to avoid circular import
    from ..dhcp_relay import DHCPRelayMapper
    # DHCPRelayMapper handles version differences internally via delegation
    return DHCPRelayMapper(version)


__all__ = ["DHCPRelayMapperV1_4", "DHCPRelayMapperV1_5", "get_dhcp_relay_mapper"]
