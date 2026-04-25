from typing import Optional
from PyQt6.QtWidgets import QWidget


def find_theme_service(widget: QWidget) -> Optional[object]:
    """
    Traverse widget hierarchy to find theme service.
    
    Searches up the parent chain for a widget with a 'theme' attribute.
    Used by dialogs and notifications to access theme colors.
    """
    current = widget
    while current:
        if hasattr(current, "theme"):
            return current.theme
        current = current.parent() if hasattr(current, "parent") else None
    return None


def find_main_window(widget: QWidget) -> Optional[QWidget]:
    """
    Traverse widget hierarchy to find main window.
    
    Searches up the parent chain for the root window.
    """
    current = widget
    while current:
        parent = current.parent() if hasattr(current, "parent") else None
        if parent is None:
            return current
        current = parent
    return None


def get_theme_colors(theme_service, fallback_colors: dict[str, str]) -> dict[str, str]:
    """
    Get theme colors with fallback values.
    
    Args:
        theme_service: Theme service instance or None
        fallback_colors: Dictionary of color names to fallback hex values
        
    Returns:
        Dictionary of color names to hex values
    """
    colors = {}
    for color_name, fallback_value in fallback_colors.items():
        if theme_service:
            colors[color_name] = theme_service.get_color(color_name)
        else:
            colors[color_name] = fallback_value
    return colors
