from dataclasses import dataclass, field


@dataclass
class WallpaperMetadata:
    """
    Cached metadata for a Steam Workshop wallpaper.
    
    Stores detailed information fetched from workshop pages to avoid
    repeated network requests.
    """
    pubfileid: str
    title: str = ""
    description: str = ""
    preview_url: str = ""
    author: str = ""
    author_url: str = ""
    file_size: str = ""
    rating: int = 0  # 1-5 stars
    num_ratings: str = ""
    rating_star_file: str = ""  # e.g., "5-star_large"
    posted_date: int = 0  # Unix timestamp
    posted_date_str: str = ""
    updated_date: int = 0  # Unix timestamp
    updated_date_str: str = ""
    tags: dict = field(default_factory=dict)
    collections: list = field(default_factory=list)


@dataclass
class LocalWallpaperEntry:
    """
    Represents a locally installed wallpaper.
    
    Contains filesystem and metadata information for wallpapers
    in the Wallpaper Engine projects directory.
    """
    path: str
    pubfileid: str
    title: str
    install_date: float  # Unix timestamp
    size: int  # Bytes
    tags: dict = field(default_factory=dict)
    rating: int = 0
    posted_date: int = 0
    updated_date: int = 0