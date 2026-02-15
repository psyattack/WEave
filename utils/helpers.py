import os
import re
import time
import shutil
import subprocess
from pathlib import Path
from typing import Union

def human_readable_size(size_bytes: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} PB"

def format_bytes_short(num_bytes: int) -> str:
    if num_bytes <= 0:
        return "0B"
    if num_bytes < 1024:
        return f"{num_bytes}B"
    elif num_bytes < 1024 ** 2:
        val = num_bytes / 1024
        return f"{val:.0f}KB" if val >= 10 else f"{val:.1f}KB"
    elif num_bytes < 1024 ** 3:
        val = num_bytes / (1024 ** 2)
        return f"{val:.0f}MB" if val >= 10 else f"{val:.1f}MB"
    else:
        val = num_bytes / (1024 ** 3)
        return f"{val:.1f}GB"

def parse_file_size_to_bytes(size_str: str) -> int:
    if not size_str or not isinstance(size_str, str):
        return 0

    size_str = size_str.strip().upper().replace(",", ".")

    multipliers = {
        'TB': 1024 ** 4,
        'GB': 1024 ** 3,
        'MB': 1024 ** 2,
        'KB': 1024,
        'B': 1,
    }

    for suffix, multiplier in multipliers.items():
        if size_str.endswith(suffix):
            number_part = size_str[:-len(suffix)].strip()
            try:
                return int(float(number_part) * multiplier)
            except (ValueError, TypeError):
                return 0
    try:
        return int(float(size_str))
    except (ValueError, TypeError):
        return 0

def parse_depot_status(status_text: str) -> dict:
    result = {
        'downloaded_bytes': 0,
        'total_bytes': 0,
        'percent': -1.0,
    }

    if not status_text:
        return result

    dl_pattern = re.search(
        r'([\d.,]+)\s*(TB|GB|MB|KB|B)\s*[/]\s*([\d.,]+)\s*(TB|GB|MB|KB|B)',
        status_text, re.IGNORECASE
    )
    if dl_pattern:
        dl_str = f"{dl_pattern.group(1)} {dl_pattern.group(2)}"
        total_str = f"{dl_pattern.group(3)} {dl_pattern.group(4)}"
        result['downloaded_bytes'] = parse_file_size_to_bytes(dl_str)
        result['total_bytes'] = parse_file_size_to_bytes(total_str)

    pct_match = re.search(r'([\d.,]+)\s*%', status_text)
    if pct_match:
        try:
            result['percent'] = float(pct_match.group(1).replace(',', '.'))
        except ValueError:
            pass

    return result

def get_directory_size(path: Union[str, Path]) -> int:
    total = 0
    path = Path(path)
    try:
        for root, dirs, files in os.walk(path):
            for file in files:
                try:
                    file_path = Path(root) / file
                    total += file_path.stat().st_size
                except Exception:
                    pass
    except Exception:
        pass
    return total

def get_folder_mtime(path: Union[str, Path]) -> float:
    try:
        return Path(path).stat().st_mtime
    except Exception:
        return 0.0

def format_timestamp(timestamp: float, fmt: str = "%Y-%m-%d %H:%M") -> str:
    try:
        return time.strftime(fmt, time.localtime(timestamp))
    except Exception:
        return "Unknown"

def ensure_directory(path: Union[str, Path]) -> Path:
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path

def clear_cache_if_needed(cache_path: Union[str, Path], max_size_mb: int = 200) -> bool:
    cache_path = Path(cache_path)
    if not cache_path.exists():
        return False
    try:
        total_size = get_directory_size(cache_path)
        max_size_bytes = max_size_mb * 1024 * 1024
        if total_size >= max_size_bytes:
            shutil.rmtree(cache_path)
            return True
    except Exception as e:
        print(f"Error clearing cache: {e}")
    return False

def extract_pubfileid(url_or_text: str) -> str:
    match = re.search(r'\b\d{8,10}\b', url_or_text)
    return match.group(0) if match else ""

def kill_process_by_name(process_name: str) -> bool:
    try:
        subprocess.run(
            f"taskkill /f /im {process_name}",
            creationflags=subprocess.CREATE_NO_WINDOW,
            check=False
        )
        return True
    except Exception:
        return False
