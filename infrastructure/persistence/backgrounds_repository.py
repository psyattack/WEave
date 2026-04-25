from copy import deepcopy
from pathlib import Path

from infrastructure.persistence.json_storage import JsonStorage
from shared.dict_utils import deep_merge

DEFAULT_BACKGROUNDS = {
    "main": {"image": "", "blur": 0, "opacity": 100},
    "tabs": {"image": "", "blur": 0, "opacity": 100},
    "details": {"image": "", "blur": 0, "opacity": 100},
    "extend_to_titlebar": True,
}


class BackgroundsRepository:
    """Repository for background image settings with default value merging."""

    def __init__(self, backgrounds_path: str | Path = "backgrounds.json"):
        self.storage = JsonStorage(backgrounds_path)

    def load(self) -> dict:
        """Load background settings from storage, merging with defaults."""
        loaded = self.storage.load(default=deepcopy(DEFAULT_BACKGROUNDS))
        return deep_merge(deepcopy(DEFAULT_BACKGROUNDS), loaded)

    def save(self, data: dict) -> bool:
        """Save background settings to storage."""
        return self.storage.save(data)
