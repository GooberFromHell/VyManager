"""
Interface API Routers

FastAPI routers for different interface types.
"""

from . import ethernet, dummy, tunnel, vxlan

__all__ = ["ethernet", "dummy", "tunnel", "vxlan"]
