from dataclasses import dataclass, field
from typing import Optional


@dataclass
class WorkshopItem:
    """
    Represents a Steam Workshop item (wallpaper or asset).
    
    Contains all information displayed in workshop browse results,
    including download status and collection membership.
    """
    pubfileid: str
    title: str = ""
    preview_url: str = ""
    author: str = ""
    author_url: str = ""
    description: str = ""
    file_size: str = ""
    posted_date: str = ""
    updated_date: str = ""
    tags: dict = field(default_factory=dict)
    rating_star_file: str = ""
    num_ratings: str = ""
    is_installed: bool = False
    is_downloading: bool = False
    is_collection: bool = False
    collections: list = field(default_factory=list)


@dataclass
class WorkshopFilters:
    """
    Filter criteria for workshop search and browse.
    
    Supports all Steam Workshop filtering options including
    search text, sorting, tags, and content ratings.
    """
    search: str = ""
    sort: str = "trend"  # trend, popular, recent, etc.
    days: str = "7"  # Time range for trending
    category: str = ""
    type_tag: str = ""
    age_rating: str = ""
    resolution: str = ""
    misc_tags: list[str] = field(default_factory=list)
    genre_tags: list[str] = field(default_factory=list)
    excluded_misc_tags: list[str] = field(default_factory=list)
    excluded_genre_tags: list[str] = field(default_factory=list)
    asset_type: str = ""
    asset_genre: str = ""
    script_type: str = ""
    required_flags: list[str] = field(default_factory=list)
    page: int = 1


@dataclass
class WorkshopPage:
    """
    Represents a page of workshop browse results.
    
    Contains items, pagination info, and the filters used to fetch the page.
    """
    items: list[WorkshopItem] = field(default_factory=list)
    current_page: int = 1
    total_pages: int = 1
    total_items: int = 0
    filters: Optional[WorkshopFilters] = None


@dataclass
class WorkshopCollection:
    """
    Represents a Steam Workshop collection (curated list of items).
    
    Lightweight representation for collection browse results.
    """
    pubfileid: str
    title: str = ""
    preview_url: str = ""
    author: str = ""
    author_url: str = ""
    item_count: int = 0
    is_collection: bool = True


@dataclass
class CollectionContents:
    """
    Full contents of a workshop collection.
    
    Includes all items in the collection, related collections,
    and collection metadata.
    """
    collection_id: str
    title: str = ""
    description: str = ""
    preview_url: str = ""
    author: str = ""
    author_url: str = ""
    items: list[WorkshopItem] = field(default_factory=list)
    related_collections: list[WorkshopCollection] = field(default_factory=list)
    info: dict = field(default_factory=dict)