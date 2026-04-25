from dataclasses import dataclass
from typing import Optional


@dataclass
class ReleaseInfo:
    """
    GitHub release information.
    
    Contains version details, download URLs, and release notes
    fetched from GitHub API.
    """
    version: str
    tag_name: str
    html_url: str
    download_url: str
    name: str = ""
    body: str = ""  # Release notes in markdown
    published_at: str = ""
    is_prerelease: bool = False


@dataclass
class UpdateCheckResult:
    """
    Result of checking for application updates.
    
    Indicates whether an update is available and provides
    release information if found.
    """
    update_available: bool
    current_version: str
    latest_version: str
    release_info: Optional[ReleaseInfo] = None
    error: str = ""