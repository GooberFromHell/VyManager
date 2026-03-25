"""DHCP Relay service mapper for all VyOS versions.

Handles command path generation for DHCP Relay service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .dhcp_relay_versions import DHCPRelayMapperV1_4, DHCPRelayMapperV1_5


class DHCPRelayMapper(BaseFeatureMapper):
    """Base mapper for DHCP Relay service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = DHCPRelayMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = DHCPRelayMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = DHCPRelayMapperV1_5()

    # ==================== Server Commands ====================

    def get_server(self, address: str) -> List[str]:
        """set service dhcp-relay server <address>"""
        return ["service", "dhcp-relay", "server", address]

    def get_server_path(self, address: str) -> List[str]:
        return ["service", "dhcp-relay", "server", address]

    # ==================== Interface Commands ====================

    def get_interface(self, name: str) -> List[str]:
        """set service dhcp-relay interface <name>"""
        return ["service", "dhcp-relay", "interface", name]

    def get_interface_path(self, name: str) -> List[str]:
        return ["service", "dhcp-relay", "interface", name]

    # ==================== Relay Options ====================

    def get_hop_count(self, count: str) -> List[str]:
        """set service dhcp-relay relay-options hop-count <count>"""
        return ["service", "dhcp-relay", "relay-options", "hop-count", count]

    def get_hop_count_path(self) -> List[str]:
        return ["service", "dhcp-relay", "relay-options", "hop-count"]

    def get_max_size(self, size: str) -> List[str]:
        """set service dhcp-relay relay-options max-size <size>"""
        return ["service", "dhcp-relay", "relay-options", "max-size", size]

    def get_max_size_path(self) -> List[str]:
        return ["service", "dhcp-relay", "relay-options", "max-size"]

    def get_relay_agents_packets(self, mode: str) -> List[str]:
        """set service dhcp-relay relay-options relay-agents-packets <mode>"""
        return ["service", "dhcp-relay", "relay-options", "relay-agents-packets", mode]

    def get_relay_agents_packets_path(self) -> List[str]:
        return ["service", "dhcp-relay", "relay-options", "relay-agents-packets"]

    # ==================== Listen Address (v1.5 only - delegate) ====================

    def has_listen_address(self) -> bool:
        return self.version_mapper.has_listen_address()

    def get_listen_address(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_listen_address'):
            return self.version_mapper.get_listen_address(address)
        return []

    def get_listen_address_path(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_listen_address_path'):
            return self.version_mapper.get_listen_address_path(address)
        return []
