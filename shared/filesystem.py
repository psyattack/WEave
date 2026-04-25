import os
import shutil
from pathlib import Path
from typing import Union

from shared.constants import APP_NAME


def ensure_directory(path: Union[str, Path]) -> Path:
    """
    Create directory if it doesn't exist.
    
    Creates parent directories as needed.
    """
    target = Path(path)
    target.mkdir(parents=True, exist_ok=True)
    return target


def get_app_data_dir() -> Path:
    """
    Get application data directory path.
    
    Returns path to %LOCALAPPDATA%/WEave on Windows.
    """
    app_data = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    return app_data / APP_NAME


def get_directory_size(path: Union[str, Path]) -> int:
    """
    Calculate total size of directory in bytes.
    
    Recursively sums all file sizes, ignoring errors.
    """
    total = 0
    target = Path(path)

    try:
        for root, _, files in os.walk(target):
            for file_name in files:
                try:
                    total += (Path(root) / file_name).stat().st_size
                except Exception:
                    continue
    except Exception:
        return 0

    return total


def get_folder_mtime(path: Union[str, Path]) -> float:
    """
    Get folder modification time.
    
    Returns Unix timestamp or 0.0 on error.
    """
    try:
        return Path(path).stat().st_mtime
    except Exception:
        return 0.0


def clear_cache_if_needed(path: Union[str, Path], max_size_mb: int = 200) -> bool:
    """
    Clear cache directory if it exceeds size limit.
    
    Args:
        path: Cache directory path
        max_size_mb: Maximum size in megabytes
        
    Returns:
        True if cache was cleared, False otherwise
    """
    cache_path = Path(path)
    if not cache_path.exists():
        return False

    max_size_bytes = max_size_mb * 1024 * 1024
    current_size = get_directory_size(cache_path)
    if current_size < max_size_bytes:
        return False

    try:
        shutil.rmtree(cache_path)
        return True
    except Exception:
        return False