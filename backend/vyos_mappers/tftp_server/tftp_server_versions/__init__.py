"""TFTP Server mapper version-specific implementations."""
from .v1_4 import TFTPServerMapperV1_4
from .v1_5 import TFTPServerMapperV1_5


def get_tftp_server_mapper(version: str):
    """Factory to get version-specific TFTP Server mapper."""
    # Import here to avoid circular import
    from ..tftp_server import TFTPServerMapper
    # TFTPServerMapper handles version differences internally via delegation
    return TFTPServerMapper(version)


__all__ = ["TFTPServerMapperV1_4", "TFTPServerMapperV1_5", "get_tftp_server_mapper"]
