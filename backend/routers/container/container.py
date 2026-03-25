"""
Container Service Router

API endpoints for managing VyOS container configuration.
Supports containers, container networks, and container registries.
"""

import inspect
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from session_vyos_service import get_session_vyos_service
from vyos_builders.container import ContainerBatchBuilder
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vyos/container", tags=["container"])

# Methods that should not be callable via the batch endpoint
_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities",
})


# ============================================================================
# Request/Response Models
# ============================================================================


class ContainerPort(BaseModel):
    """Port mapping for a container."""
    name: str
    source: Optional[str] = None
    destination: Optional[str] = None
    protocol: str = "tcp"


class ContainerVolume(BaseModel):
    """Volume mount for a container."""
    name: str
    source: Optional[str] = None
    destination: Optional[str] = None
    mode: str = "rw"


class ContainerEnvironment(BaseModel):
    """Environment variable for a container."""
    key: str
    value: str


class ContainerLabel(BaseModel):
    """Label for a container."""
    key: str
    value: str


class ContainerDevice(BaseModel):
    """Device mapping for a container."""
    name: str
    source: Optional[str] = None
    destination: Optional[str] = None


class ContainerSysctl(BaseModel):
    """Sysctl parameter for a container (v1.5 only)."""
    parameter: str
    value: str


class ContainerTmpfs(BaseModel):
    """Tmpfs mount for a container (v1.5 only)."""
    name: str
    destination: Optional[str] = None
    size: Optional[int] = None


class ContainerEntry(BaseModel):
    """Full configuration for a single container."""
    name: str
    image: Optional[str] = None
    networks: List[str] = Field(default_factory=list)
    network_addresses: Dict[str, str] = Field(default_factory=dict)
    ports: List[ContainerPort] = Field(default_factory=list)
    volumes: List[ContainerVolume] = Field(default_factory=list)
    environment: List[ContainerEnvironment] = Field(default_factory=list)
    labels: List[ContainerLabel] = Field(default_factory=list)
    devices: List[ContainerDevice] = Field(default_factory=list)
    capabilities: List[str] = Field(default_factory=list)
    restart: Optional[str] = None
    memory: Optional[int] = None
    cpu_quota: Optional[str] = None
    description: Optional[str] = None
    host_name: Optional[str] = None
    entrypoint: Optional[str] = None
    command: Optional[str] = None
    arguments: Optional[str] = None
    uid: Optional[int] = None
    gid: Optional[int] = None
    allow_host_networks: bool = False
    allow_host_pid: bool = False
    disabled: bool = False
    name_servers: List[str] = Field(default_factory=list)
    log_driver: Optional[str] = None
    sysctls: List[ContainerSysctl] = Field(default_factory=list)
    tmpfs_mounts: List[ContainerTmpfs] = Field(default_factory=list)


class ContainerNetwork(BaseModel):
    """Configuration for a container network."""
    name: str
    prefixes: List[str] = Field(default_factory=list)
    description: Optional[str] = None
    mtu: Optional[int] = None
    vrf: Optional[str] = None
    no_name_server: bool = False


class ContainerRegistry(BaseModel):
    """Configuration for a container registry."""
    url: str
    username: Optional[str] = None
    password: Optional[str] = None
    disabled: bool = False
    insecure: bool = False


class ContainerConfigResponse(BaseModel):
    """Full container configuration response."""
    containers: List[ContainerEntry] = Field(default_factory=list)
    networks: List[ContainerNetwork] = Field(default_factory=list)
    registries: List[ContainerRegistry] = Field(default_factory=list)


class ContainerBatchOperation(BaseModel):
    """Single operation in a batch request."""
    op: str = Field(..., description="Builder method name")
    value: Optional[str] = Field(None, description="Value for operation")


class ContainerBatchRequest(BaseModel):
    """Model for batch container configuration."""
    item_name: str = Field(..., description="Container name, network name, or registry URL")
    operations: List[ContainerBatchOperation]


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ============================================================================
# API Endpoints
# ============================================================================


@router.get("/capabilities")
async def get_container_capabilities(request: Request):
    """
    Get container capabilities based on device VyOS version.

    Returns feature flags indicating which container features are supported.
    """
    await require_read_permission(request, FeatureGroup.CONTAINER)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()
        builder = ContainerBatchBuilder(version=version)
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


