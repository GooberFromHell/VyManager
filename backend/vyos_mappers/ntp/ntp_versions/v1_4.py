"""VyOS 1.4 NTP service mapper - version-specific differences."""


class NTPMapperV1_4:
    """VyOS 1.4 NTP - no PTP, no interleave."""

    def has_ptp(self) -> bool:
        return False

    def has_interleave(self) -> bool:
        return False
