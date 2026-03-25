"""Container service mapper for all VyOS versions.

Handles command path generation for container configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .container_versions import ContainerMapperV1_4, ContainerMapperV1_5


class ContainerMapper(BaseFeatureMapper):
    """Base mapper for container configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        # Load version-specific mapper
        if version.startswith("1.4"):
            self.version_mapper = ContainerMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = ContainerMapperV1_5()
        else:
            # Default to 1.5 for unknown versions
            self.version_mapper = ContainerMapperV1_5()

    # ==================== Capability flags (delegate) ====================

    def has_log_driver(self) -> bool:
        return self.version_mapper.has_log_driver()

    def has_sysctl(self) -> bool:
        return self.version_mapper.has_sysctl()

    def has_tmpfs(self) -> bool:
        return self.version_mapper.has_tmpfs()

    def has_network_no_name_server(self) -> bool:
        return self.version_mapper.has_network_no_name_server()

    # ==================== Container Name - Image / Network ====================

    def get_container_image(self, name: str, image: str) -> List[str]:
        """set container name <name> image <image>"""
        return ["container", "name", name, "image", image]

    def get_container_network(self, name: str, network: str) -> List[str]:
        """set container name <name> network <network>"""
        return ["container", "name", name, "network", network]

    def get_container_network_address(self, name: str, network: str, address: str) -> List[str]:
        """set container name <name> network <network> address <address>"""
        return ["container", "name", name, "network", network, "address", address]

    # ==================== Container Name - Port ====================

    def get_container_port_source(self, name: str, port_name: str, port: int) -> List[str]:
        """set container name <name> port <port_name> source <port>"""
        return ["container", "name", name, "port", port_name, "source", str(port)]

    def get_container_port_destination(self, name: str, port_name: str, port: int) -> List[str]:
        """set container name <name> port <port_name> destination <port>"""
        return ["container", "name", name, "port", port_name, "destination", str(port)]

    def get_container_port_protocol(self, name: str, port_name: str, protocol: str) -> List[str]:
        """set container name <name> port <port_name> protocol <protocol>"""
        return ["container", "name", name, "port", port_name, "protocol", protocol]

    # ==================== Container Name - Volume ====================

    def get_container_volume_source(self, name: str, vol_name: str, path: str) -> List[str]:
        """set container name <name> volume <vol_name> source <path>"""
        return ["container", "name", name, "volume", vol_name, "source", path]

    def get_container_volume_destination(self, name: str, vol_name: str, path: str) -> List[str]:
        """set container name <name> volume <vol_name> destination <path>"""
        return ["container", "name", name, "volume", vol_name, "destination", path]

    def get_container_volume_mode(self, name: str, vol_name: str, mode: str) -> List[str]:
        """set container name <name> volume <vol_name> mode <mode>"""
        return ["container", "name", name, "volume", vol_name, "mode", mode]

    # ==================== Container Name - Environment ====================

    def get_container_environment(self, name: str, key: str, value: str) -> List[str]:
        """set container name <name> environment <key> value <value>"""
        return ["container", "name", name, "environment", key, "value", value]

    # ==================== Container Name - Runtime Options ====================

    def get_container_restart(self, name: str, policy: str) -> List[str]:
        """set container name <name> restart <policy>"""
        return ["container", "name", name, "restart", policy]

    def get_container_memory(self, name: str, mb: int) -> List[str]:
        """set container name <name> memory <mb>"""
        return ["container", "name", name, "memory", str(mb)]

    def get_container_cpu_quota(self, name: str, pct: int) -> List[str]:
        """set container name <name> cpu-quota <pct>"""
        return ["container", "name", name, "cpu-quota", str(pct)]

    def get_container_description(self, name: str, desc: str) -> List[str]:
        """set container name <name> description <desc>"""
        return ["container", "name", name, "description", desc]

    def get_container_host_name(self, name: str, hostname: str) -> List[str]:
        """set container name <name> host-name <hostname>"""
        return ["container", "name", name, "host-name", hostname]

    def get_container_entrypoint(self, name: str, ep: str) -> List[str]:
        """set container name <name> entrypoint <ep>"""
        return ["container", "name", name, "entrypoint", ep]

    def get_container_command(self, name: str, cmd: str) -> List[str]:
        """set container name <name> command <cmd>"""
        return ["container", "name", name, "command", cmd]

    def get_container_arguments(self, name: str, args: str) -> List[str]:
        """set container name <name> arguments <args>"""
        return ["container", "name", name, "arguments", args]

    def get_container_uid(self, name: str, uid: int) -> List[str]:
        """set container name <name> uid <uid>"""
        return ["container", "name", name, "uid", str(uid)]

    def get_container_gid(self, name: str, gid: int) -> List[str]:
        """set container name <name> gid <gid>"""
        return ["container", "name", name, "gid", str(gid)]

    # ==================== Container Name - Label ====================

    def get_container_label(self, name: str, key: str, value: str) -> List[str]:
        """set container name <name> label <key> value <value>"""
        return ["container", "name", name, "label", key, "value", value]

    # ==================== Container Name - Device ====================

    def get_container_device_source(self, name: str, dev_name: str, path: str) -> List[str]:
        """set container name <name> device <dev_name> source <path>"""
        return ["container", "name", name, "device", dev_name, "source", path]

    def get_container_device_destination(self, name: str, dev_name: str, path: str) -> List[str]:
        """set container name <name> device <dev_name> destination <path>"""
        return ["container", "name", name, "device", dev_name, "destination", path]

    # ==================== Container Name - Flags ====================

    def get_container_allow_host_networks(self, name: str) -> List[str]:
        """set container name <name> allow-host-networks"""
        return ["container", "name", name, "allow-host-networks"]

    def get_container_allow_host_pid(self, name: str) -> List[str]:
        """set container name <name> allow-host-pid"""
        return ["container", "name", name, "allow-host-pid"]

    def get_container_disable(self, name: str) -> List[str]:
        """set container name <name> disable"""
        return ["container", "name", name, "disable"]

    def get_container_name_server(self, name: str, addr: str) -> List[str]:
        """set container name <name> name-server <addr>"""
        return ["container", "name", name, "name-server", addr]

    # ==================== Container Name - Capability (version-dependent, delegate) ====================

    def get_container_capability(self, name: str, cap: str) -> List[str]:
        """set container name <name> capability <cap> (v1.5) or cap-add <cap> (v1.4)"""
        return self.version_mapper.get_container_capability(name, cap)

    def get_container_capability_path(self, name: str, cap: str) -> List[str]:
        return self.version_mapper.get_container_capability_path(name, cap)

    # ==================== Container Name - v1.5-only (delegate) ====================

    def get_container_log_driver(self, name: str, driver: str) -> List[str]:
        """set container name <name> log-driver <driver> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_container_log_driver"):
            return self.version_mapper.get_container_log_driver(name, driver)
        return []

    def get_container_sysctl(self, name: str, param: str, value: str) -> List[str]:
        """set container name <name> sysctl parameter <param> value <value> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_container_sysctl"):
            return self.version_mapper.get_container_sysctl(name, param, value)
        return []

    def get_container_sysctl_path(self, name: str, param: str) -> List[str]:
        if hasattr(self.version_mapper, "get_container_sysctl_path"):
            return self.version_mapper.get_container_sysctl_path(name, param)
        return []

    def get_container_tmpfs_destination(self, name: str, tmpfs_name: str, path: str) -> List[str]:
        """set container name <name> tmpfs <tmpfs_name> destination <path> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_container_tmpfs_destination"):
            return self.version_mapper.get_container_tmpfs_destination(name, tmpfs_name, path)
        return []

    def get_container_tmpfs_size(self, name: str, tmpfs_name: str, size: int) -> List[str]:
        """set container name <name> tmpfs <tmpfs_name> size <size> (v1.5 only)"""
        if hasattr(self.version_mapper, "get_container_tmpfs_size"):
            return self.version_mapper.get_container_tmpfs_size(name, tmpfs_name, size)
        return []

    def get_container_tmpfs_path(self, name: str, tmpfs_name: str) -> List[str]:
        if hasattr(self.version_mapper, "get_container_tmpfs_path"):
            return self.version_mapper.get_container_tmpfs_path(name, tmpfs_name)
        return []

    # ==================== Container Name - Delete / Path Methods ====================

    def get_container_path(self, name: str) -> List[str]:
        return ["container", "name", name]

    def get_container_port_path(self, name: str, port_name: str) -> List[str]:
        return ["container", "name", name, "port", port_name]

    def get_container_volume_path(self, name: str, vol_name: str) -> List[str]:
        return ["container", "name", name, "volume", vol_name]

    def get_container_environment_path(self, name: str, key: str) -> List[str]:
        return ["container", "name", name, "environment", key]

    def get_container_label_path(self, name: str, key: str) -> List[str]:
        return ["container", "name", name, "label", key]

    def get_container_device_path(self, name: str, dev_name: str) -> List[str]:
        return ["container", "name", name, "device", dev_name]

    def get_container_network_ref_path(self, name: str, network: str) -> List[str]:
        return ["container", "name", name, "network", network]

    def get_container_name_server_path(self, name: str, addr: str) -> List[str]:
        return ["container", "name", name, "name-server", addr]

    # ==================== Container Network ====================

    def get_network_prefix(self, net_name: str, prefix: str) -> List[str]:
        """set container network <net_name> prefix <prefix>"""
        return ["container", "network", net_name, "prefix", prefix]

    def get_network_description(self, net_name: str, desc: str) -> List[str]:
        """set container network <net_name> description <desc>"""
        return ["container", "network", net_name, "description", desc]

    def get_network_mtu(self, net_name: str, mtu: int) -> List[str]:
        """set container network <net_name> mtu <mtu>"""
        return ["container", "network", net_name, "mtu", str(mtu)]

    def get_network_vrf(self, net_name: str, vrf: str) -> List[str]:
        """set container network <net_name> vrf <vrf>"""
        return ["container", "network", net_name, "vrf", vrf]

    def get_network_path(self, net_name: str) -> List[str]:
        return ["container", "network", net_name]

    def get_network_prefix_path(self, net_name: str, prefix: str) -> List[str]:
        return ["container", "network", net_name, "prefix", prefix]

    def get_network_no_name_server(self, net_name: str) -> List[str]:
        """set container network <net_name> no-name-server (v1.5 only)"""
        if hasattr(self.version_mapper, "get_network_no_name_server"):
            return self.version_mapper.get_network_no_name_server(net_name)
        return []

    # ==================== Container Registry ====================

    def get_registry_auth_username(self, url: str, username: str) -> List[str]:
        """set container registry <url> authentication username <username>"""
        return ["container", "registry", url, "authentication", "username", username]

    def get_registry_auth_password(self, url: str, password: str) -> List[str]:
        """set container registry <url> authentication password <password>"""
        return ["container", "registry", url, "authentication", "password", password]

    def get_registry_disable(self, url: str) -> List[str]:
        """set container registry <url> disable"""
        return ["container", "registry", url, "disable"]

    def get_registry_insecure(self, url: str) -> List[str]:
        """set container registry <url> insecure"""
        return ["container", "registry", url, "insecure"]

    def get_registry_path(self, url: str) -> List[str]:
        return ["container", "registry", url]
