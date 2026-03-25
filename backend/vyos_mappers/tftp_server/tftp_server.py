"""TFTP Server service mapper for all VyOS versions.

Handles command path generation for TFTP Server service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .tftp_server_versions import TFTPServerMapperV1_4, TFTPServerMapperV1_5


class TFTPServerMapper(BaseFeatureMapper):
    """Base mapper for TFTP Server service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = TFTPServerMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = TFTPServerMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = TFTPServerMapperV1_5()

    # ==================== Directory Commands ====================

    def get_directory(self, path: str) -> List[str]:
        """set service tftp-server directory <path>"""
        return ["service", "tftp-server", "directory", path]

    def get_directory_path(self) -> List[str]:
        return ["service", "tftp-server", "directory"]

    # ==================== Listen Address Commands ====================

    def get_listen_address(self, address: str) -> List[str]:
        """set service tftp-server listen-address <address>"""
        return ["service", "tftp-server", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "tftp-server", "listen-address", address]

    # ==================== Port Commands ====================

    def get_port(self, port: str) -> List[str]:
        """set service tftp-server port <port>"""
        return ["service", "tftp-server", "port", port]

    def get_port_path(self) -> List[str]:
        return ["service", "tftp-server", "port"]

    # ==================== Allow Upload (v1.5 only - delegate) ====================

    def has_allow_upload(self) -> bool:
        return self.version_mapper.has_allow_upload()

    def get_allow_upload(self) -> List[str]:
        """set service tftp-server allow-upload (v1.5 only)"""
        if hasattr(self.version_mapper, 'get_allow_upload'):
            return self.version_mapper.get_allow_upload()
        return []

    def get_allow_upload_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_allow_upload_path'):
            return self.version_mapper.get_allow_upload_path()
        return []
