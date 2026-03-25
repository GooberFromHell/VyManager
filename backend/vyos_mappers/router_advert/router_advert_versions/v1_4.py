"""VyOS 1.4 Router Advertisement mapper - version-specific differences."""

from typing import List


class RouterAdvertMapperV1_4:
    """VyOS 1.4 Router Advertisement mapper.

    Differences from v1.5:
    - No DNSSL support
    - No route entries support
    - send-advert is a flag (no-send-advert) rather than a boolean value
    - Prefix flags are negated: no-autonomous-flag, no-on-link-flag
    """

    def has_dnssl(self) -> bool:
        return False

    def has_route(self) -> bool:
        return False

    def has_send_advert_bool(self) -> bool:
        return False

    def get_no_send_advert(self, iface: str) -> List[str]:
        """set service router-advert interface <iface> no-send-advert"""
        return ["service", "router-advert", "interface", iface, "no-send-advert"]

    def get_no_send_advert_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "no-send-advert"]

    def get_prefix_no_autonomous_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> no-autonomous-flag"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "no-autonomous-flag"]

    def get_prefix_no_autonomous_flag_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "no-autonomous-flag"]

    def get_prefix_no_on_link_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> no-on-link-flag"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "no-on-link-flag"]

    def get_prefix_no_on_link_flag_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "no-on-link-flag"]
