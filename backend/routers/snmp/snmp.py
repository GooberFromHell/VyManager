"""
SNMP Service Router

API endpoints for managing VyOS SNMP service configuration.
Supports communities, contact/description/location, listen addresses,
trap targets, and SNMPv3 groups/users/views.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders import SNMPBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/snmp", tags=["snmp"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class SNMPCommunity(BaseModel):
    """SNMP community configuration."""
    name: str = Field(..., description="Community name")
    authorization: Optional[str] = Field(None, description="Authorization level (ro or rw)")
    clients: List[str] = Field(default_factory=list, description="Allowed client IPs")
    networks: List[str] = Field(default_factory=list, description="Allowed network CIDRs")


class SNMPListenAddress(BaseModel):
    """SNMP listen address configuration."""
    address: str = Field(..., description="Listen address IP")
    port: Optional[str] = Field(None, description="Listen port")


class SNMPTrapTarget(BaseModel):
    """SNMP trap target configuration."""
    address: str = Field(..., description="Trap target IP")
    community: Optional[str] = Field(None, description="Community for trap target")
    port: Optional[str] = Field(None, description="Port for trap target")


class SNMPv3Group(BaseModel):
    """SNMPv3 group configuration."""
    name: str = Field(..., description="Group name")
    mode: Optional[str] = Field(None, description="Access mode (ro or rw)")
    seclevel: Optional[str] = Field(None, description="Security level (auth, priv, or noauth)")
    view: Optional[str] = Field(None, description="View name")


class SNMPv3User(BaseModel):
    """SNMPv3 user configuration."""
    name: str = Field(..., description="User name")
    auth_type: Optional[str] = Field(None, description="Auth type (md5 or sha)")
    auth_key: Optional[str] = Field(None, description="Auth plaintext key")
    privacy_type: Optional[str] = Field(None, description="Privacy type (aes or des)")
    privacy_key: Optional[str] = Field(None, description="Privacy plaintext key")
    group: Optional[str] = Field(None, description="Group name")
    mode: Optional[str] = Field(None, description="Access mode (ro or rw)")


class SNMPv3View(BaseModel):
    """SNMPv3 view configuration."""
    name: str = Field(..., description="View name")
    oids: List[str] = Field(default_factory=list, description="OIDs included in view")


class SNMPv3Config(BaseModel):
    """SNMPv3 configuration."""
    engine_id: Optional[str] = Field(None, description="Engine ID (hex)")
    groups: List[SNMPv3Group] = Field(default_factory=list)
    users: List[SNMPv3User] = Field(default_factory=list)
    views: List[SNMPv3View] = Field(default_factory=list)


class SNMPConfigResponse(BaseModel):
    """Full SNMP configuration."""
    communities: List[SNMPCommunity] = Field(default_factory=list)
    contact: Optional[str] = None
    description: Optional[str] = None
    listen_addresses: List[SNMPListenAddress] = Field(default_factory=list)
    location: Optional[str] = None
    trap_source: Optional[str] = None
    trap_targets: List[SNMPTrapTarget] = Field(default_factory=list)
    v3: SNMPv3Config = Field(default_factory=SNMPv3Config)


class SNMPBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class SNMPBatchRequest(BaseModel):
    """Model for batch SNMP configuration."""
    item_name: str = Field(..., description="Primary item (community name, address, etc.)")
    operations: List[SNMPBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_snmp_capabilities(request: Request):
    """
    Get SNMP capabilities based on device VyOS version.

    Returns feature flags indicating which SNMP features are supported.
    """
    await require_read_permission(request, FeatureGroup.SNMP)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = SNMPBatchBuilder(version=version)
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


@router.get("/config", response_model=SNMPConfigResponse)
async def get_snmp_config(http_request: Request, refresh: bool = False):
    """
    Get SNMP service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for SNMP service.
    """
    await require_read_permission(http_request, FeatureGroup.SNMP)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return SNMPConfigResponse()

        service_config = full_config["service"]

        if "snmp" not in service_config:
            return SNMPConfigResponse()

        snmp_config = service_config["snmp"]

        # Parse communities
        communities = []
        if "community" in snmp_config and isinstance(snmp_config["community"], dict):
            for name, comm_data in snmp_config["community"].items():
                if not isinstance(comm_data, dict):
                    comm_data = {}

                # Parse authorization
                authorization = comm_data.get("authorization")

                # Parse clients
                clients = []
                if "client" in comm_data:
                    client_data = comm_data["client"]
                    if isinstance(client_data, dict):
                        clients = list(client_data.keys())
                    elif isinstance(client_data, list):
                        clients = client_data
                    elif isinstance(client_data, str):
                        clients = [client_data]

                # Parse networks
                networks = []
                if "network" in comm_data:
                    network_data = comm_data["network"]
                    if isinstance(network_data, dict):
                        networks = list(network_data.keys())
                    elif isinstance(network_data, list):
                        networks = network_data
                    elif isinstance(network_data, str):
                        networks = [network_data]

                communities.append(SNMPCommunity(
                    name=name,
                    authorization=authorization,
                    clients=clients,
                    networks=networks,
                ))

        # Parse simple string values
        contact = snmp_config.get("contact")
        description = snmp_config.get("description")
        location = snmp_config.get("location")
        trap_source = snmp_config.get("trap-source")

        # Parse listen addresses
        listen_addresses = []
        if "listen-address" in snmp_config:
            la_data = snmp_config["listen-address"]
            if isinstance(la_data, dict):
                for addr, addr_data in la_data.items():
                    port = None
                    if isinstance(addr_data, dict):
                        port = addr_data.get("port")
                    listen_addresses.append(SNMPListenAddress(
                        address=addr,
                        port=str(port) if port is not None else None,
                    ))
            elif isinstance(la_data, list):
                for addr in la_data:
                    listen_addresses.append(SNMPListenAddress(address=addr))
            elif isinstance(la_data, str):
                listen_addresses.append(SNMPListenAddress(address=la_data))

        # Parse trap targets
        trap_targets = []
        if "trap-target" in snmp_config:
            tt_data = snmp_config["trap-target"]
            if isinstance(tt_data, dict):
                for addr, target_data in tt_data.items():
                    community = None
                    port = None
                    if isinstance(target_data, dict):
                        community = target_data.get("community")
                        port = target_data.get("port")
                    trap_targets.append(SNMPTrapTarget(
                        address=addr,
                        community=community,
                        port=str(port) if port is not None else None,
                    ))

        # Parse v3 configuration
        v3_config = SNMPv3Config()
        if "v3" in snmp_config and isinstance(snmp_config["v3"], dict):
            v3_data = snmp_config["v3"]

            # Engine ID
            v3_config.engine_id = v3_data.get("engineid")

            # Parse v3 groups
            if "group" in v3_data and isinstance(v3_data["group"], dict):
                for name, group_data in v3_data["group"].items():
                    if not isinstance(group_data, dict):
                        group_data = {}
                    v3_config.groups.append(SNMPv3Group(
                        name=name,
                        mode=group_data.get("mode"),
                        seclevel=group_data.get("seclevel"),
                        view=group_data.get("view"),
                    ))

            # Parse v3 users
            if "user" in v3_data and isinstance(v3_data["user"], dict):
                for name, user_data in v3_data["user"].items():
                    if not isinstance(user_data, dict):
                        user_data = {}

                    auth_type = None
                    auth_key = None
                    if "auth" in user_data and isinstance(user_data["auth"], dict):
                        auth_type = user_data["auth"].get("type")
                        auth_key = user_data["auth"].get("plaintext-key")

                    privacy_type = None
                    privacy_key = None
                    if "privacy" in user_data and isinstance(user_data["privacy"], dict):
                        privacy_type = user_data["privacy"].get("type")
                        privacy_key = user_data["privacy"].get("plaintext-key")

                    v3_config.users.append(SNMPv3User(
                        name=name,
                        auth_type=auth_type,
                        auth_key=auth_key,
                        privacy_type=privacy_type,
                        privacy_key=privacy_key,
                        group=user_data.get("group"),
                        mode=user_data.get("mode"),
                    ))

            # Parse v3 views
            if "view" in v3_data and isinstance(v3_data["view"], dict):
                for name, view_data in v3_data["view"].items():
                    oids = []
                    if isinstance(view_data, dict) and "oid" in view_data:
                        oid_data = view_data["oid"]
                        if isinstance(oid_data, dict):
                            oids = list(oid_data.keys())
                        elif isinstance(oid_data, list):
                            oids = oid_data
                        elif isinstance(oid_data, str):
                            oids = [oid_data]
                    v3_config.views.append(SNMPv3View(
                        name=name,
                        oids=oids,
                    ))

        return SNMPConfigResponse(
            communities=communities,
            contact=contact,
            description=description,
            listen_addresses=listen_addresses,
            location=location,
            trap_source=trap_source,
            trap_targets=trap_targets,
            v3=v3_config,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def snmp_batch_configure(http_request: Request, request: SNMPBatchRequest):
    """
    Execute a batch of SNMP configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.SNMP)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = SNMPBatchBuilder(version=version)

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
                # First parameter is typically the item_name (community name, address, etc.)
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
            result_data = {"message": "SNMP configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "SNMP configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "SNMP configuration updated"
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
