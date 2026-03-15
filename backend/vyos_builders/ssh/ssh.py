"""
SSH Service Batch Builder

Provides all SSH batch operations following the standard pattern.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SSHBatchBuilder:
    """Complete batch builder for SSH service operations."""

    def __init__(self, version: str):
        """Initialize SSH batch builder."""
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "ssh"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "SSHBatchBuilder":
        """Add a 'set' operation to the batch."""
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SSHBatchBuilder":
        """Add a 'delete' operation to the batch."""
        if path:
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
    # Basic Settings
    # ========================================================================

    def set_port(self, port: str) -> "SSHBatchBuilder":
        """Set SSH port."""
        path = self.mappers[self.mapper_key].get_port(port)
        return self.add_set(path)

    def delete_port(self) -> "SSHBatchBuilder":
        """Delete SSH port."""
        path = self.mappers[self.mapper_key].get_port_path()
        return self.add_delete(path)

    def set_listen_address(self, address: str) -> "SSHBatchBuilder":
        """Set SSH listen address."""
        path = self.mappers[self.mapper_key].get_listen_address(address)
        return self.add_set(path)

    def delete_listen_address(self, address: str) -> "SSHBatchBuilder":
        """Delete SSH listen address."""
        path = self.mappers[self.mapper_key].get_listen_address_path(address)
        return self.add_delete(path)

    def set_disable_password_authentication(self) -> "SSHBatchBuilder":
        """Enable disable-password-authentication."""
        path = self.mappers[self.mapper_key].get_disable_password_authentication()
        return self.add_set(path)

    def delete_disable_password_authentication(self) -> "SSHBatchBuilder":
        """Disable disable-password-authentication."""
        path = self.mappers[self.mapper_key].get_disable_password_authentication_path()
        return self.add_delete(path)

    def set_disable_host_validation(self) -> "SSHBatchBuilder":
        """Enable disable-host-validation."""
        path = self.mappers[self.mapper_key].get_disable_host_validation()
        return self.add_set(path)

    def delete_disable_host_validation(self) -> "SSHBatchBuilder":
        """Disable disable-host-validation."""
        path = self.mappers[self.mapper_key].get_disable_host_validation_path()
        return self.add_delete(path)

    def set_loglevel(self, level: str) -> "SSHBatchBuilder":
        """Set SSH log level."""
        path = self.mappers[self.mapper_key].get_loglevel(level)
        return self.add_set(path)

    def delete_loglevel(self) -> "SSHBatchBuilder":
        """Delete SSH log level."""
        path = self.mappers[self.mapper_key].get_loglevel_path()
        return self.add_delete(path)

    def set_client_keepalive_interval(self, interval: str) -> "SSHBatchBuilder":
        """Set client keepalive interval."""
        path = self.mappers[self.mapper_key].get_client_keepalive_interval(interval)
        return self.add_set(path)

    def delete_client_keepalive_interval(self) -> "SSHBatchBuilder":
        """Delete client keepalive interval."""
        path = self.mappers[self.mapper_key].get_client_keepalive_interval_path()
        return self.add_delete(path)

    def set_vrf(self, name: str) -> "SSHBatchBuilder":
        """Set VRF."""
        path = self.mappers[self.mapper_key].get_vrf(name)
        return self.add_set(path)

    def delete_vrf(self) -> "SSHBatchBuilder":
        """Delete VRF."""
        path = self.mappers[self.mapper_key].get_vrf_path()
        return self.add_delete(path)

    # ========================================================================
    # Cipher (version-aware via mapper)
    # ========================================================================

    def set_cipher(self, cipher: str) -> "SSHBatchBuilder":
        """Set SSH cipher (version-aware: 'ciphers' on v1.4, 'cipher' on v1.5)."""
        path = self.mappers[self.mapper_key].get_cipher(cipher)
        return self.add_set(path)

    def delete_cipher(self, cipher: str) -> "SSHBatchBuilder":
        """Delete SSH cipher."""
        path = self.mappers[self.mapper_key].get_cipher_path(cipher)
        return self.add_delete(path)

    # ========================================================================
    # Key Exchange
    # ========================================================================

    def set_key_exchange(self, kex: str) -> "SSHBatchBuilder":
        """Set SSH key exchange algorithm."""
        path = self.mappers[self.mapper_key].get_key_exchange(kex)
        return self.add_set(path)

    def delete_key_exchange(self, kex: str) -> "SSHBatchBuilder":
        """Delete SSH key exchange algorithm."""
        path = self.mappers[self.mapper_key].get_key_exchange_path(kex)
        return self.add_delete(path)

    # ========================================================================
    # MAC
    # ========================================================================

    def set_mac(self, mac: str) -> "SSHBatchBuilder":
        """Set SSH MAC algorithm."""
        path = self.mappers[self.mapper_key].get_mac(mac)
        return self.add_set(path)

    def delete_mac(self, mac: str) -> "SSHBatchBuilder":
        """Delete SSH MAC algorithm."""
        path = self.mappers[self.mapper_key].get_mac_path(mac)
        return self.add_delete(path)

    # ========================================================================
    # Access Control
    # ========================================================================

    def set_access_control_allow_user(self, user: str) -> "SSHBatchBuilder":
        """Allow SSH user."""
        path = self.mappers[self.mapper_key].get_access_control_allow_user(user)
        return self.add_set(path)

    def delete_access_control_allow_user(self, user: str) -> "SSHBatchBuilder":
        """Remove allowed SSH user."""
        path = self.mappers[self.mapper_key].get_access_control_allow_user_path(user)
        return self.add_delete(path)

    def set_access_control_deny_user(self, user: str) -> "SSHBatchBuilder":
        """Deny SSH user."""
        path = self.mappers[self.mapper_key].get_access_control_deny_user(user)
        return self.add_set(path)

    def delete_access_control_deny_user(self, user: str) -> "SSHBatchBuilder":
        """Remove denied SSH user."""
        path = self.mappers[self.mapper_key].get_access_control_deny_user_path(user)
        return self.add_delete(path)

    def set_access_control_allow_group(self, group: str) -> "SSHBatchBuilder":
        """Allow SSH group."""
        path = self.mappers[self.mapper_key].get_access_control_allow_group(group)
        return self.add_set(path)

    def delete_access_control_allow_group(self, group: str) -> "SSHBatchBuilder":
        """Remove allowed SSH group."""
        path = self.mappers[self.mapper_key].get_access_control_allow_group_path(group)
        return self.add_delete(path)

    def set_access_control_deny_group(self, group: str) -> "SSHBatchBuilder":
        """Deny SSH group."""
        path = self.mappers[self.mapper_key].get_access_control_deny_group(group)
        return self.add_set(path)

    def delete_access_control_deny_group(self, group: str) -> "SSHBatchBuilder":
        """Remove denied SSH group."""
        path = self.mappers[self.mapper_key].get_access_control_deny_group_path(group)
        return self.add_delete(path)

    # ========================================================================
    # Dynamic Protection
    # ========================================================================

    def set_dynamic_protection(self) -> "SSHBatchBuilder":
        """Enable dynamic protection."""
        path = self.mappers[self.mapper_key].get_dynamic_protection()
        return self.add_set(path)

    def delete_dynamic_protection(self) -> "SSHBatchBuilder":
        """Disable dynamic protection."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_path()
        return self.add_delete(path)

    def set_dynamic_protection_allow_from(self, address: str) -> "SSHBatchBuilder":
        """Add dynamic protection allow-from address."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_allow_from(address)
        return self.add_set(path)

    def delete_dynamic_protection_allow_from(self, address: str) -> "SSHBatchBuilder":
        """Remove dynamic protection allow-from address."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_allow_from_path(address)
        return self.add_delete(path)

    def set_dynamic_protection_block_time(self, seconds: str) -> "SSHBatchBuilder":
        """Set dynamic protection block time."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_block_time(seconds)
        return self.add_set(path)

    def delete_dynamic_protection_block_time(self) -> "SSHBatchBuilder":
        """Delete dynamic protection block time."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_block_time_path()
        return self.add_delete(path)

    def set_dynamic_protection_detect_time(self, seconds: str) -> "SSHBatchBuilder":
        """Set dynamic protection detect time."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_detect_time(seconds)
        return self.add_set(path)

    def delete_dynamic_protection_detect_time(self) -> "SSHBatchBuilder":
        """Delete dynamic protection detect time."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_detect_time_path()
        return self.add_delete(path)

    def set_dynamic_protection_threshold(self, count: str) -> "SSHBatchBuilder":
        """Set dynamic protection threshold."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_threshold(count)
        return self.add_set(path)

    def delete_dynamic_protection_threshold(self) -> "SSHBatchBuilder":
        """Delete dynamic protection threshold."""
        path = self.mappers[self.mapper_key].get_dynamic_protection_threshold_path()
        return self.add_delete(path)

    # ========================================================================
    # v1.5 Only Features
    # ========================================================================

    def set_fido_pin_required(self) -> "SSHBatchBuilder":
        """Enable FIDO pin-required (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_fido_pin_required()
        return self.add_set(path)

    def delete_fido_pin_required(self) -> "SSHBatchBuilder":
        """Disable FIDO pin-required."""
        path = self.mappers[self.mapper_key].get_fido_pin_required_path()
        return self.add_delete(path)

    def set_fido_touch_required(self) -> "SSHBatchBuilder":
        """Enable FIDO touch-required (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_fido_touch_required()
        return self.add_set(path)

    def delete_fido_touch_required(self) -> "SSHBatchBuilder":
        """Disable FIDO touch-required."""
        path = self.mappers[self.mapper_key].get_fido_touch_required_path()
        return self.add_delete(path)

    def set_pubkey_accepted_algorithm(self, name: str) -> "SSHBatchBuilder":
        """Set pubkey-accepted-algorithm (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_pubkey_accepted_algorithm(name)
        return self.add_set(path)

    def delete_pubkey_accepted_algorithm(self, name: str) -> "SSHBatchBuilder":
        """Delete pubkey-accepted-algorithm."""
        path = self.mappers[self.mapper_key].get_pubkey_accepted_algorithm_path(name)
        return self.add_delete(path)

    def set_trusted_user_ca(self, name: str) -> "SSHBatchBuilder":
        """Set trusted-user-ca (v1.5 only)."""
        path = self.mappers[self.mapper_key].get_trusted_user_ca(name)
        return self.add_set(path)

    def delete_trusted_user_ca(self, name: str) -> "SSHBatchBuilder":
        """Delete trusted-user-ca."""
        path = self.mappers[self.mapper_key].get_trusted_user_ca_path(name)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        """Get capabilities for the current VyOS version."""
        is_v15 = "1.5" in self.version or "latest" in self.version
        mapper = self.mappers[self.mapper_key]
        return {
            "version": self.version,
            "cipher_key": mapper.get_cipher_config_key(),
            "has_fido": is_v15,
            "has_pubkey_accepted_algorithm": is_v15,
            "has_trusted_user_ca": is_v15,
            "fields": {
                "port": {"supported": True, "description": "SSH port (default 22)"},
                "listen_addresses": {"supported": True, "description": "Addresses to listen on"},
                "ciphers": {"supported": True, "description": "Allowed ciphers"},
                "key_exchange": {"supported": True, "description": "Allowed key exchange algorithms"},
                "mac": {"supported": True, "description": "Allowed MAC algorithms"},
                "disable_password_authentication": {"supported": True, "description": "Require key-based auth"},
                "disable_host_validation": {"supported": True, "description": "Skip host key validation"},
                "loglevel": {"supported": True, "description": "Logging level"},
                "client_keepalive_interval": {"supported": True, "description": "Keepalive interval"},
                "access_control": {"supported": True, "description": "User/group allow/deny lists"},
                "dynamic_protection": {"supported": True, "description": "Brute-force protection"},
                "vrf": {"supported": True, "description": "VRF to use"},
                "fido": {"supported": is_v15, "description": "FIDO authentication (v1.5+)"},
                "pubkey_accepted_algorithm": {"supported": is_v15, "description": "Accepted pubkey algorithms (v1.5+)"},
                "trusted_user_ca": {"supported": is_v15, "description": "Trusted CA keys (v1.5+)"},
            },
        }
