"""
DNS Forwarding Batch Builder

Provides all DNS forwarding batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class DNSForwardingBatchBuilder:
    """Complete batch builder for DNS forwarding operations."""

    def __init__(self, version: str):
        """Initialize DNS forwarding batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "dns_forwarding"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "DNSForwardingBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "DNSForwardingBatchBuilder":
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
    # Global Settings
    # ========================================================================

    def set_system(self) -> "DNSForwardingBatchBuilder":
        """Enable system name servers."""
        path = self.mappers[self.mapper_key].get_system()
        return self.add_set(path)

    def delete_system(self) -> "DNSForwardingBatchBuilder":
        """Disable system name servers."""
        path = self.mappers[self.mapper_key].get_system_path()
        return self.add_delete(path)

    def set_dhcp_interface(self, interface: str) -> "DNSForwardingBatchBuilder":
        """Set DHCP interface for name server learning."""
        path = self.mappers[self.mapper_key].get_dhcp_interface(interface)
        return self.add_set(path)

    def delete_dhcp_interface(self, interface: str) -> "DNSForwardingBatchBuilder":
        """Delete DHCP interface."""
        path = self.mappers[self.mapper_key].get_dhcp_interface_path(interface)
        return self.add_delete(path)

    def set_cache_size(self, size: str) -> "DNSForwardingBatchBuilder":
        """Set DNS cache size."""
        path = self.mappers[self.mapper_key].get_cache_size(size)
        return self.add_set(path)

    def delete_cache_size(self) -> "DNSForwardingBatchBuilder":
        """Delete DNS cache size."""
        path = self.mappers[self.mapper_key].get_cache_size_path()
        return self.add_delete(path)

    def set_negative_ttl(self, ttl: str) -> "DNSForwardingBatchBuilder":
        """Set negative TTL."""
        path = self.mappers[self.mapper_key].get_negative_ttl(ttl)
        return self.add_set(path)

    def delete_negative_ttl(self) -> "DNSForwardingBatchBuilder":
        """Delete negative TTL."""
        path = self.mappers[self.mapper_key].get_negative_ttl_path()
        return self.add_delete(path)

    def set_timeout(self, timeout: str) -> "DNSForwardingBatchBuilder":
        """Set query timeout."""
        path = self.mappers[self.mapper_key].get_timeout(timeout)
        return self.add_set(path)

    def delete_timeout(self) -> "DNSForwardingBatchBuilder":
        """Delete query timeout."""
        path = self.mappers[self.mapper_key].get_timeout_path()
        return self.add_delete(path)

    def set_dnssec(self, mode: str) -> "DNSForwardingBatchBuilder":
        """Set DNSSEC validation mode."""
        path = self.mappers[self.mapper_key].get_dnssec(mode)
        return self.add_set(path)

    def delete_dnssec(self) -> "DNSForwardingBatchBuilder":
        """Delete DNSSEC validation mode."""
        path = self.mappers[self.mapper_key].get_dnssec_path()
        return self.add_delete(path)

    def set_ignore_hosts_file(self) -> "DNSForwardingBatchBuilder":
        """Enable ignore hosts file."""
        path = self.mappers[self.mapper_key].get_ignore_hosts_file()
        return self.add_set(path)

    def delete_ignore_hosts_file(self) -> "DNSForwardingBatchBuilder":
        """Disable ignore hosts file."""
        path = self.mappers[self.mapper_key].get_ignore_hosts_file_path()
        return self.add_delete(path)

    def set_no_serve_rfc1918(self) -> "DNSForwardingBatchBuilder":
        """Enable no-serve-rfc1918."""
        path = self.mappers[self.mapper_key].get_no_serve_rfc1918()
        return self.add_set(path)

    def delete_no_serve_rfc1918(self) -> "DNSForwardingBatchBuilder":
        """Disable no-serve-rfc1918."""
        path = self.mappers[self.mapper_key].get_no_serve_rfc1918_path()
        return self.add_delete(path)

    # ========================================================================
    # Listen / Source Addresses
    # ========================================================================

    def set_listen_address(self, address: str) -> "DNSForwardingBatchBuilder":
        """Set listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "DNSForwardingBatchBuilder":
        """Delete listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    def set_source_address(self, address: str) -> "DNSForwardingBatchBuilder":
        """Set source address."""
        path = self.mappers[self.mapper_key].get_source_address(address)
        return self.add_set(path)

    def delete_source_address(self, address: str) -> "DNSForwardingBatchBuilder":
        """Delete source address."""
        path = self.mappers[self.mapper_key].get_source_address_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Allow-From
    # ========================================================================

    def set_allow_from(self, network: str) -> "DNSForwardingBatchBuilder":
        """Set allow-from network."""
        path = self.mappers[self.mapper_key].get_allow_from(network)
        return self.add_set(path)

    def delete_allow_from(self, network: str) -> "DNSForwardingBatchBuilder":
        """Delete allow-from network."""
        path = self.mappers[self.mapper_key].get_allow_from_path(network)
        return self.add_delete(path)

    # ========================================================================
    # Name Servers
    # ========================================================================

    def set_name_server(self, address: str) -> "DNSForwardingBatchBuilder":
        """Set upstream name server."""
        path = self.mappers[self.mapper_key].get_name_server(address)
        return self.add_set(path)

    def delete_name_server(self, address: str) -> "DNSForwardingBatchBuilder":
        """Delete upstream name server."""
        path = self.mappers[self.mapper_key].get_name_server_path(address)
        return self.add_delete(path)

    def set_name_server_port(self, address: str, port: str) -> "DNSForwardingBatchBuilder":
        """Set upstream name server port."""
        path = self.mappers[self.mapper_key].get_name_server_port(address, port)
        return self.add_set(path)

    def delete_name_server_port(self, address: str) -> "DNSForwardingBatchBuilder":
        """Delete upstream name server port."""
        path = self.mappers[self.mapper_key].get_name_server_port_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Domain Forwarding
    # ========================================================================

    def set_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Create domain forwarding entry."""
        path = self.mappers[self.mapper_key].get_domain(domain)
        return self.add_set(path)

    def delete_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Delete entire domain forwarding entry."""
        path = self.mappers[self.mapper_key].get_domain_path(domain)
        return self.add_delete(path)

    def set_domain_name_server(self, domain: str, address: str) -> "DNSForwardingBatchBuilder":
        """Set domain-specific name server."""
        path = self.mappers[self.mapper_key].get_domain_name_server(domain, address)
        return self.add_set(path)

    def delete_domain_name_server(self, domain: str, address: str) -> "DNSForwardingBatchBuilder":
        """Delete domain-specific name server."""
        path = self.mappers[self.mapper_key].get_domain_name_server_path(domain, address)
        return self.add_delete(path)

    def set_domain_addnta(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Set domain addnta."""
        path = self.mappers[self.mapper_key].get_domain_addnta(domain)
        return self.add_set(path)

    def delete_domain_addnta(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Delete domain addnta."""
        path = self.mappers[self.mapper_key].get_domain_addnta_path(domain)
        return self.add_delete(path)

    def set_domain_recursion_desired(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Set domain recursion-desired."""
        path = self.mappers[self.mapper_key].get_domain_recursion_desired(domain)
        return self.add_set(path)

    def delete_domain_recursion_desired(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Delete domain recursion-desired."""
        path = self.mappers[self.mapper_key].get_domain_recursion_desired_path(domain)
        return self.add_delete(path)

    # ========================================================================
    # Authoritative Domain (v1.5 only)
    # ========================================================================

    def set_authoritative_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Create authoritative domain (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_authoritative_domain(domain)
        return self.add_set(path)

    def delete_authoritative_domain(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Delete authoritative domain (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_authoritative_domain_path(domain)
        return self.add_delete(path)

    def set_authoritative_domain_disable(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Disable authoritative domain (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_authoritative_domain_disable(domain)
        return self.add_set(path)

    def delete_authoritative_domain_disable(self, domain: str) -> "DNSForwardingBatchBuilder":
        """Enable authoritative domain (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_authoritative_domain_disable_path(domain)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "has_authoritative_domains": is_v15,
            "fields": {
                "listen_addresses": {"supported": True, "description": "Addresses to listen on"},
                "allow_from": {"supported": True, "description": "Networks allowed to query"},
                "name_servers": {"supported": True, "description": "Upstream DNS servers"},
                "domains": {"supported": True, "description": "Domain-specific forwarding"},
                "cache_size": {"supported": True, "description": "DNS cache size (0-2147483647)"},
                "negative_ttl": {"supported": True, "description": "Negative TTL (0-7200)"},
                "timeout": {"supported": True, "description": "Query timeout (10-60000)"},
                "dnssec": {"supported": True, "description": "DNSSEC validation mode"},
                "no_serve_rfc1918": {"supported": True, "description": "Block private IP reverse lookups"},
                "system": {"supported": True, "description": "Use system name servers"},
                "ignore_hosts_file": {"supported": True, "description": "Ignore /etc/hosts"},
                "source_addresses": {"supported": True, "description": "Source addresses for outbound queries"},
                "dhcp_interfaces": {"supported": True, "description": "DHCP interfaces for name servers"},
                "authoritative_domains": {"supported": is_v15, "description": "Authoritative DNS zones (v1.5+)"},
            },
        }
