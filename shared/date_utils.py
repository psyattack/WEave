from datetime import datetime
from time import localtime, strftime


# Supported date formats from Steam Workshop
WORKSHOP_DATE_FORMATS = [
    "%d %b, %Y @ %I:%M%p",
    "%d %b @ %I:%M%p",
    "%b %d, %Y @ %I:%M%p",
    "%b %d @ %I:%M%p",
    "%Y-%m-%d",
    "%d.%m.%Y",
]


def parse_workshop_date_to_timestamp(date_str: str) -> int:
    """
    Parse Steam Workshop date string to Unix timestamp.
    
    Tries multiple date formats and handles missing year values.
    Returns 0 if parsing fails.
    """
    if not date_str:
        return 0

    cleaned = date_str.strip()
    for fmt in WORKSHOP_DATE_FORMATS:
        try:
            parsed = datetime.strptime(cleaned, fmt)
            # If year is 1900 (default), use current year
            if parsed.year == 1900:
                parsed = parsed.replace(year=datetime.now().year)
            return int(parsed.timestamp())
        except ValueError:
            continue
    return 0


def format_timestamp(timestamp: float, fmt: str = "%Y-%m-%d %H:%M") -> str:
    """
    Format Unix timestamp to human-readable string.
    
    Returns "Unknown" if formatting fails.
    """
    try:
        return strftime(fmt, localtime(timestamp))
    except Exception:
        return "Unknown"