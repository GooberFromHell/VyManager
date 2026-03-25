"""Broadcast Relay service mapper for all VyOS versions.

Handles command path generation for broadcast relay instance configuration.
Broadcast relay is stable across VyOS 1.4 and 1.5 with no version-specific
differences — both version subclasses are empty overrides.
"""
from typing import List
from ..base import BaseFeatureMapper
from .broadcast_relay_versions import BroadcastRelayMapperV1_4, BroadcastRelayMapperV1_5


class BroadcastRelayMapper(BaseFeatureMapper):
    """Mapper for broadcast relay service configuration commands.

    Relay instances are keyed by a numeric ID (1-99). Each instance can have
    a description, one or more interfaces, a destination broadcast address,
    a UDP port, and an optional disable flag.
    """

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = BroadcastRelayMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = BroadcastRelayMapperV1_5()
        else:
            # Default to v1.5 for unknown versions
            self.version_mapper = BroadcastRelayMapperV1_5()

    # ==================== Relay ID (top-level node) ====================

    def get_id(self, relay_id: str) -> List[str]:
        """set service broadcast-relay id <relay_id>"""
        return ["service", "broadcast-relay", "id", relay_id]

    def get_id_path(self, relay_id: str) -> List[str]:
        return ["service", "broadcast-relay", "id", relay_id]

    # ==================== Description ====================

    def get_description(self, relay_id: str, desc: str) -> List[str]:
        """set service broadcast-relay id <relay_id> description <desc>"""
        return ["service", "broadcast-relay", "id", relay_id, "description", desc]

    def get_description_path(self, relay_id: str) -> List[str]:
        return ["service", "broadcast-relay", "id", relay_id, "description"]

    # ==================== Interface ====================

    def get_interface(self, relay_id: str, iface: str) -> List[str]:
        """set service broadcast-relay id <relay_id> interface <iface>"""
        return ["service", "broadcast-relay", "id", relay_id, "interface", iface]

    def get_interface_path(self, relay_id: str, iface: str) -> List[str]:
        return ["service", "broadcast-relay", "id", relay_id, "interface", iface]

    # ==================== Address ====================

    def get_address(self, relay_id: str, addr: str) -> List[str]:
        """set service broadcast-relay id <relay_id> address <addr>"""
        return ["service", "broadcast-relay", "id", relay_id, "address", addr]

    def get_address_path(self, relay_id: str) -> List[str]:
        return ["service", "broadcast-relay", "id", relay_id, "address"]

    # ==================== Port ====================

    def get_port(self, relay_id: str, port: str) -> List[str]:
        """set service broadcast-relay id <relay_id> port <port>"""
        return ["service", "broadcast-relay", "id", relay_id, "port", port]

    def get_port_path(self, relay_id: str) -> List[str]:
        return ["service", "broadcast-relay", "id", relay_id, "port"]

    # ==================== Disable ====================

    def get_disable(self, relay_id: str) -> List[str]:
        """set service broadcast-relay id <relay_id> disable"""
        return ["service", "broadcast-relay", "id", relay_id, "disable"]

    def get_disable_path(self, relay_id: str) -> List[str]:
        return ["service", "broadcast-relay", "id", relay_id, "disable"]
