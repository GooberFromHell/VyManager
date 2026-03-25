"""DHCPv6 Server service mapper for all VyOS versions.

Handles command path generation for DHCPv6 Server service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .dhcpv6_server_versions import DHCPv6ServerMapperV1_4, DHCPv6ServerMapperV1_5


class DHCPv6ServerMapper(BaseFeatureMapper):
    """Base mapper for DHCPv6 Server service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = DHCPv6ServerMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = DHCPv6ServerMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = DHCPv6ServerMapperV1_5()

    # ==================== Global Preference ====================

    def get_preference(self, value: str) -> List[str]:
        """set service dhcpv6-server preference <value>"""
        return ["service", "dhcpv6-server", "preference", value]

    def get_preference_path(self) -> List[str]:
        return ["service", "dhcpv6-server", "preference"]

    # ==================== Shared Network ====================

    def get_shared_network(self, network_name: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name]

    def get_shared_network_path(self, network_name: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name]

    # ==================== Subnet ====================

    def get_subnet(self, network_name: str, prefix: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name, "subnet", prefix]

    def get_subnet_path(self, network_name: str, prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name, "subnet", prefix]

    # ==================== Address Range ====================

    def get_subnet_address_range_prefix(self, network_name: str, prefix: str, range_prefix: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> address-range prefix <range-prefix>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "address-range", "prefix", range_prefix]

    def get_subnet_address_range_prefix_path(self, network_name: str, prefix: str, range_prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "address-range", "prefix", range_prefix]

    def get_subnet_address_range_start(self, network_name: str, prefix: str, start: str, stop: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> address-range start <start> stop <stop>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "address-range", "start", start, "stop", stop]

    def get_subnet_address_range_start_path(self, network_name: str, prefix: str, start: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "address-range", "start", start]

    # ==================== Subnet Options ====================

    def get_subnet_domain_search(self, network_name: str, prefix: str, domain: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> domain-search <domain>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "domain-search", domain]

    def get_subnet_domain_search_path(self, network_name: str, prefix: str, domain: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "domain-search", domain]

    def get_subnet_lease_time_default(self, network_name: str, prefix: str, seconds: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> lease-time default <seconds>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "lease-time", "default", seconds]

    def get_subnet_lease_time_default_path(self, network_name: str, prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "lease-time", "default"]

    def get_subnet_lease_time_maximum(self, network_name: str, prefix: str, seconds: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> lease-time maximum <seconds>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "lease-time", "maximum", seconds]

    def get_subnet_lease_time_maximum_path(self, network_name: str, prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "lease-time", "maximum"]

    def get_subnet_lease_time_minimum(self, network_name: str, prefix: str, seconds: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> lease-time minimum <seconds>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "lease-time", "minimum", seconds]

    def get_subnet_lease_time_minimum_path(self, network_name: str, prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "lease-time", "minimum"]

    def get_subnet_name_server(self, network_name: str, prefix: str, address: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> name-server <address>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "name-server", address]

    def get_subnet_name_server_path(self, network_name: str, prefix: str, address: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "name-server", address]

    def get_subnet_nis_domain(self, network_name: str, prefix: str, domain: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> nis-domain <domain>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "nis-domain", domain]

    def get_subnet_nis_domain_path(self, network_name: str, prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "nis-domain"]

    def get_subnet_nisplus_domain(self, network_name: str, prefix: str, domain: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> nisplus-domain <domain>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "nisplus-domain", domain]

    def get_subnet_nisplus_domain_path(self, network_name: str, prefix: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "nisplus-domain"]

    def get_subnet_sip_server(self, network_name: str, prefix: str, server: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> sip-server <server>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "sip-server", server]

    def get_subnet_sip_server_path(self, network_name: str, prefix: str, server: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "sip-server", server]

    def get_subnet_sntp_server(self, network_name: str, prefix: str, address: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> sntp-server <address>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "sntp-server", address]

    def get_subnet_sntp_server_path(self, network_name: str, prefix: str, address: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "sntp-server", address]

    # ==================== Static Mapping ====================

    def get_subnet_static_mapping(self, network_name: str, prefix: str, mapping_name: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> static-mapping <mapping-name>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name]

    def get_subnet_static_mapping_path(self, network_name: str, prefix: str, mapping_name: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name]

    def get_subnet_static_mapping_identifier(self, network_name: str, prefix: str, mapping_name: str, duid: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> static-mapping <mapping-name> identifier <duid>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name, "identifier", duid]

    def get_subnet_static_mapping_identifier_path(self, network_name: str, prefix: str, mapping_name: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name, "identifier"]

    def get_subnet_static_mapping_ipv6_address(self, network_name: str, prefix: str, mapping_name: str, address: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> static-mapping <mapping-name> ipv6-address <address>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name, "ipv6-address", address]

    def get_subnet_static_mapping_ipv6_address_path(self, network_name: str, prefix: str, mapping_name: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name, "ipv6-address"]

    def get_subnet_static_mapping_ipv6_prefix(self, network_name: str, prefix: str, mapping_name: str, ipv6_prefix: str) -> List[str]:
        """set service dhcpv6-server shared-network-name <name> subnet <prefix> static-mapping <mapping-name> ipv6-prefix <ipv6-prefix>"""
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name, "ipv6-prefix", ipv6_prefix]

    def get_subnet_static_mapping_ipv6_prefix_path(self, network_name: str, prefix: str, mapping_name: str) -> List[str]:
        return ["service", "dhcpv6-server", "shared-network-name", network_name,
                "subnet", prefix, "static-mapping", mapping_name, "ipv6-prefix"]
