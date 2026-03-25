"""
Router Advertisement Batch Builder

Provides all Router Advertisement batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RouterAdvertBatchBuilder:
    """Complete batch builder for Router Advertisement operations."""

    def __init__(self, version: str):
        """Initialize Router Advertisement batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "router_advert"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "RouterAdvertBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RouterAdvertBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Interface
    # ========================================================================

    def set_interface(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Create/activate a router-advert interface entry."""
        path = self.mappers[self.mapper_key].get_interface(iface)
        return self.add_set(path)

    def delete_interface(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete an entire router-advert interface entry."""
        path = self.mappers[self.mapper_key].get_interface_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Prefix
    # ========================================================================

    def set_prefix(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Add a prefix to the interface."""
        path = self.mappers[self.mapper_key].get_prefix(iface, prefix)
        return self.add_set(path)

    def delete_prefix(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete a prefix from the interface."""
        path = self.mappers[self.mapper_key].get_prefix_path(iface, prefix)
        return self.add_delete(path)

    def set_prefix_preferred_lifetime(self, iface: str, prefix: str, seconds: str) -> "RouterAdvertBatchBuilder":
        """Set preferred lifetime for a prefix."""
        path = self.mappers[self.mapper_key].get_prefix_preferred_lifetime(iface, prefix, seconds)
        return self.add_set(path)

    def delete_prefix_preferred_lifetime(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete preferred lifetime for a prefix."""
        path = self.mappers[self.mapper_key].get_prefix_preferred_lifetime_path(iface, prefix)
        return self.add_delete(path)

    def set_prefix_valid_lifetime(self, iface: str, prefix: str, seconds: str) -> "RouterAdvertBatchBuilder":
        """Set valid lifetime for a prefix."""
        path = self.mappers[self.mapper_key].get_prefix_valid_lifetime(iface, prefix, seconds)
        return self.add_set(path)

    def delete_prefix_valid_lifetime(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete valid lifetime for a prefix."""
        path = self.mappers[self.mapper_key].get_prefix_valid_lifetime_path(iface, prefix)
        return self.add_delete(path)

    # ========================================================================
    # Prefix Flags (version-delegated)
    # ========================================================================

    def set_prefix_autonomous_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Set autonomous-flag on a prefix (v1.5)."""
        path = self.mappers[self.mapper_key].get_prefix_autonomous_flag(iface, prefix)
        return self.add_set(path)

    def delete_prefix_autonomous_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete autonomous-flag from a prefix (v1.5)."""
        path = self.mappers[self.mapper_key].get_prefix_autonomous_flag_path(iface, prefix)
        return self.add_delete(path)

    def set_prefix_no_autonomous_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Set no-autonomous-flag on a prefix (v1.4)."""
        path = self.mappers[self.mapper_key].get_prefix_no_autonomous_flag(iface, prefix)
        return self.add_set(path)

    def delete_prefix_no_autonomous_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete no-autonomous-flag from a prefix (v1.4)."""
        path = self.mappers[self.mapper_key].get_prefix_no_autonomous_flag_path(iface, prefix)
        return self.add_delete(path)

    def set_prefix_on_link_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Set on-link-flag on a prefix (v1.5)."""
        path = self.mappers[self.mapper_key].get_prefix_on_link_flag(iface, prefix)
        return self.add_set(path)

    def delete_prefix_on_link_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete on-link-flag from a prefix (v1.5)."""
        path = self.mappers[self.mapper_key].get_prefix_on_link_flag_path(iface, prefix)
        return self.add_delete(path)

    def set_prefix_no_on_link_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Set no-on-link-flag on a prefix (v1.4)."""
        path = self.mappers[self.mapper_key].get_prefix_no_on_link_flag(iface, prefix)
        return self.add_set(path)

    def delete_prefix_no_on_link_flag(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete no-on-link-flag from a prefix (v1.4)."""
        path = self.mappers[self.mapper_key].get_prefix_no_on_link_flag_path(iface, prefix)
        return self.add_delete(path)

    # ========================================================================
    # Name Server
    # ========================================================================

    def set_name_server(self, iface: str, addr: str) -> "RouterAdvertBatchBuilder":
        """Add a name server to an interface."""
        path = self.mappers[self.mapper_key].get_name_server(iface, addr)
        return self.add_set(path)

    def delete_name_server(self, iface: str, addr: str) -> "RouterAdvertBatchBuilder":
        """Delete a name server from an interface."""
        path = self.mappers[self.mapper_key].get_name_server_path(iface, addr)
        return self.add_delete(path)

    # ========================================================================
    # Hop Limit
    # ========================================================================

    def set_cur_hop_limit(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set current hop limit for an interface."""
        path = self.mappers[self.mapper_key].get_cur_hop_limit(iface, value)
        return self.add_set(path)

    def delete_cur_hop_limit(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete current hop limit from an interface."""
        path = self.mappers[self.mapper_key].get_cur_hop_limit_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Lifetime / Preference
    # ========================================================================

    def set_default_lifetime(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set default lifetime for an interface."""
        path = self.mappers[self.mapper_key].get_default_lifetime(iface, value)
        return self.add_set(path)

    def delete_default_lifetime(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete default lifetime from an interface."""
        path = self.mappers[self.mapper_key].get_default_lifetime_path(iface)
        return self.add_delete(path)

    def set_default_preference(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set default preference for an interface."""
        path = self.mappers[self.mapper_key].get_default_preference(iface, value)
        return self.add_set(path)

    def delete_default_preference(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete default preference from an interface."""
        path = self.mappers[self.mapper_key].get_default_preference_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Link MTU
    # ========================================================================

    def set_link_mtu(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set link MTU for an interface."""
        path = self.mappers[self.mapper_key].get_link_mtu(iface, value)
        return self.add_set(path)

    def delete_link_mtu(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete link MTU from an interface."""
        path = self.mappers[self.mapper_key].get_link_mtu_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Flags
    # ========================================================================

    def set_managed_flag(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Set managed-flag (M flag) on an interface."""
        path = self.mappers[self.mapper_key].get_managed_flag(iface)
        return self.add_set(path)

    def delete_managed_flag(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete managed-flag from an interface."""
        path = self.mappers[self.mapper_key].get_managed_flag_path(iface)
        return self.add_delete(path)

    def set_other_config_flag(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Set other-config-flag (O flag) on an interface."""
        path = self.mappers[self.mapper_key].get_other_config_flag(iface)
        return self.add_set(path)

    def delete_other_config_flag(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete other-config-flag from an interface."""
        path = self.mappers[self.mapper_key].get_other_config_flag_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Send Advert (version-delegated)
    # ========================================================================

    def set_send_advert(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set send-advert value (v1.5)."""
        path = self.mappers[self.mapper_key].get_send_advert(iface, value)
        return self.add_set(path)

    def delete_send_advert(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete send-advert setting (v1.5)."""
        path = self.mappers[self.mapper_key].get_send_advert_path(iface)
        return self.add_delete(path)

    def set_no_send_advert(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Set no-send-advert flag (v1.4)."""
        path = self.mappers[self.mapper_key].get_no_send_advert(iface)
        return self.add_set(path)

    def delete_no_send_advert(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete no-send-advert flag (v1.4)."""
        path = self.mappers[self.mapper_key].get_no_send_advert_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Interval
    # ========================================================================

    def set_interval_max(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set maximum RA interval for an interface."""
        path = self.mappers[self.mapper_key].get_interval_max(iface, value)
        return self.add_set(path)

    def delete_interval_max(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete maximum RA interval from an interface."""
        path = self.mappers[self.mapper_key].get_interval_max_path(iface)
        return self.add_delete(path)

    def set_interval_min(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set minimum RA interval for an interface."""
        path = self.mappers[self.mapper_key].get_interval_min(iface, value)
        return self.add_set(path)

    def delete_interval_min(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete minimum RA interval from an interface."""
        path = self.mappers[self.mapper_key].get_interval_min_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # Timers
    # ========================================================================

    def set_reachable_time(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set reachable time for an interface."""
        path = self.mappers[self.mapper_key].get_reachable_time(iface, value)
        return self.add_set(path)

    def delete_reachable_time(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete reachable time from an interface."""
        path = self.mappers[self.mapper_key].get_reachable_time_path(iface)
        return self.add_delete(path)

    def set_retrans_timer(self, iface: str, value: str) -> "RouterAdvertBatchBuilder":
        """Set retransmission timer for an interface."""
        path = self.mappers[self.mapper_key].get_retrans_timer(iface, value)
        return self.add_set(path)

    def delete_retrans_timer(self, iface: str) -> "RouterAdvertBatchBuilder":
        """Delete retransmission timer from an interface."""
        path = self.mappers[self.mapper_key].get_retrans_timer_path(iface)
        return self.add_delete(path)

    # ========================================================================
    # DNSSL (v1.5 only)
    # ========================================================================

    def set_dnssl(self, iface: str, domain: str) -> "RouterAdvertBatchBuilder":
        """Add a DNS search list domain to an interface (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_dnssl(iface, domain)
        return self.add_set(path)

    def delete_dnssl(self, iface: str, domain: str) -> "RouterAdvertBatchBuilder":
        """Remove a DNS search list domain from an interface (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_dnssl_path(iface, domain)
        return self.add_delete(path)

    # ========================================================================
    # Route (v1.5 only)
    # ========================================================================

    def set_route(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Add a route entry to an interface (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_route(iface, prefix)
        return self.add_set(path)

    def delete_route(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete a route entry from an interface (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_route_path(iface, prefix)
        return self.add_delete(path)

    def set_route_lifetime(self, iface: str, prefix: str, seconds: str) -> "RouterAdvertBatchBuilder":
        """Set lifetime for a route entry (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_route_lifetime(iface, prefix, seconds)
        return self.add_set(path)

    def delete_route_lifetime(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete lifetime from a route entry (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_route_lifetime_path(iface, prefix)
        return self.add_delete(path)

    def set_route_preference(self, iface: str, prefix: str, pref: str) -> "RouterAdvertBatchBuilder":
        """Set preference for a route entry (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_route_preference(iface, prefix, pref)
        return self.add_set(path)

    def delete_route_preference(self, iface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        """Delete preference from a route entry (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_route_preference_path(iface, prefix)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        mapper = self.mappers[self.mapper_key]
        has_dnssl = mapper.has_dnssl()
        has_route = mapper.has_route()
        has_send_advert_bool = mapper.has_send_advert_bool()

        return {
            "version": self.version,
            "has_dnssl": has_dnssl,
            "has_route": has_route,
            "has_send_advert_bool": has_send_advert_bool,
            "fields": {
                "interfaces": {"supported": True, "description": "Router advertisement interfaces"},
                "prefixes": {"supported": True, "description": "IPv6 prefixes to advertise"},
                "name_servers": {"supported": True, "description": "DNS name servers to advertise"},
                "cur_hop_limit": {"supported": True, "description": "Current hop limit (0-255)"},
                "default_lifetime": {"supported": True, "description": "Default router lifetime (0-9000)"},
                "default_preference": {"supported": True, "description": "Default router preference"},
                "link_mtu": {"supported": True, "description": "Link MTU value"},
                "managed_flag": {"supported": True, "description": "Managed address configuration flag (M)"},
                "other_config_flag": {"supported": True, "description": "Other configuration flag (O)"},
                "send_advert": {"supported": True, "description": "Send router advertisements"},
                "interval": {"supported": True, "description": "RA interval settings"},
                "reachable_time": {"supported": True, "description": "Reachable time (0-3600000)"},
                "retrans_timer": {"supported": True, "description": "Retransmission timer (0-4294967295)"},
                "dnssl": {"supported": has_dnssl, "description": "DNS search list domains (v1.5+)"},
                "routes": {"supported": has_route, "description": "Route information option (v1.5+)"},
            },
        }
