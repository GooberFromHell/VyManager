"""VyOS 1.5 LLDP service mapper - version-specific differences."""
from typing import List


class LLDPMapperV1_5:
    """VyOS 1.5 LLDP - removes legacy-protocols, adds management-address."""

    def has_legacy_protocols(self) -> bool:
        return False

    def has_management_address(self) -> bool:
        return True

    def get_management_address(self, ip: str) -> List[str]:
        return ["service", "lldp", "management-address", ip]

    def get_management_address_path(self, ip: str) -> List[str]:
        return ["service", "lldp", "management-address", ip]
