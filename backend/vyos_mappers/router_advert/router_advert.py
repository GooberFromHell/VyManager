"""Router Advertisement mapper for all VyOS versions.

Handles command path generation for IPv6 Router Advertisement configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""

from typing import List
from ..base import BaseFeatureMapper
from .router_advert_versions import RouterAdvertMapperV1_4, RouterAdvertMapperV1_5


class RouterAdvertMapper(BaseFeatureMapper):
    """Base mapper for Router Advertisement configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = RouterAdvertMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = RouterAdvertMapperV1_5()
        else:
            self.version_mapper = RouterAdvertMapperV1_5()

    # ==================== Interface ====================

    def get_interface(self, iface: str) -> List[str]:
        """set service router-advert interface <iface>"""
        return ["service", "router-advert", "interface", iface]

    def get_interface_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface]

    # ==================== Prefix ====================

    def get_prefix(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix>"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix]

    def get_prefix_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix]

    def get_prefix_preferred_lifetime(self, iface: str, prefix: str, seconds: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> preferred-lifetime <seconds>"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "preferred-lifetime", seconds]

    def get_prefix_preferred_lifetime_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "preferred-lifetime"]

    def get_prefix_valid_lifetime(self, iface: str, prefix: str, seconds: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> valid-lifetime <seconds>"""
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "valid-lifetime", seconds]

    def get_prefix_valid_lifetime_path(self, iface: str, prefix: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "prefix", prefix, "valid-lifetime"]

    # ==================== Name Server ====================

    def get_name_server(self, iface: str, addr: str) -> List[str]:
        """set service router-advert interface <iface> name-server <addr>"""
        return ["service", "router-advert", "interface", iface, "name-server", addr]

    def get_name_server_path(self, iface: str, addr: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "name-server", addr]

    # ==================== Hop Limit ====================

    def get_cur_hop_limit(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> cur-hop-limit <value>"""
        return ["service", "router-advert", "interface", iface, "cur-hop-limit", value]

    def get_cur_hop_limit_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "cur-hop-limit"]

    # ==================== Lifetime / Preference ====================

    def get_default_lifetime(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> default-lifetime <value>"""
        return ["service", "router-advert", "interface", iface, "default-lifetime", value]

    def get_default_lifetime_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "default-lifetime"]

    def get_default_preference(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> default-preference <value>"""
        return ["service", "router-advert", "interface", iface, "default-preference", value]

    def get_default_preference_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "default-preference"]

    # ==================== Link MTU ====================

    def get_link_mtu(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> link-mtu <value>"""
        return ["service", "router-advert", "interface", iface, "link-mtu", value]

    def get_link_mtu_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "link-mtu"]

    # ==================== Flags ====================

    def get_managed_flag(self, iface: str) -> List[str]:
        """set service router-advert interface <iface> managed-flag"""
        return ["service", "router-advert", "interface", iface, "managed-flag"]

    def get_managed_flag_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "managed-flag"]

    def get_other_config_flag(self, iface: str) -> List[str]:
        """set service router-advert interface <iface> other-config-flag"""
        return ["service", "router-advert", "interface", iface, "other-config-flag"]

    def get_other_config_flag_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "other-config-flag"]

    # ==================== Interval ====================

    def get_interval_max(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> interval max <value>"""
        return ["service", "router-advert", "interface", iface, "interval", "max", value]

    def get_interval_max_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "interval", "max"]

    def get_interval_min(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> interval min <value>"""
        return ["service", "router-advert", "interface", iface, "interval", "min", value]

    def get_interval_min_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "interval", "min"]

    # ==================== Timers ====================

    def get_reachable_time(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> reachable-time <value>"""
        return ["service", "router-advert", "interface", iface, "reachable-time", value]

    def get_reachable_time_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "reachable-time"]

    def get_retrans_timer(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> retrans-timer <value>"""
        return ["service", "router-advert", "interface", iface, "retrans-timer", value]

    def get_retrans_timer_path(self, iface: str) -> List[str]:
        return ["service", "router-advert", "interface", iface, "retrans-timer"]

    # ==================== Version-Delegated: send-advert ====================

    def has_send_advert_bool(self) -> bool:
        """Check if this version supports send-advert as a boolean value (v1.5)."""
        return self.version_mapper.has_send_advert_bool()

    def get_send_advert(self, iface: str, value: str) -> List[str]:
        """set service router-advert interface <iface> send-advert <value> (v1.5)"""
        if hasattr(self.version_mapper, "get_send_advert"):
            return self.version_mapper.get_send_advert(iface, value)
        return []

    def get_send_advert_path(self, iface: str) -> List[str]:
        if hasattr(self.version_mapper, "get_send_advert_path"):
            return self.version_mapper.get_send_advert_path(iface)
        return []

    def get_no_send_advert(self, iface: str) -> List[str]:
        """set service router-advert interface <iface> no-send-advert (v1.4)"""
        if hasattr(self.version_mapper, "get_no_send_advert"):
            return self.version_mapper.get_no_send_advert(iface)
        return []

    def get_no_send_advert_path(self, iface: str) -> List[str]:
        if hasattr(self.version_mapper, "get_no_send_advert_path"):
            return self.version_mapper.get_no_send_advert_path(iface)
        return []

    # ==================== Version-Delegated: prefix flags ====================

    def get_prefix_autonomous_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> autonomous-flag (v1.5)"""
        if hasattr(self.version_mapper, "get_prefix_autonomous_flag"):
            return self.version_mapper.get_prefix_autonomous_flag(iface, prefix)
        return []

    def get_prefix_autonomous_flag_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_prefix_autonomous_flag_path"):
            return self.version_mapper.get_prefix_autonomous_flag_path(iface, prefix)
        return []

    def get_prefix_no_autonomous_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> no-autonomous-flag (v1.4)"""
        if hasattr(self.version_mapper, "get_prefix_no_autonomous_flag"):
            return self.version_mapper.get_prefix_no_autonomous_flag(iface, prefix)
        return []

    def get_prefix_no_autonomous_flag_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_prefix_no_autonomous_flag_path"):
            return self.version_mapper.get_prefix_no_autonomous_flag_path(iface, prefix)
        return []

    def get_prefix_on_link_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> on-link-flag (v1.5)"""
        if hasattr(self.version_mapper, "get_prefix_on_link_flag"):
            return self.version_mapper.get_prefix_on_link_flag(iface, prefix)
        return []

    def get_prefix_on_link_flag_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_prefix_on_link_flag_path"):
            return self.version_mapper.get_prefix_on_link_flag_path(iface, prefix)
        return []

    def get_prefix_no_on_link_flag(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> prefix <prefix> no-on-link-flag (v1.4)"""
        if hasattr(self.version_mapper, "get_prefix_no_on_link_flag"):
            return self.version_mapper.get_prefix_no_on_link_flag(iface, prefix)
        return []

    def get_prefix_no_on_link_flag_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_prefix_no_on_link_flag_path"):
            return self.version_mapper.get_prefix_no_on_link_flag_path(iface, prefix)
        return []

    # ==================== Version-Delegated: DNSSL (v1.5 only) ====================

    def has_dnssl(self) -> bool:
        """Check if this version supports DNSSL (v1.5 only)."""
        return self.version_mapper.has_dnssl()

    def get_dnssl(self, iface: str, domain: str) -> List[str]:
        """set service router-advert interface <iface> dnssl <domain> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_dnssl"):
            return self.version_mapper.get_dnssl(iface, domain)
        return []

    def get_dnssl_path(self, iface: str, domain: str) -> List[str]:
        if hasattr(self.version_mapper, "get_dnssl_path"):
            return self.version_mapper.get_dnssl_path(iface, domain)
        return []

    # ==================== Version-Delegated: Route (v1.5 only) ====================

    def has_route(self) -> bool:
        """Check if this version supports route entries (v1.5 only)."""
        return self.version_mapper.has_route()

    def get_route(self, iface: str, prefix: str) -> List[str]:
        """set service router-advert interface <iface> route <prefix> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_route"):
            return self.version_mapper.get_route(iface, prefix)
        return []

    def get_route_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_route_path"):
            return self.version_mapper.get_route_path(iface, prefix)
        return []

    def get_route_lifetime(self, iface: str, prefix: str, seconds: str) -> List[str]:
        """set service router-advert interface <iface> route <prefix> lifetime <seconds> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_route_lifetime"):
            return self.version_mapper.get_route_lifetime(iface, prefix, seconds)
        return []

    def get_route_lifetime_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_route_lifetime_path"):
            return self.version_mapper.get_route_lifetime_path(iface, prefix)
        return []

    def get_route_preference(self, iface: str, prefix: str, pref: str) -> List[str]:
        """set service router-advert interface <iface> route <prefix> preference <pref> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_route_preference"):
            return self.version_mapper.get_route_preference(iface, prefix, pref)
        return []

    def get_route_preference_path(self, iface: str, prefix: str) -> List[str]:
        if hasattr(self.version_mapper, "get_route_preference_path"):
            return self.version_mapper.get_route_preference_path(iface, prefix)
        return []
