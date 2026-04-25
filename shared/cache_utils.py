from collections import OrderedDict
from typing import Generic, Optional, TypeVar


T = TypeVar('T')


class LRUCache(Generic[T]):
    """
    Generic Least Recently Used (LRU) cache implementation.
    
    Automatically evicts least recently used items when max capacity is reached.
    Uses OrderedDict for O(1) access and efficient reordering.
    """
    
    def __init__(self, max_size: int):
        self.max_size = max_size
        self._cache: OrderedDict[str, T] = OrderedDict()

    def get(self, key: str) -> Optional[T]:
        """Get item from cache and mark as recently used."""
        if key not in self._cache:
            return None
        self._cache.move_to_end(key)
        return self._cache[key]

    def set(self, key: str, value: T) -> None:
        """Add or update item in cache, evicting oldest if necessary."""
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value

        # Evict oldest items if over capacity
        while len(self._cache) > self.max_size:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        """Remove all items from cache."""
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)

    def __contains__(self, key: str) -> bool:
        return key in self._cache
