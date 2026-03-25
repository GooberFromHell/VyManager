"""
DHCPv6 Server Service Router

API endpoints for managing VyOS DHCPv6 Server service configuration.
Supports shared networks, subnets, address ranges, lease times, and static mappings.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import DHCPv6ServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcpv6-server", tags=["dhcpv6-server"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class DHCPv6AddressRange(BaseModel):
    """Address range within a subnet."""
    prefixes: List[str] = Field(default_factory=list, description="Address range prefixes")
    ranges: List[Dict[str, str]] = Field(default_factory=list, description="Start/stop address ranges")


class DHCPv6LeaseTime(BaseModel):
    """Lease time configuration."""
    default: Optional[str] = None
    maximum: Optional[str] = None
    minimum: Optional[str] = None


class DHCPv6StaticMapping(BaseModel):
    """Static mapping configuration."""
    name: str = Field(..., description="Static mapping name")
    identifier: Optional[str] = Field(None, description="DUID identifier")
    ipv6_address: Optional[str] = Field(None, description="IPv6 address")
    ipv6_prefix: Optional[str] = Field(None, description="IPv6 prefix")


class DHCPv6Subnet(BaseModel):
    """Subnet configuration within a shared network."""
    prefix: str = Field(..., description="IPv6 subnet prefix")
    address_range: Optional[DHCPv6AddressRange] = None
    domain_search: List[str] = Field(default_factory=list)
    lease_time: Optional[DHCPv6LeaseTime] = None
    name_servers: List[str] = Field(default_factory=list)
    nis_domain: Optional[str] = None
    nisplus_domain: Optional[str] = None
    sip_servers: List[str] = Field(default_factory=list)
    sntp_servers: List[str] = Field(default_factory=list)
    static_mappings: List[DHCPv6StaticMapping] = Field(default_factory=list)


class DHCPv6SharedNetwork(BaseModel):
    """Shared network configuration."""
    name: str = Field(..., description="Shared network name")
    subnets: List[DHCPv6Subnet] = Field(default_factory=list)


class DHCPv6ServerConfigResponse(BaseModel):
    """Full DHCPv6 Server configuration."""
    preference: Optional[int] = None
    shared_networks: List[DHCPv6SharedNetwork] = Field(default_factory=list)


class DHCPv6ServerBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class DHCPv6ServerBatchRequest(BaseModel):
    """Model for batch DHCPv6 Server configuration."""
    item_name: str = Field(..., description="Primary item (network name, etc.)")
    operations: List[DHCPv6ServerBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================


def _parse_list_or_dict(data) -> List[str]:
    """Parse a value that could be a dict (keys), list, or single string into a list."""
    if isinstance(data, dict):
        return list(data.keys())
    elif isinstance(data, list):
        return data
    elif isinstance(data, str):
        return [data]
    return []


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_dhcpv6_server_capabilities(request: Request):
    """
    Get DHCPv6 Server capabilities based on device VyOS version.

    Returns feature flags indicating which DHCPv6 Server features are supported.
    """
    await require_read_permission(request, FeatureGroup.DHCPV6_SERVER)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = DHCPv6ServerBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        # Add instance info
        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=DHCPv6ServerConfigResponse)
async def get_dhcpv6_server_config(http_request: Request, refresh: bool = False):
    """
    Get DHCPv6 Server service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for DHCPv6 Server service.
    """
    await require_read_permission(http_request, FeatureGroup.DHCPV6_SERVER)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return DHCPv6ServerConfigResponse()

        service_config = full_config["service"]

        if "dhcpv6-server" not in service_config:
            return DHCPv6ServerConfigResponse()

        dhcpv6_config = service_config["dhcpv6-server"]

        # Parse preference
        preference = None
        if "preference" in dhcpv6_config:
            try:
                preference = int(dhcpv6_config["preference"])
            except (ValueError, TypeError):
                preference = None

        # Parse shared networks
        shared_networks = []
        if "shared-network-name" in dhcpv6_config and isinstance(dhcpv6_config["shared-network-name"], dict):
            for net_name, net_data in dhcpv6_config["shared-network-name"].items():
                if not isinstance(net_data, dict):
                    net_data = {}

                subnets = []
                if "subnet" in net_data and isinstance(net_data["subnet"], dict):
                    for subnet_prefix, subnet_data in net_data["subnet"].items():
                        if not isinstance(subnet_data, dict):
                            subnet_data = {}

                        # Parse address range
                        address_range = None
                        if "address-range" in subnet_data and isinstance(subnet_data["address-range"], dict):
                            ar_data = subnet_data["address-range"]
                            ar_prefixes = []
                            ar_ranges = []

                            if "prefix" in ar_data:
                                ar_prefixes = _parse_list_or_dict(ar_data["prefix"])

                            if "start" in ar_data and isinstance(ar_data["start"], dict):
                                for start_addr, start_data in ar_data["start"].items():
                                    if isinstance(start_data, dict) and "stop" in start_data:
                                        ar_ranges.append({
                                            "start": start_addr,
                                            "stop": start_data["stop"]
                                        })

                            address_range = DHCPv6AddressRange(
                                prefixes=ar_prefixes,
                                ranges=ar_ranges,
                            )

                        # Parse domain search
                        domain_search = []
                        if "domain-search" in subnet_data:
                            domain_search = _parse_list_or_dict(subnet_data["domain-search"])

                        # Parse lease time
                        lease_time = None
                        if "lease-time" in subnet_data and isinstance(subnet_data["lease-time"], dict):
                            lt_data = subnet_data["lease-time"]
                            lease_time = DHCPv6LeaseTime(
                                default=str(lt_data["default"]) if "default" in lt_data else None,
                                maximum=str(lt_data["maximum"]) if "maximum" in lt_data else None,
                                minimum=str(lt_data["minimum"]) if "minimum" in lt_data else None,
                            )

                        # Parse name servers
                        name_servers = []
                        if "name-server" in subnet_data:
                            name_servers = _parse_list_or_dict(subnet_data["name-server"])

                        # Parse NIS domain
                        nis_domain = subnet_data.get("nis-domain")

                        # Parse NIS+ domain
                        nisplus_domain = subnet_data.get("nisplus-domain")

                        # Parse SIP servers
                        sip_servers = []
                        if "sip-server" in subnet_data:
                            sip_servers = _parse_list_or_dict(subnet_data["sip-server"])

                        # Parse SNTP servers
                        sntp_servers = []
                        if "sntp-server" in subnet_data:
                            sntp_servers = _parse_list_or_dict(subnet_data["sntp-server"])

                        # Parse static mappings
                        static_mappings = []
                        if "static-mapping" in subnet_data and isinstance(subnet_data["static-mapping"], dict):
                            for mapping_name, mapping_data in subnet_data["static-mapping"].items():
                                if not isinstance(mapping_data, dict):
                                    mapping_data = {}
                                static_mappings.append(DHCPv6StaticMapping(
                                    name=mapping_name,
                                    identifier=mapping_data.get("identifier"),
                                    ipv6_address=mapping_data.get("ipv6-address"),
                                    ipv6_prefix=mapping_data.get("ipv6-prefix"),
                                ))

                        subnets.append(DHCPv6Subnet(
                            prefix=subnet_prefix,
                            address_range=address_range,
                            domain_search=domain_search,
                            lease_time=lease_time,
                            name_servers=name_servers,
                            nis_domain=nis_domain,
                            nisplus_domain=nisplus_domain,
                            sip_servers=sip_servers,
                            sntp_servers=sntp_servers,
                            static_mappings=static_mappings,
                        ))

                shared_networks.append(DHCPv6SharedNetwork(
                    name=net_name,
                    subnets=subnets,
                ))

        return DHCPv6ServerConfigResponse(
            preference=preference,
            shared_networks=shared_networks,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def dhcpv6_server_batch_configure(http_request: Request, request: DHCPv6ServerBatchRequest):
    """
    Execute a batch of DHCPv6 Server configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.DHCPV6_SERVER)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = DHCPv6ServerBatchBuilder(version=version)

        # Process each operation
        for operation in request.operations:
            op_name = operation.op
            op_value = operation.value

            # Block internal methods
            if op_name in _INTERNAL_BUILDER_METHODS:
                raise HTTPException(
                    status_code=400, detail=f"Operation not allowed: {op_name}"
                )

            if not hasattr(builder, op_name):
                raise HTTPException(
                    status_code=400, detail=f"Unknown operation: {op_name}"
                )

            method = getattr(builder, op_name)

            # Use inspect to determine method signature
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments based on method signature
            args = []

            if len(params) > 0:
                # First parameter is typically the item_name (network name, etc.)
                args.append(request.item_name)

            if op_value is not None and len(params) > 1:
                args.append(op_value)

            method(*args)

        # Check if batch has operations
        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        # Execute batch operations
        response = service.execute_batch(builder)

        # Get operation count from builder
        operation_count = len(builder.get_operations())

        # Handle empty string result
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": "DHCPv6 Server configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "DHCPv6 Server configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "DHCPv6 Server configuration updated"
            result_data["operations_count"] = operation_count

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
