"""SNMP mapper version-specific implementations."""
from .v1_4 import SNMPMapperV1_4
from .v1_5 import SNMPMapperV1_5


def get_snmp_mapper(version: str):
    """Factory to get version-specific SNMP mapper."""
    # Import here to avoid circular import
    from ..snmp import SNMPMapper
    # SNMPMapper handles version differences internally via delegation
    return SNMPMapper(version)


__all__ = ["SNMPMapperV1_4", "SNMPMapperV1_5", "get_snmp_mapper"]
