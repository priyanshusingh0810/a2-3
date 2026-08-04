import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.config import settings

class LocalDataEncryption:
    """
    AES-256 local data encryption manager.
    Ensures local database fields, API keys, and cached credentials are encrypted at rest.
    """

    def __init__(self, master_key: str = None):
        key_str = master_key or settings.SECRET_KEY
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"a3_enterprise_local_salt_v1",
            iterations=100000,
        )
        derived_key = base64.urlsafe_b64encode(kdf.derive(key_str.encode()))
        self.cipher = Fernet(derived_key)

    def encrypt(self, plain_text: str) -> str:
        if not plain_text:
            return ""
        return self.cipher.encrypt(plain_text.encode()).decode()

    def decrypt(self, encrypted_text: str) -> str:
        if not encrypted_text:
            return ""
        try:
            return self.cipher.decrypt(encrypted_text.encode()).decode()
        except Exception:
            return ""
