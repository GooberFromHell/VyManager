"""NTP mapper version-specific implementations."""
from .v1_4 import NTPMapperV1_4
from .v1_5 import NTPMapperV1_5


def get_ntp_mapper(version: str):
    """Factory to get version-specific NTP mapper."""
    # Import here to avoid circular import
    from ..ntp import NTPMapper
    # NTPMapper handles version differences internally via delegation
    return NTPMapper(version)


__all__ = ["NTPMapperV1_4", "NTPMapperV1_5", "get_ntp_mapper"]
