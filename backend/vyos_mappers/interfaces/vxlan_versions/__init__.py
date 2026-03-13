"""
VXLAN Interface Mapper - Version-Specific Implementations

Factory module for creating version-specific VXLAN interface mappers.
"""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..vxlan import VxlanInterfaceMapper


def get_vxlan_mapper(version: str) -> "VxlanInterfaceMapper":
    """
    Factory function to get the appropriate VXLAN mapper for a VyOS version.

    Args:
        version: VyOS version string (e.g., "1.4", "1.5")

    Returns:
        Version-specific VxlanInterfaceMapper instance

    Examples:
        >>> mapper = get_vxlan_mapper("1.4")
        >>> mapper = get_vxlan_mapper("1.5")
    """
    from .v1_4 import VxlanMapper_v1_4
    from .v1_5 import VxlanMapper_v1_5

    version_map = {
        "1.4": VxlanMapper_v1_4,
        "1.5": VxlanMapper_v1_5,
    }

    # Get mapper class for version, fallback to latest (1.5) for unknown versions
    mapper_class = version_map.get(version, VxlanMapper_v1_5)

    return mapper_class(version)


__all__ = ["get_vxlan_mapper"]
