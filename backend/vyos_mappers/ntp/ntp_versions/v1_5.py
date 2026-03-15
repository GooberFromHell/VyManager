"""VyOS 1.5 NTP service mapper - version-specific differences."""
from typing import List


class NTPMapperV1_5:
    """VyOS 1.5 NTP - adds PTP, interleave, timestamp interface."""

    def has_ptp(self) -> bool:
        return True

    def has_interleave(self) -> bool:
        return True

    def get_server_ptp(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "ptp"]

    def get_server_ptp_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "ptp"]

    def get_server_interleave(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "interleave"]

    def get_server_interleave_path(self, address: str) -> List[str]:
        return ["service", "ntp", "server", address, "interleave"]

    def get_ptp(self) -> List[str]:
        return ["service", "ntp", "ptp"]

    def get_ptp_path(self) -> List[str]:
        return ["service", "ntp", "ptp"]

    def get_ptp_port(self, port: str) -> List[str]:
        return ["service", "ntp", "ptp", "port", port]

    def get_ptp_port_path(self) -> List[str]:
        return ["service", "ntp", "ptp", "port"]
