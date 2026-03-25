"""SNMP service mapper for all VyOS versions.

Handles command path generation for SNMP service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .snmp_versions import SNMPMapperV1_4, SNMPMapperV1_5


class SNMPMapper(BaseFeatureMapper):
    """Base mapper for SNMP service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = SNMPMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = SNMPMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = SNMPMapperV1_5()

    # ==================== Community Commands ====================

    def get_community(self, name: str) -> List[str]:
        """set service snmp community <name>"""
        return ["service", "snmp", "community", name]

    def get_community_path(self, name: str) -> List[str]:
        return ["service", "snmp", "community", name]

    def get_community_authorization(self, name: str, authorization: str) -> List[str]:
        """set service snmp community <name> authorization <ro|rw>"""
        return ["service", "snmp", "community", name, "authorization", authorization]

    def get_community_authorization_path(self, name: str) -> List[str]:
        return ["service", "snmp", "community", name, "authorization"]

    def get_community_client(self, name: str, ip: str) -> List[str]:
        """set service snmp community <name> client <ip>"""
        return ["service", "snmp", "community", name, "client", ip]

    def get_community_client_path(self, name: str, ip: str) -> List[str]:
        return ["service", "snmp", "community", name, "client", ip]

    def get_community_network(self, name: str, cidr: str) -> List[str]:
        """set service snmp community <name> network <cidr>"""
        return ["service", "snmp", "community", name, "network", cidr]

    def get_community_network_path(self, name: str, cidr: str) -> List[str]:
        return ["service", "snmp", "community", name, "network", cidr]

    # ==================== Global Commands ====================

    def get_contact(self, contact: str) -> List[str]:
        """set service snmp contact <string>"""
        return ["service", "snmp", "contact", contact]

    def get_contact_path(self) -> List[str]:
        return ["service", "snmp", "contact"]

    def get_description(self, description: str) -> List[str]:
        """set service snmp description <string>"""
        return ["service", "snmp", "description", description]

    def get_description_path(self) -> List[str]:
        return ["service", "snmp", "description"]

    def get_listen_address(self, address: str) -> List[str]:
        """set service snmp listen-address <ip>"""
        return ["service", "snmp", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "snmp", "listen-address", address]

    def get_listen_address_port(self, address: str, port: str) -> List[str]:
        """set service snmp listen-address <ip> port <port>"""
        return ["service", "snmp", "listen-address", address, "port", port]

    def get_listen_address_port_path(self, address: str) -> List[str]:
        return ["service", "snmp", "listen-address", address, "port"]

    def get_location(self, location: str) -> List[str]:
        """set service snmp location <string>"""
        return ["service", "snmp", "location", location]

    def get_location_path(self) -> List[str]:
        return ["service", "snmp", "location"]

    def get_trap_source(self, address: str) -> List[str]:
        """set service snmp trap-source <ip>"""
        return ["service", "snmp", "trap-source", address]

    def get_trap_source_path(self) -> List[str]:
        return ["service", "snmp", "trap-source"]

    # ==================== Trap Target Commands ====================

    def get_trap_target(self, address: str) -> List[str]:
        """set service snmp trap-target <ip>"""
        return ["service", "snmp", "trap-target", address]

    def get_trap_target_path(self, address: str) -> List[str]:
        return ["service", "snmp", "trap-target", address]

    def get_trap_target_community(self, address: str, community: str) -> List[str]:
        """set service snmp trap-target <ip> community <name>"""
        return ["service", "snmp", "trap-target", address, "community", community]

    def get_trap_target_community_path(self, address: str) -> List[str]:
        return ["service", "snmp", "trap-target", address, "community"]

    def get_trap_target_port(self, address: str, port: str) -> List[str]:
        """set service snmp trap-target <ip> port <port>"""
        return ["service", "snmp", "trap-target", address, "port", port]

    def get_trap_target_port_path(self, address: str) -> List[str]:
        return ["service", "snmp", "trap-target", address, "port"]

    # ==================== v3 Group Commands ====================

    def get_v3_group(self, name: str) -> List[str]:
        """set service snmp v3 group <name>"""
        return ["service", "snmp", "v3", "group", name]

    def get_v3_group_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "group", name]

    def get_v3_group_mode(self, name: str, mode: str) -> List[str]:
        """set service snmp v3 group <name> mode <ro|rw>"""
        return ["service", "snmp", "v3", "group", name, "mode", mode]

    def get_v3_group_mode_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "group", name, "mode"]

    def get_v3_group_seclevel(self, name: str, seclevel: str) -> List[str]:
        """set service snmp v3 group <name> seclevel <auth|priv|noauth>"""
        return ["service", "snmp", "v3", "group", name, "seclevel", seclevel]

    def get_v3_group_seclevel_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "group", name, "seclevel"]

    def get_v3_group_view(self, name: str, view: str) -> List[str]:
        """set service snmp v3 group <name> view <view-name>"""
        return ["service", "snmp", "v3", "group", name, "view", view]

    def get_v3_group_view_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "group", name, "view"]

    # ==================== v3 User Commands ====================

    def get_v3_user(self, name: str) -> List[str]:
        """set service snmp v3 user <name>"""
        return ["service", "snmp", "v3", "user", name]

    def get_v3_user_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name]

    def get_v3_user_auth_type(self, name: str, auth_type: str) -> List[str]:
        """set service snmp v3 user <name> auth type <md5|sha>"""
        return ["service", "snmp", "v3", "user", name, "auth", "type", auth_type]

    def get_v3_user_auth_type_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name, "auth", "type"]

    def get_v3_user_auth_key(self, name: str, key: str) -> List[str]:
        """set service snmp v3 user <name> auth plaintext-key <key>"""
        return ["service", "snmp", "v3", "user", name, "auth", "plaintext-key", key]

    def get_v3_user_auth_key_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name, "auth", "plaintext-key"]

    def get_v3_user_privacy_type(self, name: str, privacy_type: str) -> List[str]:
        """set service snmp v3 user <name> privacy type <aes|des>"""
        return ["service", "snmp", "v3", "user", name, "privacy", "type", privacy_type]

    def get_v3_user_privacy_type_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name, "privacy", "type"]

    def get_v3_user_privacy_key(self, name: str, key: str) -> List[str]:
        """set service snmp v3 user <name> privacy plaintext-key <key>"""
        return ["service", "snmp", "v3", "user", name, "privacy", "plaintext-key", key]

    def get_v3_user_privacy_key_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name, "privacy", "plaintext-key"]

    def get_v3_user_group(self, name: str, group: str) -> List[str]:
        """set service snmp v3 user <name> group <group-name>"""
        return ["service", "snmp", "v3", "user", name, "group", group]

    def get_v3_user_group_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name, "group"]

    def get_v3_user_mode(self, name: str, mode: str) -> List[str]:
        """set service snmp v3 user <name> mode <ro|rw>"""
        return ["service", "snmp", "v3", "user", name, "mode", mode]

    def get_v3_user_mode_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "user", name, "mode"]

    # ==================== v3 View Commands ====================

    def get_v3_view(self, name: str) -> List[str]:
        """set service snmp v3 view <name>"""
        return ["service", "snmp", "v3", "view", name]

    def get_v3_view_path(self, name: str) -> List[str]:
        return ["service", "snmp", "v3", "view", name]

    def get_v3_view_oid(self, name: str, oid: str) -> List[str]:
        """set service snmp v3 view <name> oid <oid>"""
        return ["service", "snmp", "v3", "view", name, "oid", oid]

    def get_v3_view_oid_path(self, name: str, oid: str) -> List[str]:
        return ["service", "snmp", "v3", "view", name, "oid", oid]

    # ==================== v3 Engine ID ====================

    def get_v3_engineid(self, engineid: str) -> List[str]:
        """set service snmp v3 engineid <hex>"""
        return ["service", "snmp", "v3", "engineid", engineid]

    def get_v3_engineid_path(self) -> List[str]:
        return ["service", "snmp", "v3", "engineid"]
