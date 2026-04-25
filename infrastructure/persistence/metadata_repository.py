from pathlib import Path
from typing import Optional

from infrastructure.persistence.json_storage import JsonStorage


class MetadataRepository:

    def __init__(self, metadata_path: str | Path = "metadata.json"):
        self.storage = JsonStorage(metadata_path)
        self._metadata: dict[str, dict] = {}
        self._load()

    def _load(self) -> None:
        data = self.storage.load(default={})
        if isinstance(data, dict):
            self._metadata = data
        else:
            self._metadata = {}

    def save(self) -> bool:
        return self.storage.save(self._metadata)

    def get(self, pubfileid: str) -> Optional[dict]:
        return self._metadata.get(pubfileid)

    def get_all(self) -> dict[str, dict]:
        return self._metadata.copy()

    def set(self, pubfileid: str, data: dict) -> None:
        self._metadata[pubfileid] = data
        self.save()

    def remove(self, pubfileid: str) -> None:
        if pubfileid in self._metadata:
            del self._metadata[pubfileid]
            self.save()

    def clear_all(self) -> bool:
        self._metadata = {}
        return self.save()

    def count(self) -> int:
        return len(self._metadata)
