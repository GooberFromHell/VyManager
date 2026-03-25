# Canonical Backend Builder Pattern
# Source: backend/vyos_builders/ntp/ntp.py
# Used by DERPO agents as the reference implementation for new feature builders.

from typing import List, Dict, Any
from backend.vyos_mappers import CommandMapperRegistry


class NTPBatchBuilder:
    def __init__(self, version: str = "1.5"):
        self.version = version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ntp"  # Must match the registered feature name
        self._operations: List[Dict[str, Any]] = []

    # --- Internal Methods (blocked from batch API) ---

    def add_set(self, path: List[str]) -> "NTPBatchBuilder":
        if path:  # Empty path = unsupported feature, silently skip
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NTPBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> "NTPBatchBuilder":
        self._operations = []
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    def operation_count(self) -> int:
        return len(self._operations)

    # --- Feature Methods (exposed via batch API) ---
    # Pattern: call mapper getter → delegate to add_set/add_delete → return self

    def set_server(self, address: str) -> "NTPBatchBuilder":
        path = self.mappers[self.mapper_key].get_server(address)
        return self.add_set(path)

    def delete_server(self, address: str) -> "NTPBatchBuilder":
        path = self.mappers[self.mapper_key].get_server_path(address)
        return self.add_delete(path)

    # Paired set/delete for each feature:
    def set_listen_address(self, address: str) -> "NTPBatchBuilder":
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "NTPBatchBuilder":
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    # Version-aware features (path may be empty if unsupported):
    def set_ptp(self) -> "NTPBatchBuilder":
        path = self.mappers[self.mapper_key].get_ptp()
        return self.add_set(path)  # Empty if v1.4 → silently skipped

    def delete_ptp(self) -> "NTPBatchBuilder":
        path = self.mappers[self.mapper_key].get_ptp_path()
        return self.add_delete(path)

    # --- Capabilities ---

    def get_capabilities(self) -> Dict[str, Any]:
        is_v15 = self.version.startswith("1.5") or self.version == "latest"
        return {
            "version": self.version,
            "fields": {
                "server": {"supported": True, "description": "NTP server address"},
                "listen_address": {"supported": True, "description": "Listen address"},
                "allow_client": {"supported": True, "description": "Allowed client network"},
                "vrf": {"supported": True, "description": "VRF instance"},
                "ptp": {"supported": is_v15, "description": "PTP support (v1.5+)"},
            }
        }
