from copy import deepcopy
from pathlib import Path

from infrastructure.persistence.json_storage import JsonStorage
from shared.dict_utils import deep_merge

DEFAULT_APP_SETTINGS = {
    "system": {
        "directory": "",
    },
    "account": {
        "account": {
            "account_number": 3,
        }
    },
    "general": {
        "appearance": {
            "language": "en",
            "theme": "dark",
            "show_id_section": False,
            "alternative_tag_display": False,
        },
        "behavior": {
            "minimize_on_apply": False,
            "preload_next_page": True,
            "auto_check_updates": True,
            "auto_init_metadata": True,
            "auto_apply_last_downloaded": False,
            "skip_version": "",
            "save_window_state": True,
            "window_geometry": {
                "x": -1,
                "y": -1,
                "width": 1200,
                "height": 730,
                "is_maximized": False
            },
        },
    },
    "advanced": {
        "debug": {
            "debug_mode": False,
        }
    },
}


class AppSettingsRepository:
    """Repository for application settings with default value merging."""

    def __init__(self, settings_path: str | Path = "app_settings.json"):
        self.storage = JsonStorage(settings_path)

    def load(self) -> dict:
        """Load settings from storage, merging with defaults."""
        loaded = self.storage.load(default=deepcopy(DEFAULT_APP_SETTINGS))
        return deep_merge(deepcopy(DEFAULT_APP_SETTINGS), loaded)

    def save(self, data: dict) -> bool:
        """Save settings to storage."""
        return self.storage.save(data)
