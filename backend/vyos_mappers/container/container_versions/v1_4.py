"""VyOS 1.4 Container mapper - version-specific differences."""
from typing import List


class ContainerMapperV1_4:
    """VyOS 1.4 Container - uses cap-add instead of capability, no tmpfs/sysctl/log-driver."""

    def has_log_driver(self) -> bool:
        return False

    def has_sysctl(self) -> bool:
        return False

    def has_tmpfs(self) -> bool:
        return False

    def has_network_no_name_server(self) -> bool:
        return False

    def get_container_capability(self, name: str, cap: str) -> List[str]:
        return ["container", "name", name, "cap-add", cap]

    def get_container_capability_path(self, name: str, cap: str) -> List[str]:
        return ["container", "name", name, "cap-add", cap]
