from dataclasses import dataclass
from typing import Optional


@dataclass
class ReleaseInfo:
    version: str
    tag_name: str
    html_url: str
    download_url: str
    name: str = ""
    body: str = ""
    published_at: str = ""
    is_prerelease: bool = False


@dataclass
class UpdateCheckResult:
    update_available: bool
    current_version: str
    latest_version: str
    release_info: Optional[ReleaseInfo] = None
    error: str = ""