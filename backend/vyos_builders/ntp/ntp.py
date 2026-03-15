"""
NTP Service Batch Builder

Provides all NTP batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NTPBatchBuilder:
    """Complete batch builder for NTP service operations."""

    def __init__(self, version: str):
        """Initialize NTP batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get NTP mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ntp"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "NTPBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NTPBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Server Operations
    # ========================================================================

    def set_server(self, address: str) -> "NTPBatchBuilder":
        """Add NTP server."""
        path = self.mappers[self.mapper_key].get_server(address)
        return self.add_set(path)

    def delete_server(self, address: str) -> "NTPBatchBuilder":
        """Remove NTP server (entire node)."""
        path = self.mappers[self.mapper_key].get_server_path(address)
        return self.add_delete(path)

    def set_server_noselect(self, address: str) -> "NTPBatchBuilder":
        """Mark server as noselect."""
        path = self.mappers[self.mapper_key].get_server_noselect(address)
        return self.add_set(path)

    def delete_server_noselect(self, address: str) -> "NTPBatchBuilder":
        """Remove noselect from server."""
        path = self.mappers[self.mapper_key].get_server_noselect_path(address)
        return self.add_delete(path)

    def set_server_nts(self, address: str) -> "NTPBatchBuilder":
        """Enable NTS for server."""
        path = self.mappers[self.mapper_key].get_server_nts(address)
        return self.add_set(path)

    def delete_server_nts(self, address: str) -> "NTPBatchBuilder":
        """Disable NTS for server."""
        path = self.mappers[self.mapper_key].get_server_nts_path(address)
        return self.add_delete(path)

    def set_server_pool(self, address: str) -> "NTPBatchBuilder":
        """Mark server as pool."""
        path = self.mappers[self.mapper_key].get_server_pool(address)
        return self.add_set(path)

    def delete_server_pool(self, address: str) -> "NTPBatchBuilder":
        """Remove pool from server."""
        path = self.mappers[self.mapper_key].get_server_pool_path(address)
        return self.add_delete(path)

    def set_server_prefer(self, address: str) -> "NTPBatchBuilder":
        """Mark server as preferred."""
        path = self.mappers[self.mapper_key].get_server_prefer(address)
        return self.add_set(path)

    def delete_server_prefer(self, address: str) -> "NTPBatchBuilder":
        """Remove prefer from server."""
        path = self.mappers[self.mapper_key].get_server_prefer_path(address)
        return self.add_delete(path)

    def set_server_ptp(self, address: str) -> "NTPBatchBuilder":
        """Enable PTP for server (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_server_ptp(address)
        return self.add_set(path)

    def delete_server_ptp(self, address: str) -> "NTPBatchBuilder":
        """Disable PTP for server (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_server_ptp_path(address)
        return self.add_delete(path)

    def set_server_interleave(self, address: str) -> "NTPBatchBuilder":
        """Enable interleave for server (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_server_interleave(address)
        return self.add_set(path)

    def delete_server_interleave(self, address: str) -> "NTPBatchBuilder":
        """Disable interleave for server (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_server_interleave_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Listen Address Operations
    # ========================================================================

    def set_listen_address(self, address: str) -> "NTPBatchBuilder":
        """Set NTP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "NTPBatchBuilder":
        """Delete NTP listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Allow Client Operations
    # ========================================================================

    def set_allow_client(self, address: str) -> "NTPBatchBuilder":
        """Set allowed client address."""
        path = self.mappers[self.mapper_key].get_allow_client(address)
        return self.add_set(path)

    def delete_allow_client(self, address: str) -> "NTPBatchBuilder":
        """Delete allowed client address."""
        path = self.mappers[self.mapper_key].get_allow_client_path(address)
        return self.add_delete(path)

    # ========================================================================
    # VRF Operations
    # ========================================================================

    def set_vrf(self, name: str) -> "NTPBatchBuilder":
        """Set NTP VRF."""
        path = self.mappers[self.mapper_key].get_vrf(name)
        return self.add_set(path)

    def delete_vrf(self) -> "NTPBatchBuilder":
        """Delete NTP VRF."""
        path = self.mappers[self.mapper_key].get_vrf_path()
        return self.add_delete(path)

    # ========================================================================
    # Leap Second Operations
    # ========================================================================

    def set_leap_second(self, mode: str) -> "NTPBatchBuilder":
        """Set leap second handling mode."""
        path = self.mappers[self.mapper_key].get_leap_second(mode)
        return self.add_set(path)

    def delete_leap_second(self) -> "NTPBatchBuilder":
        """Delete leap second setting."""
        path = self.mappers[self.mapper_key].get_leap_second_path()
        return self.add_delete(path)

    # ========================================================================
    # PTP Operations (v1.5 only)
    # ========================================================================

    def set_ptp(self) -> "NTPBatchBuilder":
        """Enable PTP (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_ptp()
        return self.add_set(path)

    def delete_ptp(self) -> "NTPBatchBuilder":
        """Disable PTP (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_ptp_path()
        return self.add_delete(path)

    def set_ptp_port(self, port: str) -> "NTPBatchBuilder":
        """Set PTP port (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_ptp_port(port)
        return self.add_set(path)

    def delete_ptp_port(self) -> "NTPBatchBuilder":
        """Delete PTP port (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_ptp_port_path()
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "has_ptp": is_v15,
            "has_interleave": is_v15,
            "fields": {
                "servers": {"supported": True, "description": "NTP server addresses"},
                "listen_addresses": {"supported": True, "description": "Addresses to listen on for clients"},
                "allow_clients": {"supported": True, "description": "Networks allowed to query"},
                "vrf": {"supported": True, "description": "VRF to use"},
                "leap_second": {"supported": True, "description": "Leap second handling mode"},
                "server_noselect": {"supported": True, "description": "Mark server as noselect"},
                "server_nts": {"supported": True, "description": "Enable NTS for server"},
                "server_pool": {"supported": True, "description": "Mark server as pool"},
                "server_prefer": {"supported": True, "description": "Mark server as preferred"},
                "server_ptp": {"supported": is_v15, "description": "PTP server option (v1.5+)"},
                "server_interleave": {"supported": is_v15, "description": "Interleave mode (v1.5+)"},
                "ptp": {"supported": is_v15, "description": "PTP support (v1.5+)"},
            },
        }
