"""DNS Forwarding mapper version-specific implementations."""
from .v1_4 import DNSForwardingMapperV1_4
from .v1_5 import DNSForwardingMapperV1_5


def get_dns_forwarding_mapper(version: str):
    """Factory to get version-specific DNS Forwarding mapper."""
    from ..dns_forwarding import DNSForwardingMapper
    return DNSForwardingMapper(version)


__all__ = ["DNSForwardingMapperV1_4", "DNSForwardingMapperV1_5", "get_dns_forwarding_mapper"]
