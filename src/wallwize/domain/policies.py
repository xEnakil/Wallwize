from __future__ import annotations

from dataclasses import dataclass

DEFAULT_OLED_BLACK_THRESHOLD = 35.0
DEFAULT_DISCOVERY_MIN_COUNT = 2
DEFAULT_VISION_PROFILE = "off"
DEFAULT_VISION_MIN_CONFIDENCE = 0.72


@dataclass(frozen=True)
class OrganizationPolicy:
    oled_black_threshold: float = DEFAULT_OLED_BLACK_THRESHOLD
    discovery_min_count: int = DEFAULT_DISCOVERY_MIN_COUNT
    enable_discovery: bool = True
    vision_profile: str = DEFAULT_VISION_PROFILE
    vision_min_confidence: float = DEFAULT_VISION_MIN_CONFIDENCE
    vision_cache_dir: str | None = None
    vision_node_bin: str | None = None
    vision_local_only: bool = False

    def validate(self) -> None:
        if not 0 <= self.oled_black_threshold <= 100:
            raise ValueError("oled_black_threshold must be between 0 and 100")
        if self.discovery_min_count < 1:
            raise ValueError("discovery_min_count must be at least 1")
        if not 0 <= self.vision_min_confidence <= 1:
            raise ValueError("vision_min_confidence must be between 0 and 1")


DEFAULT_POLICY = OrganizationPolicy()