@router.get("/config", response_model=ContainerConfigResponse)
async def get_container_config(http_request: Request, refresh: bool = False):
    """
    Get container configuration from VyOS.

    Args:
        refresh: If True, force refresh from VyOS. If False, use cache if available.

    Returns:
        Configuration details for containers, networks, and registries.
    """
    await require_read_permission(http_request, FeatureGroup.CONTAINER)

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)

        if not full_config:
            return ContainerConfigResponse()

        container_config = full_config.get("container", {})
        if not container_config:
            return ContainerConfigResponse()

        # ----------------------------------------------------------------
        # Parse containers
        # ----------------------------------------------------------------
        containers = []
        names_config = container_config.get("name", {})
        if isinstance(names_config, dict):
            for cname, cdata in names_config.items():
                if not isinstance(cdata, dict):
                    cdata = {}

                # Parse ports
                ports = []
                ports_data = cdata.get("port", {})
                if isinstance(ports_data, dict):
                    for pname, pdata in ports_data.items():
                        if not isinstance(pdata, dict):
                            pdata = {}
                        ports.append(ContainerPort(
                            name=pname,
                            source=pdata.get("source"),
                            destination=pdata.get("destination"),
                            protocol=pdata.get("protocol", "tcp"),
                        ))

                # Parse volumes
                volumes = []
                volumes_data = cdata.get("volume", {})
                if isinstance(volumes_data, dict):
                    for vname, vdata in volumes_data.items():
                        if not isinstance(vdata, dict):
                            vdata = {}
                        volumes.append(ContainerVolume(
                            name=vname,
                            source=vdata.get("source"),
                            destination=vdata.get("destination"),
                            mode=vdata.get("mode", "rw"),
                        ))

                # Parse environment
                environment = []
                env_data = cdata.get("environment", {})
                if isinstance(env_data, dict):
                    for ekey, edata in env_data.items():
                        val = ""
                        if isinstance(edata, dict):
                            val = edata.get("value", "")
                        elif isinstance(edata, str):
                            val = edata
                        environment.append(ContainerEnvironment(key=ekey, value=val))

                # Parse labels
                labels = []
                labels_data = cdata.get("label", {})
                if isinstance(labels_data, dict):
                    for lkey, ldata in labels_data.items():
                        val = ""
                        if isinstance(ldata, dict):
                            val = ldata.get("value", "")
                        elif isinstance(ldata, str):
                            val = ldata
                        labels.append(ContainerLabel(key=lkey, value=val))

                # Parse devices
                devices = []
                devices_data = cdata.get("device", {})
                if isinstance(devices_data, dict):
                    for dname, ddata in devices_data.items():
                        if not isinstance(ddata, dict):
                            ddata = {}
                        devices.append(ContainerDevice(
                            name=dname,
                            source=ddata.get("source"),
                            destination=ddata.get("destination"),
                        ))

                # Parse capabilities (keyword differs by version)
                capabilities = []
                for cap_key in ["capability", "cap-add"]:
                    cap_data = cdata.get(cap_key, {})
                    if isinstance(cap_data, dict):
                        capabilities.extend(cap_data.keys())
                    elif isinstance(cap_data, list):
                        capabilities.extend(cap_data)
                    elif isinstance(cap_data, str):
                        capabilities.append(cap_data)

                # Parse networks attached to this container
                networks = []
                network_addresses = {}
                net_data = cdata.get("network", {})
                if isinstance(net_data, dict):
                    for nname, ndata in net_data.items():
                        networks.append(nname)
                        if isinstance(ndata, dict) and "address" in ndata:
                            addr = ndata["address"]
                            if isinstance(addr, str):
                                network_addresses[nname] = addr
                            elif isinstance(addr, dict):
                                # Take first address if multiple
                                addrs = list(addr.keys())
                                if addrs:
                                    network_addresses[nname] = addrs[0]

                # Parse name-servers
                name_servers = []
                ns_data = cdata.get("name-server", {})
                if isinstance(ns_data, dict):
                    name_servers = list(ns_data.keys())
                elif isinstance(ns_data, list):
                    name_servers = ns_data
                elif isinstance(ns_data, str):
                    name_servers = [ns_data]

                # Parse sysctls (v1.5 only)
                sysctls = []
                sysctl_data = cdata.get("sysctl", {})
                if isinstance(sysctl_data, dict):
                    param_data = sysctl_data.get("parameter", {})
                    if isinstance(param_data, dict):
                        for param, pval in param_data.items():
                            val = ""
                            if isinstance(pval, dict):
                                val = pval.get("value", "")
                            sysctls.append(ContainerSysctl(parameter=param, value=val))

                # Parse tmpfs (v1.5 only)
                tmpfs_mounts = []
                tmpfs_data = cdata.get("tmpfs", {})
                if isinstance(tmpfs_data, dict):
                    for tname, tdata in tmpfs_data.items():
                        if not isinstance(tdata, dict):
                            tdata = {}
                        size_val = tdata.get("size")
                        tmpfs_mounts.append(ContainerTmpfs(
                            name=tname,
                            destination=tdata.get("destination"),
                            size=int(size_val) if size_val is not None else None,
                        ))

                # Parse memory
                memory_val = cdata.get("memory")
                memory = int(memory_val) if memory_val is not None else None

                # Parse uid/gid
                uid_val = cdata.get("uid")
                uid = int(uid_val) if uid_val is not None else None
                gid_val = cdata.get("gid")
                gid = int(gid_val) if gid_val is not None else None

                containers.append(ContainerEntry(
                    name=cname,
                    image=cdata.get("image"),
                    networks=networks,
                    network_addresses=network_addresses,
                    ports=ports,
                    volumes=volumes,
                    environment=environment,
                    labels=labels,
                    devices=devices,
                    capabilities=capabilities,
                    restart=cdata.get("restart"),
                    memory=memory,
                    cpu_quota=cdata.get("cpu-quota"),
                    description=cdata.get("description"),
                    host_name=cdata.get("host-name"),
                    entrypoint=cdata.get("entrypoint"),
                    command=cdata.get("command"),
                    arguments=cdata.get("arguments"),
                    uid=uid,
                    gid=gid,
                    allow_host_networks="allow-host-networks" in cdata,
                    allow_host_pid="allow-host-pid" in cdata,
                    disabled="disable" in cdata,
                    name_servers=name_servers,
                    log_driver=cdata.get("log-driver"),
                    sysctls=sysctls,
                    tmpfs_mounts=tmpfs_mounts,
                ))

        # ----------------------------------------------------------------
        # Parse container networks
        # ----------------------------------------------------------------
        networks = []
        networks_config = container_config.get("network", {})
        if isinstance(networks_config, dict):
            for net_name, net_data in networks_config.items():
                if not isinstance(net_data, dict):
                    net_data = {}

                prefixes = []
                prefix_data = net_data.get("prefix", {})
                if isinstance(prefix_data, dict):
                    prefixes = list(prefix_data.keys())
                elif isinstance(prefix_data, str):
                    prefixes = [prefix_data]
                elif isinstance(prefix_data, list):
                    prefixes = prefix_data

                mtu_val = net_data.get("mtu")
                mtu = int(mtu_val) if mtu_val is not None else None

                networks.append(ContainerNetwork(
                    name=net_name,
                    prefixes=prefixes,
                    description=net_data.get("description"),
                    mtu=mtu,
                    vrf=net_data.get("vrf"),
                    no_name_server="no-name-server" in net_data,
                ))

        # ----------------------------------------------------------------
        # Parse container registries
        # ----------------------------------------------------------------
        registries = []
        registries_config = container_config.get("registry", {})
        if isinstance(registries_config, dict):
            for reg_url, reg_data in registries_config.items():
                if not isinstance(reg_data, dict):
                    reg_data = {}

                auth_data = reg_data.get("authentication", {})
                username = None
                password = None
                if isinstance(auth_data, dict):
                    username = auth_data.get("username")
                    password = auth_data.get("password")

                registries.append(ContainerRegistry(
                    url=reg_url,
                    username=username,
                    password=password,
                    disabled="disable" in reg_data,
                    insecure="insecure" in reg_data,
                ))

        return ContainerConfigResponse(
            containers=containers,
            networks=networks,
            registries=registries,
        )

    except KeyError:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/batch")
async def container_batch_configure(http_request: Request, request: ContainerBatchRequest):
    """
    Execute a batch of container configuration operations.

    Args:
        request: Batch request containing item_name and operations list

    Returns:
        Success status and any relevant data
    """
    await require_write_permission(http_request, FeatureGroup.CONTAINER)

    try:
        service = get_session_vyos_service(http_request)
        version = service.get_version()

        # Snapshot before change
        instance_id = http_request.state.instance["id"]
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        # Create builder
        builder = ContainerBatchBuilder(version=version)

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
                # First parameter is typically the item_name (name, url, etc.)
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
        if result_data == "" or result_data is None:
            result_data = {"message": "Container configuration updated", "operations_count": operation_count}
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data, "message": "Container configuration updated", "operations_count": operation_count}
        else:
            result_data["message"] = "Container configuration updated"
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
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
