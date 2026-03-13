"""Tunnel Interface Mapper - Version-Specific Implementations"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..tunnel import TunnelInterfaceMapper


def get_tunnel_mapper(version: str) -> "TunnelInterfaceMapper":
    from .v1_4 import TunnelMapper_v1_4
    from .v1_5 import TunnelMapper_v1_5

    version_map = {
        "1.4": TunnelMapper_v1_4,
        "1.5": TunnelMapper_v1_5,
    }
    mapper_class = version_map.get(version, TunnelMapper_v1_5)
    return mapper_class(version)


__all__ = ["get_tunnel_mapper"]
