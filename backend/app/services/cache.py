import time
from typing import Dict, Any, Optional

class InMemoryCacheManager:
    """
    High-performance in-memory response & dataset preview cache manager with TTL eviction.
    """

    def __init__(self, default_ttl_seconds: int = 300):
        self.default_ttl = default_ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if not entry:
            self.misses += 1
            return None

        if time.time() > entry["expires_at"]:
            del self._cache[key]
            self.misses += 1
            return None

        self.hits += 1
        return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = {
            "value": value,
            "expires_at": time.time() + ttl
        }

    def clear(self) -> None:
        self._cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        total = self.hits + self.misses
        hit_ratio = (self.hits / total * 100) if total > 0 else 100.0
        return {
            "keys_count": len(self._cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_pct": round(hit_ratio, 2)
        }

cache_manager = InMemoryCacheManager()
