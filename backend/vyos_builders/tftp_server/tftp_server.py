"""
TFTP Server Service Batch Builder

Provides all TFTP Server batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class TFTPServerBatchBuilder:
    """Complete batch builder for TFTP Server service operations."""

    def __init__(self, version: str):
        """Initialize TFTP Server batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get TFTP Server mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "tftp_server"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "TFTPServerBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "TFTPServerBatchBuilder":
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
    # Directory Operations
    # ========================================================================

    def set_directory(self, path: str) -> "TFTPServerBatchBuilder":
        """Set TFTP server root directory."""
        cmd_path = self.mappers[self.mapper_key].get_directory(path)
        return self.add_set(cmd_path)

    def delete_directory(self, path: str) -> "TFTPServerBatchBuilder":
        """Delete TFTP server root directory."""
        cmd_path = self.mappers[self.mapper_key].get_directory_path()
        return self.add_delete(cmd_path)

    # ========================================================================
    # Listen Address Operations
    # ========================================================================

    def set_listen_address(self, address: str) -> "TFTPServerBatchBuilder":
        """Set TFTP server listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "TFTPServerBatchBuilder":
        """Delete TFTP server listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    # ========================================================================
    # Port Operations
    # ========================================================================

    def set_port(self, port: str) -> "TFTPServerBatchBuilder":
        """Set TFTP server port."""
        path = self.mappers[self.mapper_key].get_port(port)
        return self.add_set(path)

    def delete_port(self, port: str) -> "TFTPServerBatchBuilder":
        """Delete TFTP server port."""
        path = self.mappers[self.mapper_key].get_port_path()
        return self.add_delete(path)

    # ========================================================================
    # Allow Upload Operations (v1.5 only)
    # ========================================================================

    def set_allow_upload(self) -> "TFTPServerBatchBuilder":
        """Enable allow-upload (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_allow_upload()
        return self.add_set(path)

    def delete_allow_upload(self) -> "TFTPServerBatchBuilder":
        """Disable allow-upload (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_allow_upload_path()
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "has_allow_upload": is_v15,
            "fields": {
                "directory": {"supported": True, "description": "TFTP server root directory"},
                "listen_address": {"supported": True, "description": "Addresses to listen on"},
                "port": {"supported": True, "description": "TFTP server port (default 69)"},
                "allow_upload": {"supported": is_v15, "description": "Allow file uploads (v1.5+)"},
            },
        }
