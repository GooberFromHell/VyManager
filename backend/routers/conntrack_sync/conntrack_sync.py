"""
Conntrack Sync Service Router

API endpoints for managing VyOS conntrack-sync service configuration.
Supports accept-protocol, expect-sync, failover-mechanism (VRRP/cluster),
interfaces, mcast-group, listen-address (v1.5+), and queue size settings.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.conntrack_sync import ConntrackSyncBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/conntrack-sync", tags=["conntrack-sync"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class ConntrackSyncInterface(BaseModel):
    """Conntrack sync interface configuration."""
    name: str = Field(..., description="Interface name")
    port: Optional[str] = Field(None, description="Optional port override")


class ConntrackSyncFailoverMechanism(BaseModel):
    """Conntrack sync failover mechanism configuration."""
    type: str = Field(..., description="Failover type: 'vrrp' or 'cluster'")
    sync_group: Optional[str] = Field(None, description="VRRP sync-group name")
    cluster_group: Optional[str] = Field(None, description="Cluster group name (v1.4 only)")


class ConntrackSyncConfigResponse(BaseModel):
    """Full conntrack-sync service configuration."""
    accept_protocols: List[str] = Field(default_factory=list)
    disable_external_cache: bool = False
    expect_sync: List[str] = Field(default_factory=list)
    failover_mechanism: Optional[ConntrackSyncFailoverMechanism] = None
    interfaces: List[ConntrackSyncInterface] = Field(default_factory=list)
    listen_addresses: List[str] = Field(default_factory=list)
    mcast_group: Optional[str] = None
    event_listen_queue_size: Optional[str] = None
    sync_queue_size: Optional[str] = None
    startup_resync: Optional[bool] = None


class ConntrackSyncBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Primary value for the operation")
    value2: Optional[str] = Field(None, description="Secondary value (e.g., port for interface)")


class ConntrackSyncBatchRequest(BaseModel):
    """Model for batch conntrack-sync configuration."""
    operations: List[ConntrackSyncBatchOperation] = Field(
        ..., description="List of operations to perform"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "operations": [
                    {"op": "set_accept_protocol", "value": "tcp"},
                    {"op": "set_interface", "value": "eth1"},
                    {"op": "set_interface_port", "value": "eth1", "value2": "3780"},
                    {"op": "set_failover_mechanism_vrrp_sync_group", "value": "VRRP-GROUP"},
                    {"op": "set_mcast_group", "value": "225.0.0.50"},
                ],
            }
        }


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================


def _normalize_to_list(data: Any, key: str) -> List[str]:
    """Normalize a VyOS config value (str, list, or dict) to a list of strings."""
    if key not in data:
        return []
    val = data[key]
    if isinstance(val, dict):
        return list(val.keys())
    elif isinstance(val, list):
        return val
    elif isinstance(val, str):
        return [val]
    return []


def _parse_failover_mechanism(cs_config: dict) -> Optional[ConntrackSyncFailoverMechanism]:
    """Parse the failover-mechanism section from conntrack-sync config."""
    if "failover-mechanism" not in cs_config:
        return None

    fm_data = cs_config["failover-mechanism"]
    if not isinstance(fm_data, dict):
        return None

    # Check for VRRP
    if "vrrp" in fm_data:
        vrrp_data = fm_data["vrrp"]
        sync_group = None
        if isinstance(vrrp_data, dict) and "sync-group" in vrrp_data:
            sg = vrrp_data["sync-group"]
            # sync-group may be a plain string or a dict with the name as key
            if isinstance(sg, dict):
                sync_group = list(sg.keys())[0] if sg else None
            else:
                sync_group = str(sg) if sg is not None else None
        return ConntrackSyncFailoverMechanism(type="vrrp", sync_group=sync_group)

    # Check for cluster (v1.4)
    if "cluster" in fm_data:
        cluster_data = fm_data["cluster"]
        cluster_group = None
        if isinstance(cluster_data, dict) and "group" in cluster_data:
            grp = cluster_data["group"]
            if isinstance(grp, dict):
                cluster_group = list(grp.keys())[0] if grp else None
            else:
                cluster_group = str(grp) if grp is not None else None
        return ConntrackSyncFailoverMechanism(type="cluster", cluster_group=cluster_group)

    return None


def _parse_interfaces(cs_config: dict) -> List[ConntrackSyncInterface]:
    """Parse the interface collection from conntrack-sync config."""
    if "interface" not in cs_config:
        return []

    iface_data = cs_config["interface"]
    if not isinstance(iface_data, dict):
        return []

    interfaces = []
    for iface_name, iface_cfg in iface_data.items():
        port = None
        if isinstance(iface_cfg, dict) and "port" in iface_cfg:
            raw_port = iface_cfg["port"]
            if isinstance(raw_port, int):
                port = str(raw_port)
            elif isinstance(raw_port, dict):
                port = list(raw_port.keys())[0] if raw_port else None
            elif isinstance(raw_port, str):
                port = raw_port
        interfaces.append(ConntrackSyncInterface(name=iface_name, port=port))

    return interfaces


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_conntrack_sync_capabilities(request: Request):
    """
    Get conntrack-sync capabilities based on device VyOS version.

    Returns feature flags indicating which conntrack-sync features are supported.
    """
    await require_read_permission(request, FeatureGroup.CONNTRACK_SYNC)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = ConntrackSyncBatchBuilder(version=version)
        capabilities = builder.get_capabilities()

        if hasattr(request.state, "instance") and request.state.instance:
            capabilities["instance_name"] = request.state.instance.get("name")
            capabilities["instance_id"] = request.state.instance.get("id")

        return capabilities
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/config", response_model=ConntrackSyncConfigResponse)
async def get_conntrack_sync_config(http_request: Request, refresh: bool = False):
    """
    Get conntrack-sync service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Full conntrack-sync service configuration.
    """
    await require_read_permission(http_request, FeatureGroup.CONNTRACK_SYNC)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return ConntrackSyncConfigResponse()

        service_config = full_config["service"]

        if "conntrack-sync" not in service_config:
            return ConntrackSyncConfigResponse()

        cs_config = service_config["conntrack-sync"]

        # Parse accept-protocol: may be str, list, or dict-keyed
        accept_protocols = _normalize_to_list(cs_config, "accept-protocol")

        # Parse disable-external-cache: presence flag
        disable_external_cache = "disable-external-cache" in cs_config

        # Parse expect-sync: may be str, list, or dict-keyed
        expect_sync = _normalize_to_list(cs_config, "expect-sync")

        # Parse failover-mechanism
        failover_mechanism = _parse_failover_mechanism(cs_config)

        # Parse interfaces
        interfaces = _parse_interfaces(cs_config)

        # Parse listen-address (v1.5 only): may be str, list, or dict-keyed
        listen_addresses = _normalize_to_list(cs_config, "listen-address")

        # Parse mcast-group: scalar string
        mcast_group = cs_config.get("mcast-group")
        if isinstance(mcast_group, int):
            mcast_group = str(mcast_group)

        # Parse event-listen-queue-size (v1.5 only)
        event_listen_queue_size = cs_config.get("event-listen-queue-size")
        if isinstance(event_listen_queue_size, int):
            event_listen_queue_size = str(event_listen_queue_size)

        # Parse sync-queue-size (v1.5 only)
        sync_queue_size = cs_config.get("sync-queue-size")
        if isinstance(sync_queue_size, int):
            sync_queue_size = str(sync_queue_size)

        # Parse startup-resync (v1.5 only): presence flag
        startup_resync = True if "startup-resync" in cs_config else None

        return ConntrackSyncConfigResponse(
            accept_protocols=accept_protocols,
            disable_external_cache=disable_external_cache,
            expect_sync=expect_sync,
            failover_mechanism=failover_mechanism,
            interfaces=interfaces,
            listen_addresses=listen_addresses,
            mcast_group=mcast_group,
            event_listen_queue_size=event_listen_queue_size,
            sync_queue_size=sync_queue_size,
            startup_resync=startup_resync,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def conntrack_sync_batch_configure(
    http_request: Request, request: ConntrackSyncBatchRequest
):
    """
    Execute a batch of conntrack-sync configuration operations.

    This endpoint allows multiple conntrack-sync configuration changes to be
    applied in a single VyOS commit operation for efficiency.

    Operations that take two values (e.g., set_interface_port) use both
    ``value`` (primary, e.g., interface name) and ``value2`` (secondary, e.g., port).

    Args:
        request: Batch request containing operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.CONNTRACK_SYNC)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = ConntrackSyncBatchBuilder(version=version)

        # Process each operation
        for operation in request.operations:
            op_name = operation.op
            op_value = operation.value
            op_value2 = operation.value2

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
            param_count = len(params)

            # Build arguments based on parameter count
            if param_count == 0:
                method()
            elif param_count == 1:
                if op_value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op_name}' requires 'value'"
                    )
                method(op_value)
            else:
                # Two-parameter methods (e.g., set_interface_port(iface, port))
                if op_value is None:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Operation '{op_name}' requires 'value'"
                    )
                if op_value2 is not None:
                    method(op_value, op_value2)
                else:
                    method(op_value)

        # Check if batch has operations
        if builder.is_empty():
            return VyOSResponse(
                success=True, data={"message": "No operations to execute"}
            )

        # Execute batch operations
        response = service.execute_batch(builder)

        operation_count = len(builder.get_operations())

        # Handle empty string result
        result_data = response.result
        if result_data == "" or result_data is None:
            result_data = {
                "message": "Conntrack sync configuration updated",
                "operations_count": operation_count,
            }
        elif not isinstance(result_data, dict):
            result_data = {
                "result": result_data,
                "message": "Conntrack sync configuration updated",
                "operations_count": operation_count,
            }
        else:
            result_data["message"] = "Conntrack sync configuration updated"
            result_data["operations_count"] = operation_count

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None,
        )

    except HTTPException:
        raise
    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
