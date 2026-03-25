"""LLDP mapper version-specific implementations."""
from .v1_4 import LLDPMapperV1_4
from .v1_5 import LLDPMapperV1_5


def get_lldp_mapper(version: str):
    """Factory to get version-specific LLDP mapper."""
    # Import here to avoid circular import
    from ..lldp import LLDPMapper
    # LLDPMapper handles version differences internally via delegation
    return LLDPMapper(version)


__all__ = ["LLDPMapperV1_4", "LLDPMapperV1_5", "get_lldp_mapper"]
