"""
Broadcast Relay Service Router

API endpoints for managing VyOS broadcast relay configuration.
Relay instances are a collection keyed by numeric ID (1-99).
Each instance can relay UDP broadcast traffic across interfaces.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.broadcast_relay import BroadcastRelayBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/broadcast-relay", tags=["broadcast-relay"])

# Builder infrastructure methods that must never be invokable via the batch API
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty", "clear", "operation_count",
    "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class BroadcastRelayInstance(BaseModel):
    """Broadcast relay instance configuration."""
    id: str = Field(..., description="Relay instance number (1-99)")
    description: Optional[str] = None
    interfaces: List[str] = Field(default_factory=list, description="Interfaces participating in relay")
    address: Optional[str] = None
    port: Optional[str] = None
    disabled: bool = False


class BroadcastRelayConfigResponse(BaseModel):
    """Full broadcast relay configuration."""
    relays: List[BroadcastRelayInstance] = Field(default_factory=list)


class BroadcastRelayBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class BroadcastRelayBatchRequest(BaseModel):
    """Model for batch broadcast relay configuration.

    item_name holds the relay instance ID (e.g. "1", "5", "42") and is
    passed as the first argument to all builder methods that require relay_id.
    """
    item_name: Optional[str] = Field(None, description="Relay instance ID (1-99)")
    operations: List[BroadcastRelayBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_broadcast_relay_capabilities(request: Request):
    """
    Get broadcast relay capabilities based on device VyOS version.

    Returns feature flags indicating which broadcast relay features are supported.
    """
    await require_read_permission(request, FeatureGroup.BROADCAST_RELAY)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = BroadcastRelayBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in get_broadcast_relay_capabilities")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=BroadcastRelayConfigResponse)
async def get_broadcast_relay_config(http_request: Request, refresh: bool = False):
    """
    Get broadcast relay configuration from VyOS.

    The VyOS config path is ``service.broadcast-relay.id``, which is a dict
    keyed by relay ID string. Each value is a dict that may contain:

    - ``description``: str
    - ``interface``: str (single) or list (multi-value)
    - ``address``: str
    - ``port``: str or int
    - ``disable``: presence indicates the instance is disabled (flag node)

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for all broadcast relay instances.
    """
    await require_read_permission(http_request, FeatureGroup.BROADCAST_RELAY)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return BroadcastRelayConfigResponse()

        service_config = full_config["service"]

        if "broadcast-relay" not in service_config:
            return BroadcastRelayConfigResponse()

        br_config = service_config["broadcast-relay"]

        if "id" not in br_config or not isinstance(br_config["id"], dict):
            return BroadcastRelayConfigResponse()

        relays: List[BroadcastRelayInstance] = []

        for relay_id, relay_data in br_config["id"].items():
            if not isinstance(relay_data, dict):
                relay_data = {}

            # Normalize interface: VyOS returns str for single, list for multiple
            raw_iface = relay_data.get("interface")
            if raw_iface is None:
                interfaces: List[str] = []
            elif isinstance(raw_iface, list):
                interfaces = raw_iface
            elif isinstance(raw_iface, dict):
                # Some VyOS versions return multi-value as dict keys
                interfaces = list(raw_iface.keys())
            else:
                interfaces = [str(raw_iface)]

            # Port may come back as int from VyOS — normalize to str
            raw_port = relay_data.get("port")
            port: Optional[str] = str(raw_port) if raw_port is not None else None

            relays.append(BroadcastRelayInstance(
                id=relay_id,
                description=relay_data.get("description"),
                interfaces=interfaces,
                address=relay_data.get("address"),
                port=port,
                # "disable" is a flag node: its presence (any value) means disabled
                disabled="disable" in relay_data,
            ))

        # Return instances sorted by numeric relay ID for deterministic ordering
        relays.sort(key=lambda r: int(r.id) if r.id.isdigit() else 0)

        return BroadcastRelayConfigResponse(relays=relays)

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in get_broadcast_relay_config")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def broadcast_relay_batch_configure(
    http_request: Request,
    body: BroadcastRelayBatchRequest,
):
    """
    Execute a batch of broadcast relay configuration operations.

    Uses the ``item_name`` + ``operations`` pattern. ``item_name`` is the relay
    instance ID and is always passed as the first argument to builder methods
    that require it.  The ``inspect.signature`` reflection determines how many
    arguments each method accepts:

    - 0 params — called with no arguments
    - 1 param  — called with ``item_name`` (relay_id)
    - 2 params — called with ``(item_name, operation.value)``

    Example — create relay instance 1::

        POST /vyos/broadcast-relay/batch
        {
            "item_name": "1",
            "operations": [{"op": "set_id"}]
        }

    Example — add interface to relay 1::

        POST /vyos/broadcast-relay/batch
        {
            "item_name": "1",
            "operations": [{"op": "set_interface", "value": "eth0"}]
        }

    Example — delete entire relay instance 3::

        POST /vyos/broadcast-relay/batch
        {
            "item_name": "3",
            "operations": [{"op": "delete_id"}]
        }
    """
    await require_write_permission(http_request, FeatureGroup.BROADCAST_RELAY)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        builder = BroadcastRelayBatchBuilder(version=version)

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
            data={"message": "Broadcast relay configuration updated"},
            error=response.error if response.error else None,
        )

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error in broadcast_relay_batch_configure")
        raise HTTPException(status_code=500, detail="Internal server error")
