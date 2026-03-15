"""
SSH Service Router

API endpoints for managing VyOS SSH service configuration.
Supports port, ciphers, key exchange, MACs, access control, and dynamic protection.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from session_vyos_service import get_session_vyos_service
from vyos_builders.ssh import SSHBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import inspect
import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/ssh", tags=["ssh"])


# ============================================================================
# Request/Response Models
# ============================================================================


class SSHDynamicProtection(BaseModel):
    """SSH dynamic protection (brute-force defense) config."""
    enabled: bool = False
    allow_from: List[str] = Field(default_factory=list)
    block_time: Optional[str] = None
    detect_time: Optional[str] = None
    threshold: Optional[str] = None


class SSHAccessControl(BaseModel):
    """SSH access control configuration."""
    allow_users: List[str] = Field(default_factory=list)
    deny_users: List[str] = Field(default_factory=list)
    allow_groups: List[str] = Field(default_factory=list)
    deny_groups: List[str] = Field(default_factory=list)


class SSHConfigResponse(BaseModel):
    """Full SSH service configuration."""
    port: Optional[str] = None
    listen_addresses: List[str] = Field(default_factory=list)
    ciphers: List[str] = Field(default_factory=list)
    key_exchange: List[str] = Field(default_factory=list)
    mac: List[str] = Field(default_factory=list)
    disable_password_authentication: bool = False
    disable_host_validation: bool = False
    loglevel: Optional[str] = None
    client_keepalive_interval: Optional[str] = None
    vrf: Optional[str] = None
    access_control: SSHAccessControl = Field(default_factory=SSHAccessControl)
    dynamic_protection: SSHDynamicProtection = Field(default_factory=SSHDynamicProtection)


class SSHBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for the operation")


class SSHBatchRequest(BaseModel):
    """Model for batch SSH configuration."""
    operations: List[SSHBatchOperation] = Field(
        ..., description="List of operations to perform"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "operations": [
                    {"op": "set_port", "value": "22"},
                    {"op": "set_disable_password_authentication"},
                    {"op": "set_cipher", "value": "aes256-ctr"},
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


def _parse_dict_keys_to_list(data, key: str) -> List[str]:
    """Parse a VyOS config dict key into a list of strings."""
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


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_ssh_capabilities(request: Request):
    """
    Get SSH capabilities based on device VyOS version.

    Returns feature flags indicating which SSH features are supported.
    """
    await require_read_permission(request, FeatureGroup.SSH)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = SSHBatchBuilder(version=version)
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


@router.get("/config", response_model=SSHConfigResponse)
async def get_ssh_config(http_request: Request, refresh: bool = False):
    """
    Get SSH service configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Full SSH service configuration.
    """
    await require_read_permission(http_request, FeatureGroup.SSH)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config or "service" not in full_config:
            return SSHConfigResponse()

        service_config = full_config["service"]

        if "ssh" not in service_config:
            return SSHConfigResponse()

        ssh_config = service_config["ssh"]

        # Get the version-aware cipher config key
        builder = SSHBatchBuilder(version=version)
        cipher_key = builder.mappers[builder.mapper_key].get_cipher_config_key()

        # Parse basic scalar values
        port = ssh_config.get("port")
        if isinstance(port, dict):
            port = list(port.keys())[0] if port else None
        elif isinstance(port, int):
            port = str(port)

        # Parse list values
        listen_addresses = _parse_dict_keys_to_list(ssh_config, "listen-address")
        ciphers = _parse_dict_keys_to_list(ssh_config, cipher_key)
        key_exchange = _parse_dict_keys_to_list(ssh_config, "key-exchange")
        mac = _parse_dict_keys_to_list(ssh_config, "mac")

        # Parse boolean flags (presence check)
        disable_password_authentication = "disable-password-authentication" in ssh_config
        disable_host_validation = "disable-host-validation" in ssh_config

        # Parse scalar settings
        loglevel = ssh_config.get("loglevel")
        client_keepalive_interval = ssh_config.get("client-keepalive-interval")
        if isinstance(client_keepalive_interval, int):
            client_keepalive_interval = str(client_keepalive_interval)
        vrf = ssh_config.get("vrf")

        # Parse access control
        access_control = SSHAccessControl()
        if "access-control" in ssh_config:
            ac_data = ssh_config["access-control"]
            if "allow" in ac_data:
                allow_data = ac_data["allow"]
                access_control.allow_users = _parse_dict_keys_to_list(allow_data, "user")
                access_control.allow_groups = _parse_dict_keys_to_list(allow_data, "group")
            if "deny" in ac_data:
                deny_data = ac_data["deny"]
                access_control.deny_users = _parse_dict_keys_to_list(deny_data, "user")
                access_control.deny_groups = _parse_dict_keys_to_list(deny_data, "group")

        # Parse dynamic protection
        dynamic_protection = SSHDynamicProtection()
        if "dynamic-protection" in ssh_config:
            dp_data = ssh_config["dynamic-protection"]
            dynamic_protection.enabled = True
            dynamic_protection.allow_from = _parse_dict_keys_to_list(dp_data, "allow-from")
            dynamic_protection.block_time = dp_data.get("block-time")
            if isinstance(dynamic_protection.block_time, int):
                dynamic_protection.block_time = str(dynamic_protection.block_time)
            dynamic_protection.detect_time = dp_data.get("detect-time")
            if isinstance(dynamic_protection.detect_time, int):
                dynamic_protection.detect_time = str(dynamic_protection.detect_time)
            dynamic_protection.threshold = dp_data.get("threshold")
            if isinstance(dynamic_protection.threshold, int):
                dynamic_protection.threshold = str(dynamic_protection.threshold)

        return SSHConfigResponse(
            port=port,
            listen_addresses=listen_addresses,
            ciphers=ciphers,
            key_exchange=key_exchange,
            mac=mac,
            disable_password_authentication=disable_password_authentication,
            disable_host_validation=disable_host_validation,
            loglevel=loglevel,
            client_keepalive_interval=client_keepalive_interval,
            vrf=vrf,
            access_control=access_control,
            dynamic_protection=dynamic_protection,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def ssh_batch_configure(http_request: Request, request: SSHBatchRequest):
    """
    Execute a batch of SSH configuration operations.

    This endpoint allows multiple SSH configuration changes to be applied
    in a single VyOS commit operation for efficiency.

    Args:
        request: Batch request containing operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.SSH)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = SSHBatchBuilder(version=version)

        # Process each operation
        for operation in request.operations:
            op_name = operation.op
            op_value = operation.value

            if not hasattr(builder, op_name):
                raise HTTPException(
                    status_code=400, detail=f"Unknown operation: {op_name}"
                )

            method = getattr(builder, op_name)

            # Use inspect to determine method signature
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())

            # Build arguments based on method signature
            if params and op_value is not None:
                method(op_value)
            else:
                method()

        # Check if batch has operations
        if builder.is_empty():
            return VyOSResponse(success=True, data={"message": "No operations to execute"})

        # Execute batch operations
        response = service.execute_batch(builder)

        operation_count = len(builder.get_operations())

        # Handle empty string result
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = {"message": "SSH configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "SSH configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "SSH configuration updated"
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
