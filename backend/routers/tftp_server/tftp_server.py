"""
TFTP Server Service Router

API endpoints for managing VyOS TFTP Server service configuration.
Supports directory, listen addresses, port, and allow-upload (v1.5 only).
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import TFTPServerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/tftp-server", tags=["tftp-server"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class TFTPServerConfigResponse(BaseModel):
    """Full TFTP Server configuration."""
    directory: Optional[str] = None
    listen_addresses: List[str] = Field(default_factory=list)
    port: Optional[str] = None
    allow_upload: Optional[bool] = None


class TFTPServerBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class TFTPServerBatchRequest(BaseModel):
    """Model for batch TFTP Server configuration."""
    item_name: Optional[str] = Field(None, description="Primary item (address, path, etc.)")
    operations: List[TFTPServerBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_tftp_server_capabilities(request: Request):
    """
    Get TFTP Server capabilities based on device VyOS version.

    Returns feature flags indicating which TFTP Server features are supported.
    """
    await require_read_permission(request, FeatureGroup.TFTP_SERVER)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = TFTPServerBatchBuilder(version=version)
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


@router.get("/config", response_model=TFTPServerConfigResponse)
async def get_tftp_server_config(http_request: Request, refresh: bool = False):
    """
    Get TFTP Server service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for TFTP Server service.
    """
    await require_read_permission(http_request, FeatureGroup.TFTP_SERVER)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return TFTPServerConfigResponse()

        service_config = full_config["service"]

        if "tftp-server" not in service_config:
            return TFTPServerConfigResponse()

        tftp_config = service_config["tftp-server"]

        # Parse directory
        directory = tftp_config.get("directory") if isinstance(tftp_config.get("directory"), str) else None

        # Parse listen addresses (may be str, list, dict, or missing)
        listen_addresses = []
        if "listen-address" in tftp_config:
            la_data = tftp_config["listen-address"]
            if isinstance(la_data, dict):
                listen_addresses = list(la_data.keys())
            elif isinstance(la_data, list):
                listen_addresses = la_data
            elif isinstance(la_data, str):
                listen_addresses = [la_data]

        # Parse port
        port = tftp_config.get("port")
        if port is not None:
            port = str(port)

        # Parse allow-upload: presence = True, absence = None
        allow_upload = True if "allow-upload" in tftp_config else None

        return TFTPServerConfigResponse(
            directory=directory,
            listen_addresses=listen_addresses,
            port=port,
            allow_upload=allow_upload,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def tftp_server_batch_configure(http_request: Request, request: TFTPServerBatchRequest):
    """
    Execute a batch of TFTP Server configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.TFTP_SERVER)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = TFTPServerBatchBuilder(version=version)

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
                # First parameter is typically the item_name (address, path, etc.)
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
            result_data = {"message": "TFTP Server configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "TFTP Server configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "TFTP Server configuration updated"
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
