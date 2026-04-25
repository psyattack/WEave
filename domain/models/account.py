from dataclasses import dataclass


@dataclass(frozen=True)
class AccountCredentials:
    """
    Immutable Steam account credentials.
    
    Used for workshop browsing and downloading. The is_custom flag
    indicates whether this is a user-added account or a default one.
    """
    username: str
    password: str
    is_custom: bool = False