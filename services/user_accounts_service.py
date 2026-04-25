from pathlib import Path
from typing import Optional

from domain.models.account import AccountCredentials
from infrastructure.persistence.encrypted_storage import EncryptedStorage
from shared.filesystem import get_app_data_dir


class UserAccountsService:
    def __init__(self, storage_path: str | Path | None = None):
        if storage_path is None:
            storage_path = get_app_data_dir() / "user_accounts.enc"
        self.storage = EncryptedStorage(storage_path)
        self._accounts: list[dict] = []
        self._load()
    
    def _load(self) -> None:
        data = self.storage.load(default=[])
        if isinstance(data, list):
            self._accounts = data
        else:
            self._accounts = []
    
    def _save(self) -> bool:
        return self.storage.save(self._accounts)
    
    def add_account(self, username: str, password: str) -> bool:
        if not username or not password:
            return False
        
        if any(acc["username"] == username for acc in self._accounts):
            return False
        
        self._accounts.append({
            "username": username,
            "password": password,
        })
        return self._save()
    
    def remove_account(self, username: str) -> bool:
        original_count = len(self._accounts)
        self._accounts = [acc for acc in self._accounts if acc["username"] != username]
        
        if len(self._accounts) < original_count:
            return self._save()
        return False
    
    def get_accounts(self) -> list[AccountCredentials]:
        return [
            AccountCredentials(
                username=acc["username"],
                password=acc["password"],
                is_custom=True,
            )
            for acc in self._accounts
        ]
    
    def get_account_usernames(self) -> list[str]:
        return [acc["username"] for acc in self._accounts]
    
    def get_credentials(self, username: str) -> Optional[tuple[str, str]]:
        for acc in self._accounts:
            if acc["username"] == username:
                return acc["username"], acc["password"]
        return None
    
    def clear_all(self) -> bool:
        self._accounts = []
        return self._save()
    
    def count(self) -> int:
        return len(self._accounts)
