"""VyOS 1.5 Router Advertisement mapper - version-specific differences."""

from typing import List


class RouterAdvertMapperV1_5:
    """VyOS 1.5 Router Advertisement mapper.

    Adds relative to v1.4:
    - DNSSL (DNS Search List) support
    - Route entries under each interface
    - send-advert as a boolean value node
    - Prefix flags are positive: autonomous-flag, on-link-flag
    """

    def has_dnssl(self) -> bool:
        return True

    def has_route(self) -> bool:
        return True

    def has_send_advert_bool(self) -> bool:
        return True

    def get_send_advert(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> send-advert <value>"""
        return ["service", "router-advert", "interface", iface, "send-advert", value]

    def get_send_advert_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "send-advert"]

    def get_prefix_autonomous_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> autonomous-flag"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "autonomous-flag"]

    def get_prefix_autonomous_flag_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "autonomous-flag"]

    def get_prefix_on_link_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> on-link-flag"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "on-link-flag"]

    def get_prefix_on_link_flag_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "on-link-flag"]

    def get_dnssl(self, iface: str, domain: str) -> List[str]:
        """set service router-advert interface <iface> dnssl <domain>"""
        return ["service", "router-advert", "interface", iface, "dnssl", domain]

    def get_dnssl_path(self, iface: str, domain: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "dnssl", domain]

    def get_route(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> route <prefix>"""
        return ["service", "router-advert", "interface", iface, "route", prefix]

    def get_route_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "route", prefix]

    def get_route_lifetime(self, iface: str, prefix: str, seconds: str) -> List[str]:
        """set service router-advert interface <iface> route <prefix> lifetime <seconds>"""
        return ["service", "router-advert", "interface", iface, "route", prefix, "lifetime", seconds]

    def get_route_lifetime_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "route", prefix, "lifetime"]

    def get_route_preference(self, iface: str, prefix: str, pref: str) -> List[str]:
        """set service router-advert interface <iface> route <prefix> preference <pref>"""
        return ["service", "router-advert", "interface", iface, "route", prefix, "preference", pref]

    def get_route_preference_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "route", prefix, "preference"]
