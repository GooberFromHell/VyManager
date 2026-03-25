"""VyOS 1.4 DHCP Relay service mapper - version-specific differences."""


class DHCPRelayMapperV1_4:
    """VyOS 1.4 DHCP Relay - no listen-address."""

    def has_listen_address(self) -> bool:
        return False
