"""VyOS 1.4 LLDP service mapper - version-specific differences."""
from typing import List


class LLDPMapperV1_4:
    """VyOS 1.4 LLDP - has legacy-protocols, no management-address."""

    def has_legacy_protocols(self) -> bool:
        return True

    def has_management_address(self) -> bool:
        return False

    def get_legacy_protocol(self, protocol: str) -> List[str]:
        return ["service", "lldp", "legacy-protocols", protocol]

    def get_legacy_protocol_path(self, protocol: str) -> List[str]:
        return ["service", "lldp", "legacy-protocols", protocol]
