import base64
import sys
from typing import Dict

_custom_login = None
_custom_password = None
if "-login" in sys.argv:
    try:
        idx = sys.argv.index("-login")
        if idx + 1 < len(sys.argv):
            _custom_login = sys.argv[idx + 1]
    except:
        pass
if "-password" in sys.argv:
    try:
        idx = sys.argv.index("-password")
        if idx + 1 < len(sys.argv):
            _custom_password = sys.argv[idx + 1]
    except:
        pass

class AccountManager:
    ACCOUNTS = {
        'ruiiixx': 'UzY3R0JUQjgzRDNZ',
        'premexilmenledgconis': 'M3BYYkhaSmxEYg==',
        'vAbuDy': 'Qm9vbHE4dmlw',
        'adgjl1182': 'UUVUVU85OTk5OQ==',
        'gobjj16182': 'enVvYmlhbzgyMjI=',
        '787109690': 'SHVjVXhZTVFpZzE1',
        'weworkshopmanager2': 'a2Fpem9rdV9vX2h5b3U='
    }
    
    def __init__(self):
        self._passwords = self._decode_passwords()
        if _custom_login and _custom_password:
            self.ACCOUNTS.pop("weworkshopmanager2")
            self.ACCOUNTS[_custom_login] = _custom_password
            self._passwords[_custom_login] = _custom_password
    
    def _decode_passwords(self) -> Dict[str, str]:
        return {
            account: base64.b64decode(encoded).decode('utf-8')
            for account, encoded in self.ACCOUNTS.items()
        }
    
    def get_accounts(self) -> list:
        return list(self.ACCOUNTS.keys())
    
    def get_account(self, index: int) -> str:
        accounts = self.get_accounts()
        if 0 <= index < len(accounts):
            return accounts[index]
        return accounts[0]
    
    def get_password(self, account: str) -> str:
        return self._passwords.get(account, "")
    
    def get_credentials(self, index: int) -> tuple:
        account = self.get_account(index)
        password = self.get_password(account)
        return account, password
