from __future__ import annotations

from dataclasses import dataclass

from wallwize.classification.discovery import DiscoveryCatalog
from wallwize.classification.vision.base import VisionResult
from wallwize.domain.models import ImageRecord
from wallwize.domain.policies import DEFAULT_POLICY, OrganizationPolicy
from wallwize.domain.taxonomy import GENRE_LABEL_BY_ID, GENRE_PRIORITY

METADATA_OVERRIDE_MIN_CONFIDENCE = 0.72
VISION_SUGGESTION_MIN_CONFIDENCE = 0.55


@dataclass(frozen=True)
class FolderRoute:
    category_id: str
    folder_name: str
    is_oled: bool
    reason: str
    source: str
    confidence: float


class WallpaperRouter:
    def __init__(
        self,
        policy: OrganizationPolicy = DEFAULT_POLICY,
        discovery_catalog: DiscoveryCatalog | None = None,
        vision_results: dict[str, VisionResult] | None = None,
    ) -> None:
        policy.validate()
        self._policy = policy
        self._discovery_catalog = discovery_catalog
        self._vision_results = vision_results or {}

    def route(self, record: ImageRecord) -> FolderRoute:
        if self.is_oled_candidate(record):
            return FolderRoute(
                category_id="oled",
                folder_name="OLED",
                is_oled=True,
                reason=(
                    f"pure black pixels {record.black_percent:.1f}% "
                    f">= {self._policy.oled_black_threshold:.1f}%"
                ),
                source="oled-policy",
                confidence=0.95,
            )

        vision = self._vision_route(record)
        known = self._known_genre(record)
        discovered = self._discovered_genre(record)
        if vision and known and vision.category_id == known.category_id:
            return FolderRoute(
                category_id=vision.category_id,
                folder_name=vision.folder_name,
                is_oled=False,
                reason=f"{vision.reason}; confirmed by filename taxonomy",
                source="local-vision+known-taxonomy",
                confidence=min(0.98, max(vision.confidence, known.confidence) + 0.12),
            )

        if vision and discovered and vision.category_id == discovered.category_id:
            return FolderRoute(
                category_id=vision.category_id,
                folder_name=vision.folder_name,
                is_oled=False,
                reason=f"{vision.reason}; confirmed by local discovery",
                source="local-vision+local-discovery",
                confidence=min(0.94, max(vision.confidence, discovered.confidence) + 0.10),
            )

        if (
            vision
            and vision.confidence >= self._policy.vision_min_confidence
            and known is None
            and discovered is None
        ):
            return vision

        if (
            vision
            and vision.confidence
            >= max(self._policy.vision_min_confidence, METADATA_OVERRIDE_MIN_CONFIDENCE)
        ):
            return vision

        if known:
            return known

        if discovered:
            return discovered

        if vision and vision.confidence >= VISION_SUGGESTION_MIN_CONFIDENCE:
            return FolderRoute(
                category_id=vision.category_id,
                folder_name=vision.folder_name,
                is_oled=False,
                reason=f"{vision.reason}; queued for review",
                source="local-vision-suggestion",
                confidence=vision.confidence,
            )

        if vision:
            return FolderRoute(
                category_id="needs-review",
                folder_name="Needs Review",
                is_oled=False,
                reason=(
                    f"vision was uncertain: {vision.folder_name} "
                    f"score {vision.confidence:.2f}"
                ),
                source="vision-low-confidence",
                confidence=vision.confidence,
            )

        return FolderRoute(
            category_id="needs-review",
            folder_name="Needs Review",
            is_oled=False,
            reason="no reliable local category found",
            source="fallback",
            confidence=0.0,
        )

    def is_oled_candidate(self, record: ImageRecord) -> bool:
        return record.black_percent >= self._policy.oled_black_threshold

    def _known_genre(self, record: ImageRecord) -> FolderRoute | None:
        tags = set(record.tags)
        for genre_id in GENRE_PRIORITY:
            if genre_id in tags:
                label = GENRE_LABEL_BY_ID[genre_id]
                return FolderRoute(
                    category_id=genre_id,
                    folder_name=label,
                    is_oled=False,
                    reason=f"known genre {label}",
                    source="known-taxonomy",
                    confidence=0.82,
                )
        return None

    def _vision_route(self, record: ImageRecord) -> FolderRoute | None:
        result = self._vision_results.get(record.absolute_path)
        if result is None or result.top is None:
            return None
        top = result.top
        confidence = calibrated_vision_confidence(result)
        return FolderRoute(
            category_id=top.category_id,
            folder_name=top.folder_name,
            is_oled=False,
            reason=(
                f"local vision {result.profile} matched {top.folder_name} "
                f"with raw score {top.score:.2f}"
            ),
            source="local-vision",
            confidence=confidence,
        )

    def _discovered_genre(self, record: ImageRecord) -> FolderRoute | None:
        if not self._policy.enable_discovery or self._discovery_catalog is None:
            return None
        discovered = self._discovery_catalog.resolve(record)
        if discovered is None:
            return None
        confidence = (
            0.76
            if discovered.count == 1
            else min(0.88, 0.68 + discovered.count * 0.04)
        )
        reason = (
            f"discovered local genre {discovered.label}"
            if discovered.count == 1
            else f"discovered local genre {discovered.label} in {discovered.count} files"
        )
        return FolderRoute(
            category_id=discovered.label.lower().replace(" ", "-"),
            folder_name=discovered.label,
            is_oled=False,
            reason=reason,
            source="local-discovery",
            confidence=confidence,
        )


def calibrated_vision_confidence(result: VisionResult) -> float:
    candidates = result.candidates
    if not candidates:
        return 0.0
    top_score = max(0.0, min(1.0, candidates[0].score))
    second_score = max(0.0, min(1.0, candidates[1].score)) if len(candidates) > 1 else 0.0
    margin = max(0.0, top_score - second_score)
    return min(0.96, top_score + margin)
