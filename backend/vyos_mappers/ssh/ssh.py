"""SSH Service mapper for all VyOS versions.

Handles command path generation for SSH service configuration.
Integrates version-specific mappers for differences between VyOS 1.4 and 1.5.
"""
from typing import List
from ..base import BaseFeatureMapper
from .ssh_versions import SSHMapperV1_4, SSHMapperV1_5


class SSHMapper(BaseFeatureMapper):
    """Base mapper for SSH service configuration commands."""

    def __init__(self, version: str):
        super().__init__(version)
        if version.startswith("1.4"):
            self.version_mapper = SSHMapperV1_4()
        elif version.startswith("1.5") or version == "latest":
            self.version_mapper = SSHMapperV1_5()
        else:
            self.version_mapper = SSHMapperV1_5()

    # ==================== Basic Settings ====================

    def get_port(self, port: str) -> List[str]:
        return ["service", "ssh", "port", port]

    def get_port_path(self) -> List[str]:
        return ["service", "ssh", "port"]

    def get_listen_address(self, address: str) -> List[str]:
        return ["service", "ssh", "listen-address", address]

    def get_listen_address_path(self, address: str) -> List[str]:
        return ["service", "ssh", "listen-address", address]

    def get_disable_password_authentication(self) -> List[str]:
        return ["service", "ssh", "disable-password-authentication"]

    def get_disable_password_authentication_path(self) -> List[str]:
        return ["service", "ssh", "disable-password-authentication"]

    def get_disable_host_validation(self) -> List[str]:
        return ["service", "ssh", "disable-host-validation"]

    def get_disable_host_validation_path(self) -> List[str]:
        return ["service", "ssh", "disable-host-validation"]

    def get_loglevel(self, level: str) -> List[str]:
        return ["service", "ssh", "loglevel", level]

    def get_loglevel_path(self) -> List[str]:
        return ["service", "ssh", "loglevel"]

    def get_client_keepalive_interval(self, interval: str) -> List[str]:
        return ["service", "ssh", "client-keepalive-interval", interval]

    def get_client_keepalive_interval_path(self) -> List[str]:
        return ["service", "ssh", "client-keepalive-interval"]

    def get_vrf(self, name: str) -> List[str]:
        return ["service", "ssh", "vrf", name]

    def get_vrf_path(self) -> List[str]:
        return ["service", "ssh", "vrf"]

    # ==================== Cipher (version-aware, delegate) ====================

    def get_cipher(self, cipher: str) -> List[str]:
        """Version-aware: v1.4='ciphers', v1.5='cipher'"""
        return self.version_mapper.get_cipher(cipher)

    def get_cipher_path(self, cipher: str) -> List[str]:
        return self.version_mapper.get_cipher_path(cipher)

    def get_cipher_config_key(self) -> str:
        """Returns 'ciphers' for v1.4, 'cipher' for v1.5. Used by config parser."""
        return self.version_mapper.get_cipher_config_key()

    # ==================== Key Exchange ====================

    def get_key_exchange(self, kex: str) -> List[str]:
        return ["service", "ssh", "key-exchange", kex]

    def get_key_exchange_path(self, kex: str) -> List[str]:
        return ["service", "ssh", "key-exchange", kex]

    # ==================== MAC ====================

    def get_mac(self, mac: str) -> List[str]:
        return ["service", "ssh", "mac", mac]

    def get_mac_path(self, mac: str) -> List[str]:
        return ["service", "ssh", "mac", mac]

    # ==================== Access Control ====================

    def get_access_control_allow_user(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "user", user]

    def get_access_control_allow_user_path(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "user", user]

    def get_access_control_deny_user(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "user", user]

    def get_access_control_deny_user_path(self, user: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "user", user]

    def get_access_control_allow_group(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "group", group]

    def get_access_control_allow_group_path(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "allow", "group", group]

    def get_access_control_deny_group(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "group", group]

    def get_access_control_deny_group_path(self, group: str) -> List[str]:
        return ["service", "ssh", "access-control", "deny", "group", group]

    # ==================== Dynamic Protection ====================

    def get_dynamic_protection(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection"]

    def get_dynamic_protection_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection"]

    def get_dynamic_protection_allow_from(self, address: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "allow-from", address]

    def get_dynamic_protection_allow_from_path(self, address: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "allow-from", address]

    def get_dynamic_protection_block_time(self, seconds: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "block-time", seconds]

    def get_dynamic_protection_block_time_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "block-time"]

    def get_dynamic_protection_detect_time(self, seconds: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "detect-time", seconds]

    def get_dynamic_protection_detect_time_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "detect-time"]

    def get_dynamic_protection_threshold(self, count: str) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "threshold", count]

    def get_dynamic_protection_threshold_path(self) -> List[str]:
        return ["service", "ssh", "dynamic-protection", "threshold"]

    # ==================== v1.5 Features (delegate) ====================

    def has_fido(self) -> bool:
        return self.version_mapper.has_fido()

    def has_pubkey_accepted_algorithm(self) -> bool:
        return self.version_mapper.has_pubkey_accepted_algorithm()

    def has_trusted_user_ca(self) -> bool:
        return self.version_mapper.has_trusted_user_ca()

    def get_fido_pin_required(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_pin_required'):
            return self.version_mapper.get_fido_pin_required()
        return []

    def get_fido_pin_required_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_pin_required_path'):
            return self.version_mapper.get_fido_pin_required_path()
        return []

    def get_fido_touch_required(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_touch_required'):
            return self.version_mapper.get_fido_touch_required()
        return []

    def get_fido_touch_required_path(self) -> List[str]:
        if hasattr(self.version_mapper, 'get_fido_touch_required_path'):
            return self.version_mapper.get_fido_touch_required_path()
        return []

    def get_pubkey_accepted_algorithm(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_pubkey_accepted_algorithm'):
            return self.version_mapper.get_pubkey_accepted_algorithm(name)
        return []

    def get_pubkey_accepted_algorithm_path(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_pubkey_accepted_algorithm_path'):
            return self.version_mapper.get_pubkey_accepted_algorithm_path(name)
        return []

    def get_trusted_user_ca(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_trusted_user_ca'):
            return self.version_mapper.get_trusted_user_ca(name)
        return []

    def get_trusted_user_ca_path(self, name: str) -> List[str]:
        if hasattr(self.version_mapper, 'get_trusted_user_ca_path'):
            return self.version_mapper.get_trusted_user_ca_path(name)
        return []
