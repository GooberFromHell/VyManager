"""
Interface API Routers

FastAPI routers for different interface types.
"""

from . import ethernet, dummy, vxlan

__all__ = ["ethernet", "dummy", "vxlan"]
