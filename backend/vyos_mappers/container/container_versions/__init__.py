"""Container mapper version-specific implementations."""
from .v1_4 import ContainerMapperV1_4
from .v1_5 import ContainerMapperV1_5


def get_container_mapper(version: str):
    """Factory to get version-specific Container mapper."""
    # Import here to avoid circular import
    from ..container import ContainerMapper
    # ContainerMapper handles version differences internally via delegation
    return ContainerMapper(version)


__all__ = ["ContainerMapperV1_4", "ContainerMapperV1_5", "get_container_mapper"]
