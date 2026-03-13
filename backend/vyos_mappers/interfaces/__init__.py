"""
Interface Mappers

Handles version-specific command translation for different interface types.
"""

from .ethernet import EthernetInterfaceMapper
from .dummy import DummyInterfaceMapper
from .tunnel import TunnelInterfaceMapper
from .vxlan import VxlanInterfaceMapper

__all__ = [
    "EthernetInterfaceMapper",
    "DummyInterfaceMapper",
    "TunnelInterfaceMapper",
    "VxlanInterfaceMapper",
]
