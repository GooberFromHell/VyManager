"""VyOS 1.5 TFTP Server service mapper - version-specific differences."""
from typing import List


class TFTPServerMapperV1_5:
    """VyOS 1.5 TFTP Server - adds allow-upload."""

    def has_allow_upload(self) -> bool:
        return True

    def get_allow_upload(self) -> List[str]:
        return ["service", "tftp-server", "allow-upload"]

    def get_allow_upload_path(self) -> List[str]:
        return ["service", "tftp-server", "allow-upload"]
