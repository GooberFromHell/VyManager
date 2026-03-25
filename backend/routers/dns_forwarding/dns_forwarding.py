"""
DNS Forwarding Router

API endpoints for managing VyOS DNS forwarding configuration.
Supports listen addresses, allow-from networks, name servers,
domain-specific forwarding, and authoritative domains (v1.5+).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.dns_forwarding import DNSForwardingBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dns-forwarding", tags=["dns-forwarding"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
    "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class DNSDomainForward(BaseModel):
    """DNS domain-specific forwarding entry."""
    domain: str = Field(..., description="Domain name to forward")
    name_servers: List[str] = Field(default_factory=list, description="Servers for this domain")
    addnta: bool = False
    recursion_desired: bool = False


class DNSForwardingConfigResponse(BaseModel):
    """Full DNS forwarding configuration."""
    listen_addresses: List[str] = Field(default_factory=list)
    allow_from: List[str] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    source_addresses: List[str] = Field(default_factory=list)
    dhcp_interfaces: List[str] = Field(default_factory=list)
    domains: List[DNSDomainForward] = Field(default_factory=list)
    cache_size: Optional[str] = None
    negative_ttl: Optional[str] = None
    timeout: Optional[str] = None
    dnssec: Optional[str] = None
    no_serve_rfc1918: bool = False
    system: bool = False
    ignore_hosts_file: bool = False


class DNSForwardingBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class DNSForwardingBatchRequest(BaseModel):
    """Model for batch DNS forwarding configuration."""
    item_name: str = Field(..., description="Primary item (address, domain, network, ...)")
    operations: List[DNSForwardingBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_dns_forwarding_capabilities(request: Request):
    """
    Get DNS forwarding capabilities based on device VyOS version.

    Returns feature flags indicating which DNS forwarding features are supported.
    """
    await require_read_permission(request, FeatureGroup.DNS_FORWARDING)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = DNSForwardingBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=DNSForwardingConfigResponse)
async def get_dns_forwarding_config(http_request: Request, refresh: bool = False):
    """
    Get all DNS forwarding configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for DNS forwarding service.
    """
    await require_read_permission(http_request, FeatureGroup.DNS_FORWARDING)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return DNSForwardingConfigResponse()

        service_config = full_config["service"]

        if "dns" not in service_config or "forwarding" not in service_config.get("dns", {}):
            return DNSForwardingConfigResponse()

        dns_fwd = service_config["dns"]["forwarding"]

        # Parse listen-address (dict keys to list)
        listen_addresses = []
        if "listen-address" in dns_fwd:
            la_data = dns_fwd["listen-address"]
            if isinstance(la_data, dict):
                listen_addresses = list(la_data.keys())
            elif isinstance(la_data, list):
                listen_addresses = la_data
            elif isinstance(la_data, str):
                listen_addresses = [la_data]

        # Parse allow-from (dict keys to list)
        allow_from = []
        if "allow-from" in dns_fwd:
            af_data = dns_fwd["allow-from"]
            if isinstance(af_data, dict):
                allow_from = list(af_data.keys())
            elif isinstance(af_data, list):
                allow_from = af_data
            elif isinstance(af_data, str):
                allow_from = [af_data]

        # Parse name-server (dict keys to list)
        name_servers = []
        if "name-server" in dns_fwd:
            ns_data = dns_fwd["name-server"]
            if isinstance(ns_data, dict):
                name_servers = list(ns_data.keys())
            elif isinstance(ns_data, list):
                name_servers = ns_data
            elif isinstance(ns_data, str):
                name_servers = [ns_data]

        # Parse source-address (dict keys to list)
        source_addresses = []
        if "source-address" in dns_fwd:
            sa_data = dns_fwd["source-address"]
            if isinstance(sa_data, dict):
                source_addresses = list(sa_data.keys())
            elif isinstance(sa_data, list):
                source_addresses = sa_data
            elif isinstance(sa_data, str):
                source_addresses = [sa_data]

        # Parse dhcp interfaces (dict keys to list)
        dhcp_interfaces = []
        if "dhcp" in dns_fwd:
            dhcp_data = dns_fwd["dhcp"]
            if isinstance(dhcp_data, dict):
                dhcp_interfaces = list(dhcp_data.keys())
            elif isinstance(dhcp_data, list):
                dhcp_interfaces = dhcp_data
            elif isinstance(dhcp_data, str):
                dhcp_interfaces = [dhcp_data]

        # Parse domain forwarding entries
        domains = []
        if "domain" in dns_fwd:
            for domain_name, domain_data in dns_fwd["domain"].items():
                domain_ns = []
                if "name-server" in domain_data:
                    ns_data = domain_data["name-server"]
                    if isinstance(ns_data, dict):
                        domain_ns = list(ns_data.keys())
                    elif isinstance(ns_data, list):
                        domain_ns = ns_data
                    elif isinstance(ns_data, str):
                        domain_ns = [ns_data]

                domains.append(DNSDomainForward(
                    domain=domain_name,
                    name_servers=domain_ns,
                    addnta="addnta" in domain_data,
                    recursion_desired="recursion-desired" in domain_data,
                ))

        # Parse scalar values
        cache_size = dns_fwd.get("cache-size")
        if cache_size is not None:
            cache_size = str(cache_size)

        negative_ttl = dns_fwd.get("negative-ttl")
        if negative_ttl is not None:
            negative_ttl = str(negative_ttl)

        timeout = dns_fwd.get("timeout")
        if timeout is not None:
            timeout = str(timeout)

        dnssec = dns_fwd.get("dnssec")

        return DNSForwardingConfigResponse(
            listen_addresses=listen_addresses,
            allow_from=allow_from,
            name_servers=name_servers,
            source_addresses=source_addresses,
            dhcp_interfaces=dhcp_interfaces,
            domains=domains,
            cache_size=cache_size,
            negative_ttl=negative_ttl,
            timeout=timeout,
            dnssec=dnssec,
            no_serve_rfc1918="no-serve-rfc1918" in dns_fwd,
            system="system" in dns_fwd,
            ignore_hosts_file="ignore-hosts-file" in dns_fwd,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def dns_forwarding_batch_configure(
    http_request: Request,
    body: DNSForwardingBatchRequest,
):
    """
    Execute a batch of DNS forwarding configuration operations.

    Uses the item_name + operations pattern. The item_name is always the first
    argument for methods requiring parameters.

    Example -- add listen address::

        POST /vyos/dns-forwarding/batch
        {
            "item_name": "192.168.1.1",
            "operations": [{"op": "set_listen_address"}]
        }

    Example -- add domain-specific name server::

        POST /vyos/dns-forwarding/batch
        {
            "item_name": "example.com",
            "operations": [{"op": "set_domain_name_server", "value": "10.0.0.53"}]
        }
    """
    await require_write_permission(http_request, FeatureGroup.DNS_FORWARDING)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        builder = DNSForwardingBatchBuilder(version=version)

        for operation in body.operations:
            if operation.op.startswith("_") or operation.op in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation.op}",
                )
            method = getattr(builder, operation.op, None)
            if not callable(method):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unknown operation: {operation.op}",
                )

            sig = inspect.signature(method)
            params = [p for p in sig.parameters.keys() if p != "self"]
            n = len(params)

            if n == 0:
                method()
            elif n == 1:
                method(body.item_name)
            elif n == 2:
                if operation.value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{operation.op}' requires a value",
                    )
                method(body.item_name, operation.value)
            elif n >= 3:
                if not operation.value:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{operation.op}' requires a comma-separated value",
                    )
                extra = operation.value.split(",", n - 2)
                if len(extra) < n - 1:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{operation.op}' requires {n - 1} comma-separated values",
                    )
                method(body.item_name, *extra[: n - 1])

        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        response = await run_in_threadpool(service.execute_batch, builder)

        return VyOSResponse(
            success=response.status == 200,
            data={"message": "DNS forwarding configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in dns_forwarding_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
