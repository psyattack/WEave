import json
import base64
from pathlib import Path
from typing import Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import platform


class EncryptedStorage:
    def __init__(self, file_path: str | Path, salt: bytes | None = None):
        self.file_path = Path(file_path)
        self._salt = salt or b'WEave_Salt_2026_v1'
        self._cipher = self._create_cipher()
    
    def _create_cipher(self) -> Fernet:
        machine_id = f"{platform.node()}{platform.machine()}".encode()
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self._salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(machine_id))
        return Fernet(key)
    
    def exists(self) -> bool:
        return self.file_path.exists()
    
    def load(self, default: Any = None) -> Any:
        if not self.file_path.exists():
            return default
        
        try:
            with self.file_path.open("rb") as file:
                encrypted_data = file.read()
            
            if not encrypted_data:
                return default
            
            decrypted_data = self._cipher.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode("utf-8"))
        except Exception:
            return default
    
    def save(self, data: Any) -> bool:
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            
            json_data = json.dumps(data, indent=4, ensure_ascii=False)
            encrypted_data = self._cipher.encrypt(json_data.encode("utf-8"))
            
            with self.file_path.open("wb") as file:
                file.write(encrypted_data)
            
            return True
        except Exception:
            return False
    
    def delete(self) -> bool:
        try:
            if self.file_path.exists():
                self.file_path.unlink()
            return True
        except Exception:
            return False
