"""VyOS 1.5 DNS Forwarding mapper - adds authoritative domains."""
from typing import List


class DNSForwardingMapperV1_5:
    """VyOS 1.5 DNS Forwarding - adds authoritative domains."""

    def has_authoritative_domains(self) -> bool:
        return True

    def get_authoritative_domain(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain]

    def get_authoritative_domain_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain]

    def get_authoritative_domain_disable(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "disable"]

    def get_authoritative_domain_disable_path(self, domain: str) -> List[str]:
        return ["service", "dns", "forwarding", "authoritative-domain", domain, "disable"]
