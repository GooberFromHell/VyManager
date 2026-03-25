"""Prometheus metrics proxy for VyOS devices."""

import logging
import time
from typing import Optional

import httpx
from fastapi import APIRouter, Request, HTTPException, Query

from fastapi_permissions import require_read_permission
from rbac_permissions import FeatureGroup
from middleware.session import require_active_instance

from prometheus_parser import parse_prometheus_text

router = APIRouter(prefix="/vyos/prometheus", tags=["prometheus"])
logger = logging.getLogger(__name__)


def _get_prometheus_url(instance: dict) -> str:
    host = instance["host"]
    port = instance.get("prometheusPort") or 9273
    return f"http://{host}:{port}/metrics"


def _get_prometheus_auth(instance: dict) -> httpx.BasicAuth | None:
    if instance.get("prometheusAuth") and instance.get("prometheusUsername"):
        return httpx.BasicAuth(
            instance["prometheusUsername"],
            instance.get("prometheusPassword") or "",
        )
    return None


@router.get("/status")
async def prometheus_status(request: Request):
    """Check if Prometheus is available on the connected VyOS instance."""
    instance = require_active_instance(request)
    await require_read_permission(request, FeatureGroup.DASHBOARD)

    if not instance.get("prometheusEnabled"):
        return {
            "available": False,
            "reason": "Prometheus not configured for this instance",
        }

    url = _get_prometheus_url(instance)
    auth = _get_prometheus_auth(instance)

    try:
        async with httpx.AsyncClient(timeout=3.0, verify=False) as client:
            resp = await client.get(url, auth=auth)
            return {
                "available": resp.status_code == 200,
                "endpoint": f"{instance['host']}:{instance.get('prometheusPort') or 9273}",
            }
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        return {
            "available": False,
            "reason": f"Cannot reach Prometheus: {exc}",
        }


@router.get("/metrics")
async def prometheus_metrics(
    request: Request,
    families: Optional[str] = Query(None, description="Comma-separated metric families to filter"),
):
    """Fetch and parse Prometheus metrics from the VyOS device."""
    instance = require_active_instance(request)
    await require_read_permission(request, FeatureGroup.DASHBOARD)

    if not instance.get("prometheusEnabled"):
        raise HTTPException(status_code=400, detail="Prometheus not enabled for this instance")

    url = _get_prometheus_url(instance)
    auth = _get_prometheus_auth(instance)

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.get(url, auth=auth)
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Prometheus request timed out")
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Cannot connect to Prometheus endpoint")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"Prometheus returned {exc.response.status_code}")

    parsed = parse_prometheus_text(resp.text)

    if families:
        family_set = {f.strip() for f in families.split(",")}
        parsed = {k: v for k, v in parsed.items() if k in family_set}

    return {"metrics": parsed, "timestamp": time.time()}


@router.get("/capabilities")
async def prometheus_capabilities(request: Request):
    """Return available Prometheus metric families."""
    instance = require_active_instance(request)
    await require_read_permission(request, FeatureGroup.DASHBOARD)

    if not instance.get("prometheusEnabled"):
        return {"available_families": [], "prometheus_enabled": False}

    url = _get_prometheus_url(instance)
    auth = _get_prometheus_auth(instance)

    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            resp = await client.get(url, auth=auth)
            resp.raise_for_status()
    except Exception:
        return {"available_families": [], "prometheus_enabled": True}

    parsed = parse_prometheus_text(resp.text)
    return {
        "available_families": sorted(parsed.keys()),
        "prometheus_enabled": True,
    }
