"""DNS Forwarding mapper for all VyOS versions.

Handles command path generation for DNS forwarding configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .dns_forwarding_versions import DNSForwardingMapperV1_4, DNSForwardingMapperV1_5


class DNSForwardingMapper(BaseFeatureMapper):
    """Base mapper for DNS forwarding configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = DNSForwardingMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = DNSForwardingMapperV1_5()
        else:
            self.version_mapper = DNSForwardingMapperV1_5()

    # ==================== Global Settings ====================

    def get_system(self) -> List[str]:
        """set service dns forwarding system"""
        return ["service", "dns", "forwarding", "system"]

    def get_system_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "system"]

    def get_dhcp_interface(self, interface: str) -> List[str]:
        """set service dns forwarding dhcp <interface>"""
        return ["service", "dns", "forwarding", "dhcp", interface]

    def get_dhcp_interface_path(self, interface: str) -> List[str]:
        return ["service", "dns", "forwarding", "dhcp", interface]

    def get_cache_size(self, size: str) -> List[str]:
        """set service dns forwarding cache-size <size>"""
        return ["service", "dns", "forwarding", "cache-size", size]

    def get_cache_size_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "cache-size"]

    def get_negative_ttl(self, ttl: str) -> List[str]:
        """set service dns forwarding negative-ttl <ttl>"""
        return ["service", "dns", "forwarding", "negative-ttl", ttl]

    def get_negative_ttl_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "negative-ttl"]

    def get_timeout(self, timeout: str) -> List[str]:
        """set service dns forwarding timeout <timeout>"""
        return ["service", "dns", "forwarding", "timeout", timeout]

    def get_timeout_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "timeout"]

    def get_dnssec(self, mode: str) -> List[str]:
        """set service dns forwarding dnssec <mode>"""
        return ["service", "dns", "forwarding", "dnssec", mode]

    def get_dnssec_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "dnssec"]

    def get_ignore_hosts_file(self) -> List[str]:
        """set service dns forwarding ignore-hosts-file"""
        return ["service", "dns", "forwarding", "ignore-hosts-file"]

    def get_ignore_hosts_file_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "ignore-hosts-file"]

    def get_no_serve_rfc1918(self) -> List[str]:
        """set service dns forwarding no-serve-rfc1918"""
        return ["service", "dns", "forwarding", "no-serve-rfc1918"]

    def get_no_serve_rfc1918_path(self) -> List[str]:
        return ["service", "dns", "forwarding", "no-serve-rfc1918"]

    # ==================== Listen / Source Addresses ====================

    def get_listen_address(self, address: str) -> List[str]:
        """set service dns forwarding listen-address <address>"""
        return ["service", "dns", "forwarding", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "listen-address", address]

    def get_source_address(self, address: str) -> List[str]:
        """set service dns forwarding source-address <address>"""
        return ["service", "dns", "forwarding", "source-address", address]

    def get_source_address_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "source-address", address]

    # ==================== Allow-From ====================

    def get_allow_from(self, network: str) -> List[str]:
        """set service dns forwarding allow-from <network>"""
        return ["service", "dns", "forwarding", "allow-from", network]

    def get_allow_from_path(self, network: str) -> List[str]:
        return ["service", "dns", "forwarding", "allow-from", network]

    # ==================== Name Servers ====================

    def get_name_server(self, address: str) -> List[str]:
        """set service dns forwarding name-server <address>"""
        return ["service", "dns", "forwarding", "name-server", address]

    def get_name_server_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "name-server", address]

    def get_name_server_port(self, address: str, port: str) -> List[str]:
        """set service dns forwarding name-server <address> port <port>"""
        return ["service", "dns", "forwarding", "name-server", address, "port", port]

    def get_name_server_port_path(self, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "name-server", address, "port"]

    # ==================== Domain Forwarding ====================

    def get_domain(self, domain: str) -> List[str]:
        """set service dns forwarding domain <domain>"""
        return ["service", "dns", "forwarding", "domain", domain]

    def get_domain_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain]

    def get_domain_name_server(self, domain: str, address: str) -> List[str]:
        """set service dns forwarding domain <domain> name-server <address>"""
        return ["service", "dns", "forwarding", "domain", domain, "name-server", address]

    def get_domain_name_server_path(self, domain: str, address: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain, "name-server", address]

    def get_domain_addnta(self, domain: str) -> List[str]:
        """set service dns forwarding domain <domain> addnta"""
        return ["service", "dns", "forwarding", "domain", domain, "addnta"]

    def get_domain_addnta_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain, "addnta"]

    def get_domain_recursion_desired(self, domain: str) -> List[str]:
        """set service dns forwarding domain <domain> recursion-desired"""
        return ["service", "dns", "forwarding", "domain", domain, "recursion-desired"]

    def get_domain_recursion_desired_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "domain", domain, "recursion-desired"]

    # ==================== Authoritative Domain (v1.5 only - delegate) ====================

    def has_authoritative_domains(self) -> bool:
        """Check if this version supports authoritative domains."""
        return self.version_mapper.has_authoritative_domains()

    def get_authoritative_domain(self, domain: str) -> List[str]:
        """set service dns forwarding authoritative-domain <domain> (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_authoritative_domain'):
            return self.version_mapper.get_authoritative_domain(domain)
        return []

    def get_authoritative_domain_path(self, domain: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_authoritative_domain_path'):
            return self.version_mapper.get_authoritative_domain_path(domain)
        return []

    def get_authoritative_domain_disable(self, domain: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_authoritative_domain_disable'):
            return self.version_mapper.get_authoritative_domain_disable(domain)
        return []

    def get_authoritative_domain_disable_path(self, domain: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_authoritative_domain_disable_path'):
            return self.version_mapper.get_authoritative_domain_disable_path(domain)
        return []
