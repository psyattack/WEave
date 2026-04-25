from PyQt6.QtGui import QColor


def human_readable_size(size_bytes: int) -> str:
    """
    Convert bytes to human-readable size string.
    
    Returns size with appropriate unit (B, KB, MB, GB, TB, PB).
    """
    value = float(size_bytes)
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if value < 1024.0:
            return f"{value:.1f} {unit}"
        value /= 1024.0
    return f"{value:.1f} PB"


def format_bytes_short(num_bytes: int) -> str:
    """
    Convert bytes to compact size string.
    
    Uses shorter format without spaces (e.g., "1.5MB" instead of "1.5 MB").
    """
    if num_bytes <= 0:
        return "0B"
    if num_bytes < 1024:
        return f"{num_bytes}B"
    if num_bytes < 1024 ** 2:
        value = num_bytes / 1024
        return f"{value:.0f}KB" if value >= 10 else f"{value:.1f}KB"
    if num_bytes < 1024 ** 3:
        value = num_bytes / (1024 ** 2)
        return f"{value:.0f}MB" if value >= 10 else f"{value:.1f}MB"

    value = num_bytes / (1024 ** 3)
    return f"{value:.1f}GB"


def hex_to_rgba(hex_color: str, alpha: int = 255) -> str:
    """
    Convert hex color to RGBA string.
    
    Args:
        hex_color: Hex color string (e.g., "#FF5733")
        alpha: Alpha value (0-255)
        
    Returns:
        RGBA string (e.g., "rgba(255, 87, 51, 255)")
    """
    normalized = hex_color.lstrip("#")
    if len(normalized) != 6:
        return hex_color

    red = int(normalized[0:2], 16)
    green = int(normalized[2:4], 16)
    blue = int(normalized[4:6], 16)
    return f"rgba({red}, {green}, {blue}, {alpha})"


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """
    Convert hex color to RGB tuple.
    
    Returns:
        Tuple of (red, green, blue) values (0-255)
    """
    c = QColor(hex_color)
    return c.red(), c.green(), c.blue()