"""SSH mapper version-specific implementations."""
from .v1_4 import SSHMapperV1_4
from .v1_5 import SSHMapperV1_5


def get_ssh_mapper(version: str):
    """Factory to get version-specific SSH mapper."""
    from ..ssh import SSHMapper
    return SSHMapper(version)


__all__ = ["SSHMapperV1_4", "SSHMapperV1_5", "get_ssh_mapper"]
