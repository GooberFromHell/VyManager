# Canonical Backend Router Pattern
# Source: backend/routers/ntp/ntp.py
# Used by DERPO agents as the reference implementation for new feature routers.

from fastapi import APIRouter, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List, Optional
import inspect

from backend.session_vyos_service import get_session_vyos_service
from backend.vyos_builders.ntp.ntp import NTPBatchBuilder
from backend.rbac_permissions import FeatureGroup, require_read_permission, require_write_permission
from backend.middleware.session import require_active_instance
from backend.routers.config.config import ensure_snapshot_before_change

router = APIRouter(prefix="/vyos/ntp", tags=["ntp"])

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "clear", "get_operations",
    "operation_count", "is_empty", "get_capabilities"
})


# --- Pydantic Models ---

class NTPServer(BaseModel):
    address: str
    noselect: bool = False
    prefer: bool = False
    pool: bool = False

class NTPConfigResponse(BaseModel):
    servers: List[NTPServer] = []
    listen_addresses: List[str] = []
    allow_clients: List[str] = []
    vrf: Optional[str] = None

class NTPBatchOperation(BaseModel):
    op: str
    value: Optional[str] = None

class NTPBatchRequest(BaseModel):
    server_address: Optional[str] = None
    operations: List[NTPBatchOperation]

class VyOSResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


# --- Endpoints ---

@router.get("/capabilities")
async def get_ntp_capabilities(request: Request):
    await require_read_permission(request, FeatureGroup.NTP)
    instance = require_active_instance(request)
    service = get_session_vyos_service(request)
    version = service.get_version()
    builder = NTPBatchBuilder(version=version)
    caps = builder.get_capabilities()
    caps["device_name"] = instance.get("name", "Unknown")
    return caps


@router.get("/config", response_model=NTPConfigResponse)
async def get_ntp_config(request: Request, refresh: bool = False):
    await require_read_permission(request, FeatureGroup.NTP)
    require_active_instance(request)
    service = get_session_vyos_service(request)
    full_config = await run_in_threadpool(service.get_full_config, refresh=refresh)
    # Parse nested VyOS config dict into typed response...
    ntp_config = full_config.get("service", {}).get("ntp", {})
    # ... extract fields ...
    return NTPConfigResponse(...)


@router.post("/batch")
async def ntp_batch_configure(request: Request, body: NTPBatchRequest):
    await require_write_permission(request, FeatureGroup.NTP)
    instance = require_active_instance(request)
    service = get_session_vyos_service(request)
    version = service.get_version()
    instance_id = instance["id"]

    current_config = await run_in_threadpool(service.get_full_config)
    ensure_snapshot_before_change(instance_id, current_config)

    builder = NTPBatchBuilder(version=version)

    for operation in body.operations:
        method_name = operation.op
        if method_name in _INTERNAL_BUILDER_METHODS:
            continue
        method = getattr(builder, method_name, None)
        if method is None:
            raise HTTPException(400, f"Unknown operation: {method_name}")
        sig = inspect.signature(method)
        params = [p for p in sig.parameters if p != "self"]
        if len(params) == 0:
            method()
        elif len(params) == 1 and operation.value is not None:
            method(operation.value)
        elif len(params) == 1 and body.server_address is not None:
            method(body.server_address)

    if builder.is_empty():
        return VyOSResponse(success=True, data={"message": "No operations"})

    result = await run_in_threadpool(service.execute_batch, builder.get_operations())
    return VyOSResponse(success=result.get("success", False), data=result)
