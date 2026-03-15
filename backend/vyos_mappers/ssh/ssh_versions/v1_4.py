"""VyOS 1.4 SSH Service mapper - version-specific differences."""
from typing import List


class SSHMapperV1_4:
    """Version-specific mapper for VyOS 1.4 SSH commands.

    Key differences in 1.4:
    - Uses 'ciphers' (plural) instead of 'cipher' (singular)
    - No FIDO authentication support
    - No pubkey-accepted-algorithm support
    - No trusted-user-ca support
    """

    def get_cipher(self, cipher: str) -> List[str]:
        """v1.4 uses 'ciphers' (plural)."""
        return ["service", "ssh", "ciphers", cipher]

    def get_cipher_path(self, cipher: str) -> List[str]:
        return ["service", "ssh", "ciphers", cipher]

    def get_cipher_config_key(self) -> str:
        return "ciphers"

    def has_fido(self) -> bool:
        return False

    def has_pubkey_accepted_algorithm(self) -> bool:
        return False

    def has_trusted_user_ca(self) -> bool:
        return False
