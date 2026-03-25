"""LLDP service mapper for all VyOS versions.

Handles command path generation for LLDP service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .lldp_versions import LLDPMapperV1_4, LLDPMapperV1_5


class LLDPMapper(BaseFeatureMapper):
    """Base mapper for LLDP service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = LLDPMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = LLDPMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = LLDPMapperV1_5()

    # ==================== Interface Commands ====================

    def get_interface(self, interface_name: str) -> List[str]:
        """set service lldp interface <interface-name>"""
        return ["service", "lldp", "interface", interface_name]

    def get_interface_path(self, interface_name: str) -> List[str]:
        return ["service", "lldp", "interface", interface_name]

    # ==================== Interface Disable ====================

    def get_interface_disable(self, interface_name: str) -> List[str]:
        """set service lldp interface <interface-name> disable"""
        return ["service", "lldp", "interface", interface_name, "disable"]

    def get_interface_disable_path(self, interface_name: str) -> List[str]:
        return ["service", "lldp", "interface", interface_name, "disable"]

    # ==================== Interface Location ELIN ====================

    def get_interface_location_elin(self, interface_name: str, elin: str) -> List[str]:
        """set service lldp interface <interface-name> location elin <phone>"""
        return ["service", "lldp", "interface", interface_name, "location", "elin", elin]

    def get_interface_location_elin_path(self, interface_name: str) -> List[str]:
        return ["service", "lldp", "interface", interface_name, "location", "elin"]

    # ==================== SNMP Enable ====================

    def get_snmp_enable(self) -> List[str]:
        """set service lldp snmp enable"""
        return ["service", "lldp", "snmp", "enable"]

    def get_snmp_enable_path(self) -> List[str]:
        return ["service", "lldp", "snmp", "enable"]

    # ==================== Legacy Protocols (v1.4 only - delegate) ====================

    def has_legacy_protocols(self) -> bool:
        return self.version_mapper.has_legacy_protocols()

    def get_legacy_protocol(self, protocol: str) -> List[str]:
        """set service lldp legacy-protocols <protocol> (v1.4 only)"""
        if hasattr(self.version_mapper, 'get_legacy_protocol'):
            return self.version_mapper.get_legacy_protocol(protocol)
        return []

    def get_legacy_protocol_path(self, protocol: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_legacy_protocol_path'):
            return self.version_mapper.get_legacy_protocol_path(protocol)
        return []

    # ==================== Management Address (v1.5 only - delegate) ====================

    def has_management_address(self) -> bool:
        return self.version_mapper.has_management_address()

    def get_management_address(self, ip: str) -> List[str]:
        """set service lldp management-address <ip> (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_management_address'):
            return self.version_mapper.get_management_address(ip)
        return []

    def get_management_address_path(self, ip: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_management_address_path'):
            return self.version_mapper.get_management_address_path(ip)
        return []
