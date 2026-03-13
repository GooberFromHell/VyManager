"""
VXLAN Interface Mapper - VyOS 1.5

VyOS 1.5-specific VXLAN interface mapper.
Inherits all base methods from VxlanInterfaceMapper.
"""

from ..vxlan import VxlanInterfaceMapper


class VxlanMapper_v1_5(VxlanInterfaceMapper):
    """VyOS 1.5 VXLAN interface mapper. Inherits all base methods."""
    pass
