"""Router Advertisement mapper version-specific implementations."""
from .v1_4 import RouterAdvertMapperV1_4
from .v1_5 import RouterAdvertMapperV1_5


def get_router_advert_mapper(version: str):
    """Factory to get version-specific Router Advertisement mapper."""
    from ..router_advert import RouterAdvertMapper
    return RouterAdvertMapper(version)


__all__ = ["RouterAdvertMapperV1_4", "RouterAdvertMapperV1_5", "get_router_advert_mapper"]
