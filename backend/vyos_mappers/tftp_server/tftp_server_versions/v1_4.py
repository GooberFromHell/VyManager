"""VyOS 1.4 TFTP Server service mapper - version-specific differences."""


class TFTPServerMapperV1_4:
    """VyOS 1.4 TFTP Server - no allow-upload."""

    def has_allow_upload(self) -> bool:
        return False
