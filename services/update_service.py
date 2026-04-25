import json
import urllib.error
import urllib.request

from domain.models.update import ReleaseInfo, UpdateCheckResult
from shared.constants import APP_VERSION


class UpdateService:
    """
    Service for checking application updates from GitHub releases.
    
    Fetches latest release information and compares versions using
    semantic versioning.
    """
    
    REPO_OWNER = "psyattack"
    REPO_NAME = "we-workshop-manager"

    @classmethod
    def get_latest_release_url(cls) -> str:
        """Get GitHub API URL for latest release."""
        return f"https://api.github.com/repos/{cls.REPO_OWNER}/{cls.REPO_NAME}/releases/latest"

    @staticmethod
    def normalize_version(version: str) -> str:
        """Normalize version string by removing 'v' prefix and converting to lowercase."""
        return version.strip().lower().removeprefix("v")

    @classmethod
    def parse_version(cls, version: str) -> tuple[int, ...]:
        """
        Parse version string to tuple of integers for comparison.
        
        Handles versions like "2.5.0", "v1.2.3", "1.0.0-beta".
        Extracts only numeric parts.
        """
        normalized = cls.normalize_version(version)
        parts = normalized.split(".")
        result = []
        for part in parts:
            try:
                result.append(int(part))
            except ValueError:
                # Extract digits from parts like "0-beta"
                digits = "".join(ch for ch in part if ch.isdigit())
                result.append(int(digits) if digits else 0)
        return tuple(result)

    @classmethod
    def is_newer_version(cls, latest: str, current: str) -> bool:
        """Check if latest version is newer than current version."""
        return cls.parse_version(latest) > cls.parse_version(current)

    @classmethod
    def _choose_download_url(cls, release_data: dict) -> str:
        """
        Choose best download URL from release assets.
        
        Prefers: .zip > .7z > .exe > any asset > release page
        """
        assets = release_data.get("assets", [])
        preferred_suffixes = (".zip", ".7z", ".exe")

        for suffix in preferred_suffixes:
            for asset in assets:
                url = asset.get("browser_download_url", "")
                name = asset.get("name", "").lower()
                if url and name.endswith(suffix):
                    return url

        # Fallback to first asset or release page
        for asset in assets:
            url = asset.get("browser_download_url", "")
            if url:
                return url

        return release_data.get("html_url", "")

    @classmethod
    def fetch_latest_release(cls, timeout: int = 8) -> ReleaseInfo:
        """
        Fetch latest release information from GitHub API.
        
        Args:
            timeout: Request timeout in seconds
            
        Returns:
            ReleaseInfo object with release details
            
        Raises:
            urllib.error.URLError: Network or HTTP errors
        """
        request = urllib.request.Request(
            cls.get_latest_release_url(),
            headers={
                "User-Agent": "WEave-UpdateChecker",
                "Accept": "application/vnd.github+json",
            },
        )
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw)

        tag_name = data.get("tag_name", "")
        version = cls.normalize_version(tag_name or data.get("name", ""))

        return ReleaseInfo(
            version=version,
            tag_name=tag_name,
            html_url=data.get("html_url", ""),
            download_url=cls._choose_download_url(data),
            name=data.get("name", ""),
            body=data.get("body", ""),
            published_at=data.get("published_at", ""),
            is_prerelease=bool(data.get("prerelease", False)),
        )

    @classmethod
    def check_for_updates(cls, skipped_version: str = "") -> UpdateCheckResult:
        """
        Check if newer version is available.
        
        Args:
            skipped_version: Version user chose to skip
            
        Returns:
            UpdateCheckResult with availability and release info
        """
        current_version = APP_VERSION
        try:
            release = cls.fetch_latest_release()
            latest_version = release.version or cls.normalize_version(release.tag_name)

            if not latest_version:
                return UpdateCheckResult(
                    update_available=False,
                    current_version=current_version,
                    latest_version=current_version,
                    error="Invalid release version",
                )

            # Don't notify if user skipped this version
            if skipped_version and cls.normalize_version(skipped_version) == cls.normalize_version(latest_version):
                return UpdateCheckResult(
                    update_available=False,
                    current_version=current_version,
                    latest_version=latest_version,
                    release_info=release,
                )

            has_update = cls.is_newer_version(latest_version, current_version)
            return UpdateCheckResult(
                update_available=has_update,
                current_version=current_version,
                latest_version=latest_version,
                release_info=release,
            )

        except urllib.error.HTTPError as error:
            return UpdateCheckResult(
                update_available=False,
                current_version=current_version,
                latest_version=current_version,
                error=f"HTTP {error.code}",
            )
        except urllib.error.URLError as error:
            return UpdateCheckResult(
                update_available=False,
                current_version=current_version,
                latest_version=current_version,
                error=str(error.reason),
            )
        except Exception as error:
            return UpdateCheckResult(
                update_available=False,
                current_version=current_version,
                latest_version=current_version,
                error=str(error),
            )