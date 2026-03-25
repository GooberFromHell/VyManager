# Canonical Backend Mapper Pattern
# Source: backend/vyos_mappers/ntp/ntp.py + ntp_versions/
# Used by DERPO agents as the reference implementation for new feature mappers.

from typing import List
from backend.vyos_mappers.base import BaseFeatureMapper

# --- Version-specific classes (in {feature}_versions/v1_4.py) ---

class NTPMapperV1_4:
    """V1.4 — returns False for v1.5-only capabilities"""
    def has_ptp(self) -> bool:
        return False
    def has_interleave(self) -> bool:
        return False


# --- Version-specific classes (in {feature}_versions/v1_5.py) ---

class NTPMapperV1_5(NTPMapperV1_4):
    """V1.5 — extends v1.4 with additional methods"""
    def has_ptp(self) -> bool:
        return True
    def has_interleave(self) -> bool:
        return True

    def get_server_ptp(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "ptp"]

    def get_server_interleave(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "interleave"]

    def get_ptp(self) -> List[str]:
        return ["service", "ntp", "ptp"]

    def get_ptp_path(self) -> List[str]:
        return ["service", "ntp", "ptp"]


# --- Factory function (in {feature}_versions/__init__.py) ---

def get_ntp_mapper(version: str):
    from ..ntp import NTPMapper
    return NTPMapper(version)

__all__ = ["NTPMapperV1_4", "NTPMapperV1_5", "get_ntp_mapper"]


# --- Main Mapper Class (in {feature}/{feature}.py) ---

class NTPMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = NTPMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = NTPMapperV1_5()
        else:
            self.version_mapper = NTPMapperV1_5()  # default to latest

    # --- Standard methods (return List[str] command path) ---

    def get_server(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address]

    def get_server_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address]

    def get_listen_address(self, address: str) -> List[str]:
        return ["service", "ntp", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "ntp", "listen-address", address]

    # --- Version-delegated methods ---
    # Pattern: check hasattr → delegate → return [] if unsupported

    def get_server_ptp(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_server_ptp'):
            return self.version_mapper.get_server_ptp(address)
        return []

    def get_ptp(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp'):
            return self.version_mapper.get_ptp()
        return []

    def get_ptp_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp_path'):
            return self.version_mapper.get_ptp_path()
        return []
