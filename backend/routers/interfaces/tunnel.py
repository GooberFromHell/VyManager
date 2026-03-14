"""
Tunnel Interface Configuration Endpoints

All tunnel-specific endpoints for VyOS configuration.
Supports GRE, GRETAP, IPIP, SIT, and ERSPAN encapsulation types.
"""

from fastapi import APIRouter, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any

from session_vyos_service import get_session_vyos_service
from fastapi_permissions import require_read_permission, require_write_permission
from rbac_permissions import FeatureGroup
from routers.config.config import ensure_snapshot_before_change
import logging
logger = logging.getLogger(__name__)

# Router for tunnel interface endpoints
router = APIRouter(prefix="/vyos/tunnel", tags=["tunnel-interface"])


# ============================================================================
# Request Models
# ============================================================================


class InterfaceBatchRequest(BaseModel):
    """Model for batch tunnel interface configuration."""

    interface: str = Field(..., description="Interface name (e.g., tun0)")
    operations: List[Dict[str, str]] = Field(
        ...,
        description="List of tunnel interface operations",
        json_schema_extra={
            "example": [
                {"op": "set_encapsulation", "value": "gre"},
                {"op": "set_source_address", "value": "10.0.0.1"},
                {"op": "set_remote", "value": "10.0.0.2"},
                {"op": "set_description", "value": "GRE tunnel to site B"},
            ]
        }
    )


class VyOSResponse(BaseModel):
    """Standard response from VyOS operations."""

    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None


# ============================================================================
# Capabilities Endpoint
# ============================================================================


