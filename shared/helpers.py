import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

from PyQt6.QtWidgets import QApplication

from services.config_service import ConfigService


def is_frozen_build() -> bool:
    """Check if running as frozen executable (PyInstaller/cx_Freeze)."""
    return bool(getattr(sys, "frozen", False))


def restart_application(
    quit_app: bool = True,
    login: Optional[str] = None,
    password: Optional[str] = None,
    **kwargs,
) -> None:
    """
    Restart the application with optional credentials.
    
    Args:
        quit_app: Whether to quit current instance
        login: Optional login to pass to new instance
        password: Optional password to pass to new instance
        **kwargs: Additional command-line arguments
    """
    args = ["--restart"]

    if login is not None:
        args.extend(["-login", login])
    if password is not None:
        args.extend(["-password", password])

    # Convert kwargs to command-line arguments
    for key, value in kwargs.items():
        arg_key = f"-{key}" if len(key) == 1 else f"--{key}"
        if value is True:
            args.append(arg_key)
        elif isinstance(value, str):
            args.extend([arg_key, value])

    # Filter out existing credentials and restart flag
    executable = sys.executable
    filtered_args = []
    skip_next = False
    for arg in sys.argv:
        if skip_next:
            skip_next = False
            continue
        if arg in ["-login", "-password", "--restart"]:
            skip_next = True
            continue
        filtered_args.append(arg)
    
    restart_args = filtered_args + args
    subprocess.Popen([executable] + restart_args)

    if quit_app:
        QApplication.quit()


def request_restart_or_exit(
    quit_app: bool = True,
    login: Optional[str] = None,
    password: Optional[str] = None,
    **kwargs,
) -> None:
    """
    Request application restart or exit for frozen builds.
    
    For frozen builds, stores credentials temporarily and exits.
    For development builds, performs full restart.
    """
    if is_frozen_build():
        # Store credentials temporarily for frozen builds
        if login is not None and password is not None:
            try:
                config_service = ConfigService()
                config_service.set("system.temp_login", login)
                config_service.set("system.temp_password", password)
            except Exception:
                pass
        if quit_app:
            QApplication.quit()
        return

    restart_application(
        quit_app=quit_app,
        login=login,
        password=password,
        **kwargs,
    )


def extract_pubfileid(url_or_text: str) -> str:
    """
    Extract Steam Workshop file ID from URL or text.
    
    Searches for 8-10 digit numbers.
    Returns empty string if not found.
    """
    match = re.search(r"\b\d{8,10}\b", url_or_text)
    return match.group(0) if match else ""


def parse_file_size_to_bytes(size_str: str) -> int:
    """
    Parse human-readable file size to bytes.
    
    Supports: B, KB, MB, GB, TB
    Examples: "1.5 MB", "500KB", "2.3 GB"
    """
    if not size_str or not isinstance(size_str, str):
        return 0

    normalized = size_str.strip().upper().replace(",", ".")
    multipliers = {
        "TB": 1024 ** 4,
        "GB": 1024 ** 3,
        "MB": 1024 ** 2,
        "KB": 1024,
        "B": 1,
    }

    for suffix, multiplier in multipliers.items():
        if normalized.endswith(suffix):
            number_part = normalized[:-len(suffix)].strip()
            try:
                return int(float(number_part) * multiplier)
            except (ValueError, TypeError):
                return 0

    try:
        return int(float(normalized))
    except (ValueError, TypeError):
        return 0


def parse_depot_status(status_text: str) -> dict:
    """
    Parse DepotDownloader status text to extract progress information.
    
    Extracts downloaded/total bytes and percentage from status strings.
    
    Returns:
        Dictionary with keys: downloaded_bytes, total_bytes, percent
    """
    result = {
        "downloaded_bytes": 0,
        "total_bytes": 0,
        "percent": -1.0,
    }
    if not status_text:
        return result

    # Extract "X MB / Y MB" pattern
    progress_match = re.search(
        r"([\d.,]+)\s*(TB|GB|MB|KB|B)\s*/\s*([\d.,]+)\s*(TB|GB|MB|KB|B)",
        status_text,
        re.IGNORECASE,
    )
    if progress_match:
        downloaded = f"{progress_match.group(1)} {progress_match.group(2)}"
        total = f"{progress_match.group(3)} {progress_match.group(4)}"
        result["downloaded_bytes"] = parse_file_size_to_bytes(downloaded)
        result["total_bytes"] = parse_file_size_to_bytes(total)

    # Extract percentage
    percent_match = re.search(r"([\d.,]+)\s*%", status_text)
    if percent_match:
        try:
            result["percent"] = float(percent_match.group(1).replace(",", "."))
        except ValueError:
            pass

    return result


def project_root() -> Path:
    """Get project root directory path."""
    return Path(__file__).resolve().parent.parent