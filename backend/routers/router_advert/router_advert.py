"""
Router Advertisement Router

API endpoints for managing VyOS IPv6 Router Advertisement configuration.
Supports interface-level RA settings, prefix advertisement, name servers,
DNSSL (v1.5+), and route information options (v1.5+).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.router_advert import RouterAdvertBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/router-advert", tags=["router-advert"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
    "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class RouterAdvertPrefix(BaseModel):
    """IPv6 prefix advertised in router advertisements."""

    prefix: str = Field(..., description="IPv6 prefix (e.g. 2001:db8::/64)")
    autonomous_flag: Optional[bool] = Field(None, description="Autonomous address-configuration flag")
    on_link_flag: Optional[bool] = Field(None, description="On-link flag")
    preferred_lifetime: Optional[str] = None
    valid_lifetime: Optional[str] = None


class RouterAdvertRoute(BaseModel):
    """Route information option entry (v1.5 only)."""

    prefix: str = Field(..., description="Route prefix")
    lifetime: Optional[str] = None
    preference: Optional[str] = None


class RouterAdvertInterface(BaseModel):
    """Router advertisement configuration for a single interface."""

    name: str = Field(..., description="Interface name")
    prefixes: List[RouterAdvertPrefix] = Field(default_factory=list)
    name_servers: List[str] = Field(default_factory=list)
    cur_hop_limit: Optional[str] = None
    default_lifetime: Optional[str] = None
    default_preference: Optional[str] = None
    link_mtu: Optional[str] = None
    managed_flag: bool = False
    other_config_flag: bool = False
    send_advert: Optional[bool] = None
    interval_max: Optional[str] = None
    interval_min: Optional[str] = None
    reachable_time: Optional[str] = None
    retrans_timer: Optional[str] = None
    dnssl: List[str] = Field(default_factory=list)
    routes: List[RouterAdvertRoute] = Field(default_factory=list)


class RouterAdvertConfigResponse(BaseModel):
    """Full Router Advertisement configuration."""

    interfaces: List[RouterAdvertInterface] = Field(default_factory=list)


class RouterAdvertBatchOperation(BaseModel):
    """Single operation in a batch request."""

    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class RouterAdvertBatchRequest(BaseModel):
    """Model for batch Router Advertisement configuration."""

    item_name: str = Field(..., description="Primary item (interface name)")
    operations: List[RouterAdvertBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Config Parsing Helpers
# ============================================================================


def _normalize_to_list(value: Any) -> List[str]:
    """Normalize a VyOS config value to a list of strings.

    VyOS returns multi-value nodes as dicts (keyed by value), lists, or
    plain strings depending on cardinality. Always returns a list.
    """
    if value is None:
        return []
    if isinstance(value, dict):
        return list(value.keys())
    if isinstance(value, list):
        return [str(v) for v in value]
    return [str(value)]


def _parse_prefix(prefix_name: str, prefix_data: Any) -> RouterAdvertPrefix:
    """Parse a single prefix entry from the VyOS config dict."""
    if not isinstance(prefix_data, dict):
        prefix_data = {}

    # Determine autonomous-flag: v1.5 uses presence of "autonomous-flag",
    # v1.4 uses presence of "no-autonomous-flag" (inverted semantics).
    autonomous_flag: Optional[bool] = None
    if "autonomous-flag" in prefix_data:
        autonomous_flag = True
    elif "no-autonomous-flag" in prefix_data:
        autonomous_flag = False

    on_link_flag: Optional[bool] = None
    if "on-link-flag" in prefix_data:
        on_link_flag = True
    elif "no-on-link-flag" in prefix_data:
        on_link_flag = False

    preferred_lifetime = prefix_data.get("preferred-lifetime")
    if preferred_lifetime is not None:
        preferred_lifetime = str(preferred_lifetime)

    valid_lifetime = prefix_data.get("valid-lifetime")
    if valid_lifetime is not None:
        valid_lifetime = str(valid_lifetime)

    return RouterAdvertPrefix(
        prefix=prefix_name,
        autonomous_flag=autonomous_flag,
        on_link_flag=on_link_flag,
        preferred_lifetime=preferred_lifetime,
        valid_lifetime=valid_lifetime,
    )


def _parse_route(route_prefix: str, route_data: Any) -> RouterAdvertRoute:
    """Parse a single route entry from the VyOS config dict."""
    if not isinstance(route_data, dict):
        route_data = {}

    lifetime = route_data.get("lifetime")
    if lifetime is not None:
        lifetime = str(lifetime)

    preference = route_data.get("preference")

    return RouterAdvertRoute(
        prefix=route_prefix,
        lifetime=lifetime,
        preference=preference,
    )


def _parse_interface(iface_name: str, iface_data: Any) -> RouterAdvertInterface:
    """Parse a single interface entry from the VyOS config dict."""
    if not isinstance(iface_data, dict):
        iface_data = {}

    # Prefixes: dict of prefix → prefix config dict
    prefixes: List[RouterAdvertPrefix] = []
    if "prefix" in iface_data and isinstance(iface_data["prefix"], dict):
        for pfx_name, pfx_data in iface_data["prefix"].items():
            prefixes.append(_parse_prefix(pfx_name, pfx_data))

    # Name servers: multi-value node (dict keys, list, or str)
    name_servers = _normalize_to_list(iface_data.get("name-server"))

    # Scalar fields
    cur_hop_limit = iface_data.get("cur-hop-limit")
    if cur_hop_limit is not None:
        cur_hop_limit = str(cur_hop_limit)

    default_lifetime = iface_data.get("default-lifetime")
    if default_lifetime is not None:
        default_lifetime = str(default_lifetime)

    default_preference = iface_data.get("default-preference")

    link_mtu = iface_data.get("link-mtu")
    if link_mtu is not None:
        link_mtu = str(link_mtu)

    # Boolean flag nodes
    managed_flag = "managed-flag" in iface_data
    other_config_flag = "other-config-flag" in iface_data

    # send-advert: v1.5 stores as a boolean value, v1.4 uses no-send-advert flag
    send_advert: Optional[bool] = None
    if "send-advert" in iface_data:
        raw = iface_data["send-advert"]
        if isinstance(raw, bool):
            send_advert = raw
        elif isinstance(raw, str):
            send_advert = raw.lower() in ("true", "1", "yes")
        else:
            send_advert = bool(raw)
    elif "no-send-advert" in iface_data:
        send_advert = False

    # Interval
    interval_max: Optional[str] = None
    interval_min: Optional[str] = None
    if "interval" in iface_data and isinstance(iface_data["interval"], dict):
        iv = iface_data["interval"]
        if "max" in iv:
            interval_max = str(iv["max"])
        if "min" in iv:
            interval_min = str(iv["min"])

    reachable_time = iface_data.get("reachable-time")
    if reachable_time is not None:
        reachable_time = str(reachable_time)

    retrans_timer = iface_data.get("retrans-timer")
    if retrans_timer is not None:
        retrans_timer = str(retrans_timer)

    # DNSSL (v1.5 only): multi-value node
    dnssl = _normalize_to_list(iface_data.get("dnssl"))

    # Routes (v1.5 only): dict of prefix → route config dict
    routes: List[RouterAdvertRoute] = []
    if "route" in iface_data and isinstance(iface_data["route"], dict):
        for route_pfx, route_data in iface_data["route"].items():
            routes.append(_parse_route(route_pfx, route_data))

    return RouterAdvertInterface(
        name=iface_name,
        prefixes=prefixes,
        name_servers=name_servers,
        cur_hop_limit=cur_hop_limit,
        default_lifetime=default_lifetime,
        default_preference=default_preference,
        link_mtu=link_mtu,
        managed_flag=managed_flag,
        other_config_flag=other_config_flag,
        send_advert=send_advert,
        interval_max=interval_max,
        interval_min=interval_min,
        reachable_time=reachable_time,
        retrans_timer=retrans_timer,
        dnssl=dnssl,
        routes=routes,
    )


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_router_advert_capabilities(request: Request):
    """
    Get Router Advertisement capabilities based on device VyOS version.

    Returns feature flags indicating which RA features are supported.
    """
    await require_read_permission(request, FeatureGroup.ROUTER_ADVERT)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = RouterAdvertBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in get_router_advert_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=RouterAdvertConfigResponse)
async def get_router_advert_config(http_request: Request, refresh: bool = False):
    """
    Get all Router Advertisement configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for Router Advertisement service.
    """
    await require_read_permission(http_request, FeatureGroup.ROUTER_ADVERT)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return RouterAdvertConfigResponse()

        service_config = full_config["service"]

        if "router-advert" not in service_config:
            return RouterAdvertConfigResponse()

        ra_config = service_config["router-advert"]

        if "interface" not in ra_config or not isinstance(ra_config["interface"], dict):
            return RouterAdvertConfigResponse()

        interfaces: List[RouterAdvertInterface] = [
            _parse_interface(iface_name, iface_data)
            for iface_name, iface_data in ra_config["interface"].items()
        ]

        return RouterAdvertConfigResponse(interfaces=interfaces)

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in get_router_advert_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def router_advert_batch_configure(
    http_request: Request,
    body: RouterAdvertBatchRequest,
):
    """
    Execute a batch of Router Advertisement configuration operations.

    Uses the item_name + operations pattern. The item_name is the interface
    name (first argument for all interface-scoped operations).

    For operations requiring two positional arguments after item_name
    (e.g. set_prefix_preferred_lifetime: iface, prefix, seconds), pass the
    remaining arguments as a comma-separated string in the value field.

    Example -- add a prefix to eth0::

        POST /vyos/router-advert/batch
        {
            "item_name": "eth0",
            "operations": [{"op": "set_prefix", "value": "2001:db8::/64"}]
        }

    Example -- set preferred lifetime on a prefix::

        POST /vyos/router-advert/batch
        {
            "item_name": "eth0",
            "operations": [
                {"op": "set_prefix_preferred_lifetime", "value": "2001:db8::/64,3600"}
            ]
        }
    """
    await require_write_permission(http_request, FeatureGroup.ROUTER_ADVERT)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        builder = RouterAdvertBatchBuilder(version=version)

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
            data={"message": "Router Advertisement configuration updated"},
            error=response.error if response.error else None,
        )
    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in router_advert_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
