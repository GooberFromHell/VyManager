"""VyOS 1.4 DNS Forwarding mapper - version-specific differences."""


class DNSForwardingMapperV1_4:
    """VyOS 1.4 DNS Forwarding - no authoritative domains.

    v1.4 and v1.5 share the same base CLI paths for DNS forwarding.
    The only difference is authoritative domain support.
    """

    def has_authoritative_domains(self) -> bool:
        return False
