"""DHCPv6 Server mapper version-specific implementations."""
from .v1_4 import DHCPv6ServerMapperV1_4
from .v1_5 import DHCPv6ServerMapperV1_5


def get_dhcpv6_server_mapper(version: str):
    """Factory to get version-specific DHCPv6 Server mapper."""
    # Import here to avoid circular import
    from ..dhcpv6_server import DHCPv6ServerMapper
    # DHCPv6ServerMapper handles version differences internally via delegation
    return DHCPv6ServerMapper(version)


__all__ = ["DHCPv6ServerMapperV1_4", "DHCPv6ServerMapperV1_5", "get_dhcpv6_server_mapper"]
