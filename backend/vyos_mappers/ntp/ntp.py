"""NTP service mapper for all VyOS versions.

Handles command path generation for NTP service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .ntp_versions import NTPMapperV1_4, NTPMapperV1_5


class NTPMapper(BaseFeatureMapper):
    """Base mapper for NTP service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = NTPMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = NTPMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = NTPMapperV1_5()

    # ==================== Server Commands ====================

    def get_server(self, address: str) -> List[str]:
        """set service ntp server <address>"""
        return ["service", "ntp", "server", address]

    def get_server_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address]

    def get_server_noselect(self, address: str) -> List[str]:
        """set service ntp server <address> noselect"""
        return ["service", "ntp", "server", address, "noselect"]

    def get_server_noselect_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "noselect"]

    def get_server_nts(self, address: str) -> List[str]:
        """set service ntp server <address> nts"""
        return ["service", "ntp", "server", address, "nts"]

    def get_server_nts_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "nts"]

    def get_server_pool(self, address: str) -> List[str]:
        """set service ntp server <address> pool"""
        return ["service", "ntp", "server", address, "pool"]

    def get_server_pool_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "pool"]

    def get_server_prefer(self, address: str) -> List[str]:
        """set service ntp server <address> prefer"""
        return ["service", "ntp", "server", address, "prefer"]

    def get_server_prefer_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "prefer"]

    # ==================== v1.5 Server Options (delegate) ====================

    def has_ptp(self) -> bool:
        return self.version_mapper.has_ptp()

    def has_interleave(self) -> bool:
        return self.version_mapper.has_interleave()

    def get_server_ptp(self, address: str) -> List[str]:
        """set service ntp server <address> ptp (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_server_ptp'):
            return self.version_mapper.get_server_ptp(address)
        return []

    def get_server_ptp_path(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_server_ptp_path'):
            return self.version_mapper.get_server_ptp_path(address)
        return []

    def get_server_interleave(self, address: str) -> List[str]:
        """set service ntp server <address> interleave (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_server_interleave'):
            return self.version_mapper.get_server_interleave(address)
        return []

    def get_server_interleave_path(self, address: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_server_interleave_path'):
            return self.version_mapper.get_server_interleave_path(address)
        return []

    # ==================== Listen Address ====================

    def get_listen_address(self, address: str) -> List[str]:
        """set service ntp listen-address <address>"""
        return ["service", "ntp", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "ntp", "listen-address", address]

    # ==================== Allow Client ====================

    def get_allow_client(self, address: str) -> List[str]:
        """set service ntp allow-client address <address>"""
        return ["service", "ntp", "allow-client", "address", address]

    def get_allow_client_path(self, address: str) -> List[str]:
        return ["service", "ntp", "allow-client", "address", address]

    # ==================== VRF ====================

    def get_vrf(self, name: str) -> List[str]:
        """set service ntp vrf <name>"""
        return ["service", "ntp", "vrf", name]

    def get_vrf_path(self) -> List[str]:
        return ["service", "ntp", "vrf"]

    # ==================== Leap Second ====================

    def get_leap_second(self, mode: str) -> List[str]:
        """set service ntp leap-second <mode>"""
        return ["service", "ntp", "leap-second", mode]

    def get_leap_second_path(self) -> List[str]:
        return ["service", "ntp", "leap-second"]

    # ==================== PTP (v1.5 only - delegate) ====================

    def get_ptp(self) -> List[str]:
        """set service ntp ptp (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_ptp'):
            return self.version_mapper.get_ptp()
        return []

    def get_ptp_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp_path'):
            return self.version_mapper.get_ptp_path()
        return []

    def get_ptp_port(self, port: str) -> List[str]:
        """set service ntp ptp port <port> (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_ptp_port'):
            return self.version_mapper.get_ptp_port(port)
        return []

    def get_ptp_port_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_ptp_port_path'):
            return self.version_mapper.get_ptp_port_path()
        return []
