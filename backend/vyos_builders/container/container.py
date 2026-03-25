"""
Container Service Batch Builder

Provides all container batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any, Optional
from vyos_mappers import CommandMapperRegistry


class ContainerBatchBuilder:
    """Complete batch builder for container service operations."""

    def __init__(self, version: str):
        """Initialize container batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []

        # Get container mapper for this version
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "container"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "ContainerBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ContainerBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:  # Only add if path is not empty (for version-specific commands)
            self._operations.append({"op": "delete", "path": path})
        return self

    def clear(self) -> None:
        """Clear all operations from the batch."""
        self._operations = []

    def get_operations(self) -> List[Dict[str, Any]]:
        """Get the list of operations."""
        return self._operations.copy()

    def operation_count(self) -> int:
        """Get the number of operations in the batch."""
        return len(self._operations)

    def is_empty(self) -> bool:
        """Check if the batch is empty."""
        return len(self._operations) == 0

    # ========================================================================
    # Container Name — Image / Network
    # ========================================================================

    def set_container_image(self, name: str, image: str) -> "ContainerBatchBuilder":
        """Set container image."""
        path = self.mappers[self.mapper_key].get_container_image(name, image)
        return self.add_set(path)

    def set_container_network(self, name: str, network: str) -> "ContainerBatchBuilder":
        """Attach container to a network."""
        path = self.mappers[self.mapper_key].get_container_network(name, network)
        return self.add_set(path)

    def set_container_network_address(
        self, name: str, network: str, address: str
    ) -> "ContainerBatchBuilder":
        """Set static IP address on a container network attachment."""
        path = self.mappers[self.mapper_key].get_container_network_address(
            name, network, address
        )
        return self.add_set(path)

    # ========================================================================
    # Container Name — Port
    # ========================================================================

    def set_container_port(
        self,
        name: str,
        port_name: str,
        source: str,
        destination: str,
        protocol: str = "tcp",
    ) -> "ContainerBatchBuilder":
        """Add port mapping to container."""
        mapper = self.mappers[self.mapper_key]
        self.add_set(mapper.get_container_port_source(name, port_name, source))
        self.add_set(mapper.get_container_port_destination(name, port_name, destination))
        self.add_set(mapper.get_container_port_protocol(name, port_name, protocol))
        return self

    # ========================================================================
    # Container Name — Volume
    # ========================================================================

    def set_container_volume(
        self,
        name: str,
        vol_name: str,
        source: str,
        destination: str,
        mode: str = "rw",
    ) -> "ContainerBatchBuilder":
        """Add volume mount to container."""
        mapper = self.mappers[self.mapper_key]
        self.add_set(mapper.get_container_volume_source(name, vol_name, source))
        self.add_set(mapper.get_container_volume_destination(name, vol_name, destination))
        self.add_set(mapper.get_container_volume_mode(name, vol_name, mode))
        return self

    # ========================================================================
    # Container Name — Environment
    # ========================================================================

    def set_container_environment(
        self, name: str, key: str, value: str
    ) -> "ContainerBatchBuilder":
        """Set environment variable on container."""
        path = self.mappers[self.mapper_key].get_container_environment(name, key, value)
        return self.add_set(path)

    # ========================================================================
    # Container Name — Capability
    # ========================================================================

    def set_container_capability(
        self, name: str, cap: str
    ) -> "ContainerBatchBuilder":
        """Add Linux capability to container (keyword differs by version)."""
        path = self.mappers[self.mapper_key].get_container_capability(name, cap)
        return self.add_set(path)

    # ========================================================================
    # Container Name — Runtime Options
    # ========================================================================

    def set_container_restart(
        self, name: str, policy: str
    ) -> "ContainerBatchBuilder":
        """Set container restart policy."""
        path = self.mappers[self.mapper_key].get_container_restart(name, policy)
        return self.add_set(path)

    def set_container_memory(self, name: str, mb: int) -> "ContainerBatchBuilder":
        """Set container memory limit in megabytes."""
        path = self.mappers[self.mapper_key].get_container_memory(name, mb)
        return self.add_set(path)

    def set_container_cpu_quota(self, name: str, pct: int) -> "ContainerBatchBuilder":
        """Set container CPU quota as a percentage."""
        path = self.mappers[self.mapper_key].get_container_cpu_quota(name, pct)
        return self.add_set(path)

    def set_container_description(
        self, name: str, desc: str
    ) -> "ContainerBatchBuilder":
        """Set container description."""
        path = self.mappers[self.mapper_key].get_container_description(name, desc)
        return self.add_set(path)

    def set_container_host_name(
        self, name: str, hostname: str
    ) -> "ContainerBatchBuilder":
        """Set container hostname."""
        path = self.mappers[self.mapper_key].get_container_host_name(name, hostname)
        return self.add_set(path)

    def set_container_entrypoint(
        self, name: str, ep: str
    ) -> "ContainerBatchBuilder":
        """Set container entrypoint."""
        path = self.mappers[self.mapper_key].get_container_entrypoint(name, ep)
        return self.add_set(path)

    def set_container_command(self, name: str, cmd: str) -> "ContainerBatchBuilder":
        """Set container command."""
        path = self.mappers[self.mapper_key].get_container_command(name, cmd)
        return self.add_set(path)

    def set_container_arguments(
        self, name: str, args: str
    ) -> "ContainerBatchBuilder":
        """Set container command arguments."""
        path = self.mappers[self.mapper_key].get_container_arguments(name, args)
        return self.add_set(path)

    def set_container_uid(self, name: str, uid: int) -> "ContainerBatchBuilder":
        """Set container UID."""
        path = self.mappers[self.mapper_key].get_container_uid(name, uid)
        return self.add_set(path)

    def set_container_gid(self, name: str, gid: int) -> "ContainerBatchBuilder":
        """Set container GID."""
        path = self.mappers[self.mapper_key].get_container_gid(name, gid)
        return self.add_set(path)

    # ========================================================================
    # Container Name — Label
    # ========================================================================

    def set_container_label(
        self, name: str, key: str, value: str
    ) -> "ContainerBatchBuilder":
        """Set a label on a container."""
        path = self.mappers[self.mapper_key].get_container_label(name, key, value)
        return self.add_set(path)

    # ========================================================================
    # Container Name — Device
    # ========================================================================

    def set_container_device(
        self, name: str, dev_name: str, source: str, destination: str
    ) -> "ContainerBatchBuilder":
        """Add device mapping to container."""
        mapper = self.mappers[self.mapper_key]
        self.add_set(mapper.get_container_device_source(name, dev_name, source))
        self.add_set(mapper.get_container_device_destination(name, dev_name, destination))
        return self

    # ========================================================================
    # Container Name — Flags
    # ========================================================================

    def set_container_allow_host_networks(
        self, name: str
    ) -> "ContainerBatchBuilder":
        """Allow container to use host networking."""
        path = self.mappers[self.mapper_key].get_container_allow_host_networks(name)
        return self.add_set(path)

    def set_container_allow_host_pid(self, name: str) -> "ContainerBatchBuilder":
        """Allow container to share host PID namespace."""
        path = self.mappers[self.mapper_key].get_container_allow_host_pid(name)
        return self.add_set(path)

    def set_container_disable(self, name: str) -> "ContainerBatchBuilder":
        """Disable a container."""
        path = self.mappers[self.mapper_key].get_container_disable(name)
        return self.add_set(path)

    def set_container_name_server(
        self, name: str, addr: str
    ) -> "ContainerBatchBuilder":
        """Set DNS name server for container."""
        path = self.mappers[self.mapper_key].get_container_name_server(name, addr)
        return self.add_set(path)

    # ========================================================================
    # Container Name — v1.5-only
    # ========================================================================

    def set_container_log_driver(
        self, name: str, driver: str
    ) -> "ContainerBatchBuilder":
        """Set container log driver (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_container_log_driver(name, driver)
        return self.add_set(path)

    def set_container_sysctl(
        self, name: str, param: str, value: str
    ) -> "ContainerBatchBuilder":
        """Set sysctl parameter on container (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_container_sysctl(name, param, value)
        return self.add_set(path)

    def set_container_tmpfs(
        self,
        name: str,
        tmpfs_name: str,
        destination: str,
        size: Optional[int] = None,
    ) -> "ContainerBatchBuilder":
        """Add tmpfs mount to container (v1.5 only)."""
        mapper = self.mappers[self.mapper_key]
        self.add_set(mapper.get_container_tmpfs_destination(name, tmpfs_name, destination))
        if size is not None:
            self.add_set(mapper.get_container_tmpfs_size(name, tmpfs_name, size))
        return self

    # ========================================================================
    # Container Name — Delete Methods
    # ========================================================================

    def delete_container(self, name: str) -> "ContainerBatchBuilder":
        """Delete entire container."""
        path = self.mappers[self.mapper_key].get_container_path(name)
        return self.add_delete(path)

    def delete_container_port(
        self, name: str, port_name: str
    ) -> "ContainerBatchBuilder":
        """Delete a port mapping from container."""
        path = self.mappers[self.mapper_key].get_container_port_path(name, port_name)
        return self.add_delete(path)

    def delete_container_volume(
        self, name: str, vol_name: str
    ) -> "ContainerBatchBuilder":
        """Delete a volume mount from container."""
        path = self.mappers[self.mapper_key].get_container_volume_path(name, vol_name)
        return self.add_delete(path)

    def delete_container_environment(
        self, name: str, key: str
    ) -> "ContainerBatchBuilder":
        """Delete an environment variable from container."""
        path = self.mappers[self.mapper_key].get_container_environment_path(name, key)
        return self.add_delete(path)

    def delete_container_capability(
        self, name: str, cap: str
    ) -> "ContainerBatchBuilder":
        """Delete a capability from container."""
        path = self.mappers[self.mapper_key].get_container_capability_path(name, cap)
        return self.add_delete(path)

    def delete_container_label(
        self, name: str, key: str
    ) -> "ContainerBatchBuilder":
        """Delete a label from container."""
        path = self.mappers[self.mapper_key].get_container_label_path(name, key)
        return self.add_delete(path)

    def delete_container_device(
        self, name: str, dev_name: str
    ) -> "ContainerBatchBuilder":
        """Delete a device mapping from container."""
        path = self.mappers[self.mapper_key].get_container_device_path(name, dev_name)
        return self.add_delete(path)

    def delete_container_network_ref(
        self, name: str, network: str
    ) -> "ContainerBatchBuilder":
        """Remove a network attachment from container."""
        path = self.mappers[self.mapper_key].get_container_network_ref_path(
            name, network
        )
        return self.add_delete(path)

    def delete_container_name_server(
        self, name: str, addr: str
    ) -> "ContainerBatchBuilder":
        """Delete a DNS name server from container."""
        path = self.mappers[self.mapper_key].get_container_name_server_path(name, addr)
        return self.add_delete(path)

    def delete_container_sysctl(
        self, name: str, param: str
    ) -> "ContainerBatchBuilder":
        """Delete a sysctl parameter from container (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_container_sysctl_path(name, param)
        return self.add_delete(path)

    def delete_container_tmpfs(
        self, name: str, tmpfs_name: str
    ) -> "ContainerBatchBuilder":
        """Delete a tmpfs mount from container (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_container_tmpfs_path(name, tmpfs_name)
        return self.add_delete(path)

    # ========================================================================
    # Container Network — Set Methods
    # ========================================================================

    def set_network_prefix(
        self, net_name: str, prefix: str
    ) -> "ContainerBatchBuilder":
        """Set subnet prefix on a container network."""
        path = self.mappers[self.mapper_key].get_network_prefix(net_name, prefix)
        return self.add_set(path)

    def set_network_description(
        self, net_name: str, desc: str
    ) -> "ContainerBatchBuilder":
        """Set description on a container network."""
        path = self.mappers[self.mapper_key].get_network_description(net_name, desc)
        return self.add_set(path)

    def set_network_mtu(self, net_name: str, mtu: int) -> "ContainerBatchBuilder":
        """Set MTU on a container network."""
        path = self.mappers[self.mapper_key].get_network_mtu(net_name, mtu)
        return self.add_set(path)

    def set_network_vrf(self, net_name: str, vrf: str) -> "ContainerBatchBuilder":
        """Bind a container network to a VRF."""
        path = self.mappers[self.mapper_key].get_network_vrf(net_name, vrf)
        return self.add_set(path)

    def set_network_no_name_server(
        self, net_name: str
    ) -> "ContainerBatchBuilder":
        """Disable DNS for a container network (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_network_no_name_server(net_name)
        return self.add_set(path)

    # ========================================================================
    # Container Network — Delete Methods
    # ========================================================================

    def delete_network(self, net_name: str) -> "ContainerBatchBuilder":
        """Delete an entire container network."""
        path = self.mappers[self.mapper_key].get_network_path(net_name)
        return self.add_delete(path)

    def delete_network_prefix(
        self, net_name: str, prefix: str
    ) -> "ContainerBatchBuilder":
        """Delete a prefix from a container network."""
        path = self.mappers[self.mapper_key].get_network_prefix_path(net_name, prefix)
        return self.add_delete(path)

    # ========================================================================
    # Container Registry — Set Methods
    # ========================================================================

    def set_registry_auth(
        self, url: str, username: str, password: str
    ) -> "ContainerBatchBuilder":
        """Set authentication credentials for a container registry."""
        mapper = self.mappers[self.mapper_key]
        self.add_set(mapper.get_registry_auth_username(url, username))
        self.add_set(mapper.get_registry_auth_password(url, password))
        return self

    def set_registry_disable(self, url: str) -> "ContainerBatchBuilder":
        """Disable a container registry."""
        path = self.mappers[self.mapper_key].get_registry_disable(url)
        return self.add_set(path)

    def set_registry_insecure(self, url: str) -> "ContainerBatchBuilder":
        """Mark a container registry as insecure (HTTP)."""
        path = self.mappers[self.mapper_key].get_registry_insecure(url)
        return self.add_set(path)

    # ========================================================================
    # Container Registry — Delete Methods
    # ========================================================================

    def delete_registry(self, url: str) -> "ContainerBatchBuilder":
        """Delete an entire container registry entry."""
        path = self.mappers[self.mapper_key].get_registry_path(url)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version or "latest" in self.version

        return {
            "version": self.version,
            "has_log_driver": is_v15,
            "has_sysctl": is_v15,
            "has_tmpfs": is_v15,
            "has_network_no_name_server": is_v15,
            "capability_keyword": "capability" if is_v15 else "cap-add",
            "fields": {
                "container": {"supported": True, "description": "Container management"},
                "network": {"supported": True, "description": "Container networks"},
                "registry": {"supported": True, "description": "Container registries"},
                "log_driver": {
                    "supported": is_v15,
                    "description": "Container log driver (k8s-file, journald, none)",
                },
                "sysctl": {
                    "supported": is_v15,
                    "description": "Sysctl parameters",
                },
                "tmpfs": {
                    "supported": is_v15,
                    "description": "Temporary filesystem mounts",
                },
                "network_no_name_server": {
                    "supported": is_v15,
                    "description": "Disable DNS for network",
                },
            },
        }
