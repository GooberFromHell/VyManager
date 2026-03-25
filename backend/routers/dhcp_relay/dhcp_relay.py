"""
DHCP Relay Service Router

API endpoints for managing VyOS DHCP Relay service configuration.
Supports relay servers, interfaces, relay options, and listen addresses.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import DHCPRelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/dhcp-relay", tags=["dhcp-relay"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class DHCPRelayOptions(BaseModel):
    """DHCP Relay options configuration."""
    hop_count: Optional[str] = Field(None, description="Relay hop count (1-255)")
    max_size: Optional[str] = Field(None, description="Maximum packet size (64-1400)")
    relay_agents_packets: Optional[str] = Field(None, description="Relay agents packets mode")


class DHCPRelayConfigResponse(BaseModel):
    """Full DHCP Relay configuration."""
    servers: List[str] = Field(default_factory=list)
    interfaces: List[str] = Field(default_factory=list)
    relay_options: DHCPRelayOptions = Field(default_factory=DHCPRelayOptions)
    listen_addresses: List[str] = Field(default_factory=list)


class DHCPRelayBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class DHCPRelayBatchRequest(BaseModel):
    """Model for batch DHCP Relay configuration."""
    item_name: str = Field(..., description="Primary item (server address, interface name, etc.)")
    operations: List[DHCPRelayBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_dhcp_relay_capabilities(request: Request):
    """
    Get DHCP Relay capabilities based on device VyOS version.

    Returns feature flags indicating which DHCP Relay features are supported.
    """
    await require_read_permission(request, FeatureGroup.DHCP_RELAY)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = DHCPRelayBatchBuilder(version=version)
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


@router.get("/config", response_model=DHCPRelayConfigResponse)
async def get_dhcp_relay_config(http_request: Request, refresh: bool = False):
    """
    Get DHCP Relay service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for DHCP Relay service.
    """
    await require_read_permission(http_request, FeatureGroup.DHCP_RELAY)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return DHCPRelayConfigResponse()

        service_config = full_config["service"]

        if "dhcp-relay" not in service_config:
            return DHCPRelayConfigResponse()

        dhcp_relay_config = service_config["dhcp-relay"]

        # Parse servers
        servers = []
        if "server" in dhcp_relay_config:
            server_data = dhcp_relay_config["server"]
            if isinstance(server_data, dict):
                servers = list(server_data.keys())
            elif isinstance(server_data, list):
                servers = server_data
            elif isinstance(server_data, str):
                servers = [server_data]

        # Parse interfaces
        interfaces = []
        if "interface" in dhcp_relay_config:
            iface_data = dhcp_relay_config["interface"]
            if isinstance(iface_data, dict):
                interfaces = list(iface_data.keys())
            elif isinstance(iface_data, list):
                interfaces = iface_data
            elif isinstance(iface_data, str):
                interfaces = [iface_data]

        # Parse relay options
        relay_options = DHCPRelayOptions()
        if "relay-options" in dhcp_relay_config:
            opts = dhcp_relay_config["relay-options"]
            if isinstance(opts, dict):
                relay_options = DHCPRelayOptions(
                    hop_count=opts.get("hop-count"),
                    max_size=opts.get("max-size"),
                    relay_agents_packets=opts.get("relay-agents-packets"),
                )

        # Parse listen addresses (v1.5 only)
        listen_addresses = []
        if "listen-address" in dhcp_relay_config:
            la_data = dhcp_relay_config["listen-address"]
            if isinstance(la_data, dict):
                listen_addresses = list(la_data.keys())
            elif isinstance(la_data, list):
                listen_addresses = la_data
            elif isinstance(la_data, str):
                listen_addresses = [la_data]

        return DHCPRelayConfigResponse(
            servers=servers,
            interfaces=interfaces,
            relay_options=relay_options,
            listen_addresses=listen_addresses,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def dhcp_relay_batch_configure(http_request: Request, request: DHCPRelayBatchRequest):
    """
    Execute a batch of DHCP Relay configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.DHCP_RELAY)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = DHCPRelayBatchBuilder(version=version)

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
                # First parameter is typically the item_name (address, name, etc.)
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
            result_data = {"message": "DHCP Relay configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "DHCP Relay configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "DHCP Relay configuration updated"
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
