from copy import deepcopy
from pathlib import Path

from infrastructure.persistence.json_storage import JsonStorage

DEFAULT_BACKGROUNDS = {
    "main": {"image": "", "blur": 0, "opacity": 100},
    "tabs": {"image": "", "blur": 0, "opacity": 100},
    "details": {"image": "", "blur": 0, "opacity": 100},
    "extend_to_titlebar": True,
}


class BackgroundsRepository:

    def __init__(self, backgrounds_path: str | Path = "backgrounds.json"):
        self.storage = JsonStorage(backgrounds_path)

    def load(self) -> dict:
        loaded = self.storage.load(default=deepcopy(DEFAULT_BACKGROUNDS))
        return self._deep_merge(deepcopy(DEFAULT_BACKGROUNDS), loaded)

    def save(self, data: dict) -> bool:
        return self.storage.save(data)

    def _deep_merge(self, base: dict, override: dict) -> dict:
        result = deepcopy(base)
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
