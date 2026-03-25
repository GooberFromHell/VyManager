"""VyOS 1.5 SSH Service mapper - version-specific differences."""
from typing import List


class SSHMapperV1_5:
    """Version-specific mapper for VyOS 1.5 SSH commands.

    Key differences in 1.5:
    - Uses 'cipher' (singular) instead of 'ciphers' (plural)
    - Adds FIDO authentication (pin-required, touch-required)
    - Adds pubkey-accepted-algorithm
    - Adds trusted-user-ca
    """

    def get_cipher(self, cipher: str) -> List[str]:
        """v1.5 uses 'cipher' (singular)."""
        return ["service", "ssh", "cipher", cipher]

    def get_cipher_path(self, cipher: str) -> List[str]:
        return ["service", "ssh", "cipher", cipher]

    def get_cipher_config_key(self) -> str:
        return "cipher"

    def has_fido(self) -> bool:
        return True

    def has_pubkey_accepted_algorithm(self) -> bool:
        return True

    def has_trusted_user_ca(self) -> bool:
        return True

    def get_fido_pin_required(self) -> List[str]:
        return ["service", "ssh", "fido", "pin-required"]

    def get_fido_pin_required_path(self) -> List[str]:
        return ["service", "ssh", "fido", "pin-required"]

    def get_fido_touch_required(self) -> List[str]:
        return ["service", "ssh", "fido", "touch-required"]

    def get_fido_touch_required_path(self) -> List[str]:
        return ["service", "ssh", "fido", "touch-required"]

    def get_pubkey_accepted_algorithm(self, name: str) -> List[str]:
        return ["service", "ssh", "pubkey-accepted-algorithm", name]

    def get_pubkey_accepted_algorithm_path(self, name: str) -> List[str]:
        return ["service", "ssh", "pubkey-accepted-algorithm", name]

    def get_trusted_user_ca(self, name: str) -> List[str]:
        return ["service", "ssh", "trusted-user-ca", name]

    def get_trusted_user_ca_path(self, name: str) -> List[str]:
        return ["service", "ssh", "trusted-user-ca", name]