@router.get("/capabilities")
async def get_tunnel_capabilities(request: Request) -> Dict[str, Any]:
    """
    Get available tunnel features based on device VyOS version.

    Returns feature flags indicating which operations are supported.
    """
    # Check RBAC permission
    await require_read_permission(request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(request)
        version = service.get_version()

        # Parse version for comparison
        try:
            version_float = float(version)
        except (ValueError, TypeError):
            version_float = 1.4

        capabilities = {
            "version": version,
            "version_number": version_float,

            "features": {
                # Basic interface operations (all versions)
                "basic": {
                    "address": True,
                    "description": True,
                    "mtu": True,
                    "disable": True,
                    "vrf": True,
                },

                # Tunnel-specific (all versions)
                "tunnel": {
                    "encapsulation_types": ["gre", "gretap", "ipip", "sit", "erspan"],
                    "source_address": True,
                    "remote": True,
                    "source_interface": True,
                    "enable_multicast": True,
                },

                # Tunnel parameters: IP (all versions)
                "parameters_ip": {
                    "ttl": True,
                    "tos": True,
                    "key": True,
                },

                # Tunnel parameters: ERSPAN (all versions)
                "parameters_erspan": {
                    "direction": True,
                    "idx": True,
                    "version": True,
                },

                # IP options (all versions)
                "ip": {
                    "adjust_mss": True,
                    "arp_cache_timeout": True,
                    "disable_arp_filter": True,
                    "enable_arp_accept": True,
                    "enable_arp_announce": True,
                    "enable_arp_ignore": True,
                    "enable_proxy_arp": True,
                    "source_validation": True,
                },

                # IPv6 options (all versions)
                "ipv6": {
                    "adjust_mss": True,
                    "disable_forwarding": True,
                    "dup_addr_detect_transmits": True,
                },
            },
        }

        return capabilities

    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Config Endpoint
# ============================================================================


@router.get("/config")
async def get_tunnel_config(http_request: Request) -> Dict[str, Any]:
    """
    Get all tunnel interface configurations from VyOS.

    Returns configuration details including encapsulation, source, remote, etc.
    """
    # Check RBAC permission
    await require_read_permission(http_request, FeatureGroup.INTERFACES)

    from vyos_mappers.interfaces import TunnelInterfaceMapper

    try:
        service = get_session_vyos_service(http_request)
        full_config = await run_in_threadpool(service.get_full_config)
        raw_config = full_config.get("interfaces", {}).get("tunnel", {})

        # Use mapper to parse config
        mapper = TunnelInterfaceMapper(service.get_version())
        parsed_data = mapper.parse_interfaces_of_type(raw_config)

        return parsed_data
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Batch Endpoint
# ============================================================================


@router.post("/batch")
async def configure_tunnel_batch(http_request: Request, request: InterfaceBatchRequest) -> VyOSResponse:
    """
    Configure tunnel interface using batch operations.

    All operations are version-aware and sent to VyOS in a single batch.

    **Supported Operations:**

    | Operation | Value Required | Description |
    |-----------|----------------|-------------|
    | `set_description` | Yes | Set interface description |
    | `delete_description` | No | Remove interface description |
    | `set_address` | Yes | Add IP address (CIDR notation) |
    | `delete_address` | Yes | Remove IP address |
    | `set_mtu` | Yes | Set MTU value |
    | `delete_mtu` | No | Remove MTU (reset to default) |
    | `set_vrf` | Yes | Assign interface to VRF |
    | `delete_vrf` | Yes | Remove interface from VRF |
    | `disable` | No | Administratively disable interface |
    | `enable` | No | Enable interface (remove disable flag) |
    | `delete_interface` | No | Delete entire interface configuration |
    | `set_encapsulation` | Yes | Set encapsulation type (gre, gretap, ipip, sit, erspan) |
    | `set_source_address` | Yes | Set tunnel source address |
    | `delete_source_address` | No | Remove source address |
    | `set_remote` | Yes | Set tunnel remote endpoint |
    | `delete_remote` | No | Remove tunnel remote endpoint |
    | `set_source_interface` | Yes | Set source interface |
    | `delete_source_interface` | No | Remove source interface |
    | `set_enable_multicast` | No | Enable multicast on tunnel |
    | `delete_enable_multicast` | No | Disable multicast on tunnel |
    | `set_parameters_ip_ttl` | Yes | Set tunnel IP TTL |
    | `delete_parameters_ip_ttl` | No | Remove tunnel IP TTL |
    | `set_parameters_ip_tos` | Yes | Set tunnel IP TOS |
    | `delete_parameters_ip_tos` | No | Remove tunnel IP TOS |
    | `set_parameters_ip_key` | Yes | Set tunnel GRE key |
    | `delete_parameters_ip_key` | No | Remove tunnel GRE key |
    | `set_erspan_direction` | Yes | Set ERSPAN direction (ingress/egress) |
    | `set_erspan_idx` | Yes | Set ERSPAN index |
    | `set_erspan_version` | Yes | Set ERSPAN version |
    | `set_ip_adjust_mss` | Yes | Set IPv4 TCP MSS |
    | `set_ip_adjust_mss_clamp_to_pmtu` | No | Enable IPv4 MSS clamping to PMTU |
    | `set_ip_arp_cache_timeout` | Yes | Set ARP cache timeout |
    | `set_ip_disable_arp_filter` | No | Disable ARP filter |
    | `set_ip_enable_arp_accept` | No | Enable ARP accept |
    | `set_ip_enable_arp_announce` | No | Enable ARP announce |
    | `set_ip_enable_arp_ignore` | No | Enable ARP ignore |
    | `set_ip_enable_proxy_arp` | No | Enable proxy ARP |
    | `set_ip_source_validation` | Yes | Set source validation mode |
    | `delete_ip_source_validation` | No | Remove source validation |
    | `set_ipv6_adjust_mss` | Yes | Set IPv6 TCP MSS |
    | `set_ipv6_adjust_mss_clamp_to_pmtu` | No | Enable IPv6 MSS clamping to PMTU |
    | `set_ipv6_disable_forwarding` | No | Disable IPv6 forwarding |
    | `set_ipv6_dup_addr_detect_transmits` | Yes | Set IPv6 DAD transmits |
    """
    # Check RBAC permission
    await require_write_permission(http_request, FeatureGroup.INTERFACES)

    try:
        service = get_session_vyos_service(http_request)
        instance_id = http_request.state.instance["id"]

        # Capture baseline snapshot before changes so the diff banner detects them
        current_config = await run_in_threadpool(service.get_full_config)
        ensure_snapshot_before_change(instance_id, current_config)

        batch = service.create_tunnel_batch()

        # Process each operation
        for operation in request.operations:
            op_type = operation.get("op")
            value = operation.get("value")

            if not op_type:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid operation: {operation}. Must have 'op' key"
                )

            # ---- Common interface operations ----
            if op_type == "set_description":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_description(request.interface, value)
            elif op_type == "delete_description":
                batch.delete_interface_description(request.interface)
            elif op_type == "set_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_address(request.interface, value)
            elif op_type == "delete_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_address(request.interface, value)
            elif op_type == "set_mtu":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_mtu(request.interface, value)
            elif op_type == "delete_mtu":
                batch.delete_interface_mtu(request.interface)
            elif op_type == "set_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_interface_vrf(request.interface, value)
            elif op_type == "delete_vrf":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.delete_interface_vrf(request.interface, value)
            elif op_type == "disable":
                batch.set_interface_disable(request.interface)
            elif op_type == "enable":
                batch.delete_interface_disable(request.interface)
            elif op_type == "delete_interface":
                batch.delete_interface(request.interface)

            # ---- Tunnel-specific operations ----
            elif op_type == "set_encapsulation":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_encapsulation(request.interface, value)
            elif op_type == "set_source_address":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_source_address(request.interface, value)
            elif op_type == "delete_source_address":
                batch.delete_source_address(request.interface)
            elif op_type == "set_remote":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_remote(request.interface, value)
            elif op_type == "delete_remote":
                batch.delete_remote(request.interface)
            elif op_type == "set_source_interface":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_source_interface(request.interface, value)
            elif op_type == "delete_source_interface":
                batch.delete_source_interface(request.interface)
            elif op_type == "set_enable_multicast":
                batch.set_enable_multicast(request.interface)
            elif op_type == "delete_enable_multicast":
                batch.delete_enable_multicast(request.interface)

            # ---- Tunnel parameters: IP ----
            elif op_type == "set_parameters_ip_ttl":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_parameters_ip_ttl(request.interface, value)
            elif op_type == "delete_parameters_ip_ttl":
                batch.delete_parameters_ip_ttl(request.interface)
            elif op_type == "set_parameters_ip_tos":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_parameters_ip_tos(request.interface, value)
            elif op_type == "delete_parameters_ip_tos":
                batch.delete_parameters_ip_tos(request.interface)
            elif op_type == "set_parameters_ip_key":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_parameters_ip_key(request.interface, value)
            elif op_type == "delete_parameters_ip_key":
                batch.delete_parameters_ip_key(request.interface)

            # ---- Tunnel parameters: ERSPAN ----
            elif op_type == "set_erspan_direction":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_erspan_direction(request.interface, value)
            elif op_type == "set_erspan_idx":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_erspan_idx(request.interface, value)
            elif op_type == "set_erspan_version":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_erspan_version(request.interface, value)

            # ---- IP options ----
            elif op_type == "set_ip_adjust_mss":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ip_adjust_mss(request.interface, value)
            elif op_type == "set_ip_adjust_mss_clamp_to_pmtu":
                batch.set_ip_adjust_mss_clamp_to_pmtu(request.interface)
            elif op_type == "set_ip_arp_cache_timeout":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ip_arp_cache_timeout(request.interface, value)
            elif op_type == "set_ip_disable_arp_filter":
                batch.set_ip_disable_arp_filter(request.interface)
            elif op_type == "set_ip_enable_arp_accept":
                batch.set_ip_enable_arp_accept(request.interface)
            elif op_type == "set_ip_enable_arp_announce":
                batch.set_ip_enable_arp_announce(request.interface)
            elif op_type == "set_ip_enable_arp_ignore":
                batch.set_ip_enable_arp_ignore(request.interface)
            elif op_type == "set_ip_enable_proxy_arp":
                batch.set_ip_enable_proxy_arp(request.interface)
            elif op_type == "set_ip_source_validation":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ip_source_validation(request.interface, value)
            elif op_type == "delete_ip_source_validation":
                batch.delete_ip_source_validation(request.interface)

            # ---- IPv6 options ----
            elif op_type == "set_ipv6_adjust_mss":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_adjust_mss(request.interface, value)
            elif op_type == "set_ipv6_adjust_mss_clamp_to_pmtu":
                batch.set_ipv6_adjust_mss_clamp_to_pmtu(request.interface)
            elif op_type == "set_ipv6_disable_forwarding":
                batch.set_ipv6_disable_forwarding(request.interface)
            elif op_type == "set_ipv6_dup_addr_detect_transmits":
                if not value:
                    raise HTTPException(status_code=400, detail=f"{op_type} requires a value")
                batch.set_ipv6_dup_addr_detect_transmits(request.interface, value)

            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported operation: {op_type}"
                )

        # Execute the batch
        response = service.execute_batch(batch)

        # Handle empty string result (convert to None for Pydantic validation)
        result_data = response.result
        if result_data == '' or result_data is None:
            result_data = None
        elif not isinstance(result_data, dict):
            result_data = {"result": result_data}

        return VyOSResponse(
            success=response.status == 200,
            data=result_data,
            error=response.error if response.error else None
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
