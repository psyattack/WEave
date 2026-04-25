import base64
import sys

from domain.models.account import AccountCredentials
from services.config_service import ConfigService
from services.user_accounts_service import UserAccountsService


class AccountService:
    """
    Manages Steam account credentials for workshop parsing and downloading.
    
    Provides access to:
    - Default upload accounts (hardcoded, base64-encoded)
    - Parsing account (for browsing workshop)
    - User-added custom accounts
    - Runtime credentials from command-line arguments
    """
    
    # Account used for parsing workshop pages (read-only browsing)
    _PARSING_ACCOUNT = {
        "username": "weworkshopmanager2",
        "password": "a2Fpem9rdV9vX2h5b3U=",
    }
    
    # Default accounts for downloading workshop items
    _DEFAULT_UPLOAD_ACCOUNTS = {
        "ruiiixx": "UzY3R0JUQjgzRDNZ",
        "premexilmenledgconis": "M3BYYkhaSmxEYg==",
        "vAbuDy": "Qm9vbHE4dmlw",
        "adgjl1182": "UUVUVU85OTk5OQ==",
        "gobjj16182": "enVvYmlhbzgyMjI=",
        "787109690": "SHVjVXhZTVFpZzE1",
    }

    def __init__(
        self,
        upload_accounts: list[AccountCredentials],
        parsing_account: AccountCredentials,
        user_accounts_service: UserAccountsService | None = None,
    ):
        self._upload_accounts = upload_accounts
        self._parsing_account = parsing_account
        self._user_accounts_service = user_accounts_service

    @classmethod
    def from_runtime_arguments(cls) -> "AccountService":
        """
        Create AccountService from command-line arguments and config.
        
        Checks for -login and -password arguments, or temporary credentials
        stored in config (used after restart).
        """
        custom_login = None
        custom_password = None

        # Check command-line arguments
        if "-login" in sys.argv:
            try:
                index = sys.argv.index("-login")
                if index + 1 < len(sys.argv):
                    custom_login = sys.argv[index + 1]
            except Exception:
                custom_login = None

        if "-password" in sys.argv:
            try:
                index = sys.argv.index("-password")
                if index + 1 < len(sys.argv):
                    custom_password = sys.argv[index + 1]
            except Exception:
                custom_password = None

        # Check temporary credentials from config (after restart)
        if not custom_login or not custom_password:
            try:
                config_service = ConfigService()
                config_login = config_service.get("system.temp_login")
                config_password = config_service.get("system.temp_password")
                if config_login and config_password:
                    if not custom_login:
                        custom_login = config_login
                    if not custom_password:
                        custom_password = config_password
                    config_service.remove("system.temp_login")
                    config_service.remove("system.temp_password")
            except Exception:
                pass

        # Build account list: defaults + user-added + custom
        upload_accounts = cls._build_default_upload_accounts()
        
        user_accounts_service = UserAccountsService()
        user_added_accounts = user_accounts_service.get_accounts()
        upload_accounts.extend(user_added_accounts)

        if custom_login and custom_password:
            upload_accounts.append(
                AccountCredentials(
                    username=custom_login,
                    password=custom_password,
                    is_custom=True,
                )
            )

        parsing_account = cls._build_parsing_account()

        return cls(upload_accounts, parsing_account, user_accounts_service)

    @classmethod
    def _build_default_upload_accounts(cls) -> list[AccountCredentials]:
        """Decode and build default upload account list."""
        result: list[AccountCredentials] = []
        for username, encoded_password in cls._DEFAULT_UPLOAD_ACCOUNTS.items():
            decoded_password = base64.b64decode(encoded_password).decode("utf-8")
            result.append(
                AccountCredentials(
                    username=username,
                    password=decoded_password,
                    is_custom=False,
                )
            )
        return result
    
    @classmethod
    def _build_parsing_account(cls) -> AccountCredentials:
        """Decode and build parsing account."""
        decoded_password = base64.b64decode(cls._PARSING_ACCOUNT["password"]).decode("utf-8")
        return AccountCredentials(
            username=cls._PARSING_ACCOUNT["username"],
            password=decoded_password,
            is_custom=False,
        )

    def get_upload_accounts(self) -> list[str]:
        """Get list of upload account usernames."""
        return [account.username for account in self._upload_accounts]

    def get_upload_account(self, index: int) -> str:
        """Get upload account username by index."""
        if not self._upload_accounts:
            return ""

        if 0 <= index < len(self._upload_accounts):
            return self._upload_accounts[index].username

        return self._upload_accounts[0].username

    def get_password(self, account_name: str) -> str:
        """Get password for any account (upload or parsing)."""
        for account in self._upload_accounts:
            if account.username == account_name:
                return account.password
        
        if self._parsing_account.username == account_name:
            return self._parsing_account.password
        
        return ""

    def get_upload_credentials(self, index: int) -> tuple[str, str]:
        """Get upload account credentials as tuple (username, password)."""
        if not self._upload_accounts:
            return "", ""

        if 0 <= index < len(self._upload_accounts):
            account = self._upload_accounts[index]
        else:
            account = self._upload_accounts[0]

        return account.username, account.password

    def get_upload_credentials_model(self, index: int) -> AccountCredentials:
        """Get upload account credentials as model object."""
        if not self._upload_accounts:
            return AccountCredentials(username="", password="")

        if 0 <= index < len(self._upload_accounts):
            return self._upload_accounts[index]

        return self._upload_accounts[0]
    
    def get_parsing_credentials(self) -> tuple[str, str]:
        """Get parsing account credentials as tuple."""
        return self._parsing_account.username, self._parsing_account.password
    
    def get_parsing_credentials_model(self) -> AccountCredentials:
        """Get parsing account credentials as model object."""
        return self._parsing_account
    
    def get_user_accounts_service(self) -> UserAccountsService | None:
        """Get user accounts service for managing custom accounts."""
        return self._user_accounts_service