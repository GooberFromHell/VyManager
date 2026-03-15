"""
NTP Service Router

API endpoints for managing VyOS NTP service configuration.
Supports NTP servers, listen addresses, allow clients, VRF, leap second, and PTP.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import NTPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ntp", tags=["ntp"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class NTPServer(BaseModel):
    """NTP server configuration."""
    address: str = Field(..., description="Server hostname or IP")
    noselect: bool = False
    nts: bool = False
    pool: bool = False
    prefer: bool = False
    ptp: bool = False
    interleave: bool = False


class NTPConfigResponse(BaseModel):
    """Full NTP configuration."""
    servers: List[NTPServer] = Field(default_factory=list)
    listen_addresses: List[str] = Field(default_factory=list)
    allow_clients: List[str] = Field(default_factory=list)
    vrf: Optional[str] = None
    leap_second: Optional[str] = None


class NTPBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class NTPBatchRequest(BaseModel):
    """Model for batch NTP configuration."""
    item_name: str = Field(..., description="Primary item (server address, listen address, etc.)")
    operations: List[NTPBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_ntp_capabilities(request: Request):
    """
    Get NTP capabilities based on device VyOS version.

    Returns feature flags indicating which NTP features are supported.
    """
    await require_read_permission(request, FeatureGroup.NTP)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = NTPBatchBuilder(version=version)
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


@router.get("/config", response_model=NTPConfigResponse)
async def get_ntp_config(http_request: Request, refresh: bool = False):
    """
    Get NTP service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for NTP service.
    """
    await require_read_permission(http_request, FeatureGroup.NTP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return NTPConfigResponse()

        service_config = full_config["service"]

        if "ntp" not in service_config:
            return NTPConfigResponse()

        ntp_config = service_config["ntp"]

        # Parse servers
        servers = []
        if "server" in ntp_config and isinstance(ntp_config["server"], dict):
            for addr, server_data in ntp_config["server"].items():
                if not isinstance(server_data, dict):
                    server_data = {}
                servers.append(NTPServer(
                    address=addr,
                    noselect="noselect" in server_data,
                    nts="nts" in server_data,
                    pool="pool" in server_data,
                    prefer="prefer" in server_data,
                    ptp="ptp" in server_data,
                    interleave="interleave" in server_data,
                ))

        # Parse listen addresses
        listen_addresses = []
        if "listen-address" in ntp_config:
            la_data = ntp_config["listen-address"]
            if isinstance(la_data, dict):
                listen_addresses = list(la_data.keys())
            elif isinstance(la_data, list):
                listen_addresses = la_data
            elif isinstance(la_data, str):
                listen_addresses = [la_data]

        # Parse allow clients
        allow_clients = []
        if "allow-client" in ntp_config:
            ac_data = ntp_config["allow-client"]
            if isinstance(ac_data, dict) and "address" in ac_data:
                addr_data = ac_data["address"]
                if isinstance(addr_data, dict):
                    allow_clients = list(addr_data.keys())
                elif isinstance(addr_data, list):
                    allow_clients = addr_data
                elif isinstance(addr_data, str):
                    allow_clients = [addr_data]

        # Parse VRF
        vrf = ntp_config.get("vrf")

        # Parse leap second
        leap_second = ntp_config.get("leap-second")

        return NTPConfigResponse(
            servers=servers,
            listen_addresses=listen_addresses,
            allow_clients=allow_clients,
            vrf=vrf,
            leap_second=leap_second,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def ntp_batch_configure(http_request: Request, request: NTPBatchRequest):
    """
    Execute a batch of NTP configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.NTP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = NTPBatchBuilder(version=version)

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
            result_data = {"message": "NTP configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "NTP configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "NTP configuration updated"
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
