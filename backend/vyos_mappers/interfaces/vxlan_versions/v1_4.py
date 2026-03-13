"""
VXLAN Interface Mapper - VyOS 1.4

VyOS 1.4-specific VXLAN interface mapper.
Inherits all base methods from VxlanInterfaceMapper.
"""

from ..vxlan import VxlanInterfaceMapper


class VxlanMapper_v1_4(VxlanInterfaceMapper):
    """VyOS 1.4 VXLAN interface mapper. Inherits all base methods."""
    pass
