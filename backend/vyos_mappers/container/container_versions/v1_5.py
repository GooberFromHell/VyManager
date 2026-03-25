"""VyOS 1.5 Container mapper - version-specific differences."""
from typing import List


class ContainerMapperV1_5:
    """VyOS 1.5 Container - full feature set including capability, tmpfs, sysctl, log-driver."""

    def has_log_driver(self) -> bool:
        return True

    def has_sysctl(self) -> bool:
        return True

    def has_tmpfs(self) -> bool:
        return True

    def has_network_no_name_server(self) -> bool:
        return True

    def get_container_capability(self, name: str, cap: str) -> List[str]:
        return ["container", "name", name, "capability", cap]

    def get_container_capability_path(self, name: str, cap: str) -> List[str]:
        return ["container", "name", name, "capability", cap]

    def get_container_log_driver(self, name: str, driver: str) -> List[str]:
        return ["container", "name", name, "log-driver", driver]

    def get_container_sysctl(self, name: str, param: str, value: str) -> List[str]:
        return ["container", "name", name, "sysctl", "parameter", param, "value", value]

    def get_container_sysctl_path(self, name: str, param: str) -> List[str]:
        return ["container", "name", name, "sysctl", "parameter", param]

    def get_container_tmpfs_destination(self, name: str, tmpfs_name: str, path: str) -> List[str]:
        return ["container", "name", name, "tmpfs", tmpfs_name, "destination", path]

    def get_container_tmpfs_size(self, name: str, tmpfs_name: str, size: int) -> List[str]:
        return ["container", "name", name, "tmpfs", tmpfs_name, "size", str(size)]

    def get_container_tmpfs_path(self, name: str, tmpfs_name: str) -> List[str]:
        return ["container", "name", name, "tmpfs", tmpfs_name]

    def get_network_no_name_server(self, net_name: str) -> List[str]:
        return ["container", "network", net_name, "no-name-server"]
