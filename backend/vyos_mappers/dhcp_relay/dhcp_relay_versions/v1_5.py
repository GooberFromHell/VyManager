"""VyOS 1.5 DHCP Relay service mapper - version-specific differences."""
from typing import List


class DHCPRelayMapperV1_5:
    """VyOS 1.5 DHCP Relay - adds listen-address."""

    def has_listen_address(self) -> bool:
        return True

    def get_listen_address(self, address: str) -> List[str]:
        return ["service", "dhcp-relay", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "dhcp-relay", "listen-address", address]
