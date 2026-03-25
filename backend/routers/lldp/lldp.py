"""
LLDP Service Router

API endpoints for managing VyOS LLDP service configuration.
Supports LLDP interfaces, SNMP, legacy protocols (v1.4), and management address (v1.5).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import LLDPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/lldp", tags=["lldp"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class LLDPInterface(BaseModel):
    """LLDP interface configuration."""
    name: str = Field(..., description="Interface name")
    disable: bool = False
    location_elin: Optional[str] = Field(None, description="ELIN phone number for location")


class LLDPConfigResponse(BaseModel):
    """Full LLDP configuration."""
    interfaces: List[LLDPInterface] = Field(default_factory=list)
    snmp_enable: bool = False
    legacy_protocols: List[str] = Field(default_factory=list)
    management_addresses: List[str] = Field(default_factory=list)


class LLDPBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class LLDPBatchRequest(BaseModel):
    """Model for batch LLDP configuration."""
    item_name: str = Field(..., description="Primary item (interface name, protocol, address, etc.)")
    operations: List[LLDPBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_lldp_capabilities(request: Request):
    """
    Get LLDP capabilities based on device VyOS version.

    Returns feature flags indicating which LLDP features are supported.
    """
    await require_read_permission(request, FeatureGroup.LLDP)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = LLDPBatchBuilder(version=version)
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


@router.get("/config", response_model=LLDPConfigResponse)
async def get_lldp_config(http_request: Request, refresh: bool = False):
    """
    Get LLDP service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for LLDP service.
    """
    await require_read_permission(http_request, FeatureGroup.LLDP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return LLDPConfigResponse()

        service_config = full_config["service"]

        if "lldp" not in service_config:
            return LLDPConfigResponse()

        lldp_config = service_config["lldp"]

        # Parse interfaces
        interfaces = []
        if "interface" in lldp_config and isinstance(lldp_config["interface"], dict):
            for iface_name, iface_data in lldp_config["interface"].items():
                if not isinstance(iface_data, dict):
                    iface_data = {}

                # Parse location ELIN
                location_elin = None
                location = iface_data.get("location")
                if isinstance(location, dict):
                    location_elin = location.get("elin")

                interfaces.append(LLDPInterface(
                    name=iface_name,
                    disable="disable" in iface_data,
                    location_elin=location_elin,
                ))

        # Parse SNMP enable
        snmp_enable = False
        snmp_data = lldp_config.get("snmp")
        if isinstance(snmp_data, dict) and "enable" in snmp_data:
            snmp_enable = True

        # Parse legacy protocols
        legacy_protocols = []
        lp_data = lldp_config.get("legacy-protocols")
        if isinstance(lp_data, dict):
            legacy_protocols = list(lp_data.keys())
        elif isinstance(lp_data, list):
            legacy_protocols = lp_data
        elif isinstance(lp_data, str):
            legacy_protocols = [lp_data]

        # Parse management addresses
        management_addresses = []
        ma_data = lldp_config.get("management-address")
        if isinstance(ma_data, dict):
            management_addresses = list(ma_data.keys())
        elif isinstance(ma_data, list):
            management_addresses = ma_data
        elif isinstance(ma_data, str):
            management_addresses = [ma_data]

        return LLDPConfigResponse(
            interfaces=interfaces,
            snmp_enable=snmp_enable,
            legacy_protocols=legacy_protocols,
            management_addresses=management_addresses,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def lldp_batch_configure(http_request: Request, request: LLDPBatchRequest):
    """
    Execute a batch of LLDP configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.LLDP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = LLDPBatchBuilder(version=version)

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
                # First parameter is typically the item_name (interface name, address, etc.)
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
            result_data = {"message": "LLDP configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "LLDP configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "LLDP configuration updated"
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
