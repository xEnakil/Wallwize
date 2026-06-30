from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class ImageRecord:
    absolute_path: str
    relative_path: str
    file_name: str
    extension: str
    size_bytes: int
    sha256: str
    average_hash: str
    width: int
    height: int
    aspect_label: str
    brightness: float
    dark_percent: float
    black_percent: float
    oled_score: int
    dominant_colors: list[str]
    color_percentages: dict[str, float]
    tags: list[str]
    filename_tags: list[str]
    visual_tags: list[str]
    thumbnail_path: str = ""
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ImageRecord":
        return cls(**payload)


@dataclass(frozen=True)
class ScanIndex:
    version: int
    source_root: str
    created_at: str
    image_count: int
    records: list[ImageRecord]
    errors: list[dict[str, str]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "source_root": self.source_root,
            "created_at": self.created_at,
            "image_count": self.image_count,
            "records": [record.to_dict() for record in self.records],
            "errors": self.errors,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "ScanIndex":
        return cls(
            version=payload["version"],
            source_root=payload["source_root"],
            created_at=payload["created_at"],
            image_count=payload["image_count"],
            records=[ImageRecord.from_dict(record) for record in payload["records"]],
            errors=payload.get("errors", []),
        )


@dataclass(frozen=True)
class PlanItem:
    source: str
    destination: str
    operation: str
    category: str
    reason: str
    tags: list[str]
    classification_source: str = "unknown"
    confidence: float = 0.0
    signals: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "PlanItem":
        return cls(
            source=payload["source"],
            destination=payload["destination"],
            operation=payload["operation"],
            category=payload["category"],
            reason=payload["reason"],
            tags=payload.get("tags", []),
            classification_source=payload.get("classification_source", "unknown"),
            confidence=payload.get("confidence", 0.0),
            signals=payload.get("signals", {}),
        )


@dataclass(frozen=True)
class OrganizationPlan:
    version: int
    created_at: str
    source_root: str
    target_root: str
    mode: str
    oled_black_threshold: float
    items: list[PlanItem]
    skipped: list[dict[str, str]]
    discovery_min_count: int = 2
    vision_profile: str = "off"
    vision_min_confidence: float = 0.72

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "created_at": self.created_at,
            "source_root": self.source_root,
            "target_root": self.target_root,
            "mode": self.mode,
            "oled_black_threshold": self.oled_black_threshold,
            "discovery_min_count": self.discovery_min_count,
            "vision_profile": self.vision_profile,
            "vision_min_confidence": self.vision_min_confidence,
            "items": [item.to_dict() for item in self.items],
            "skipped": self.skipped,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "OrganizationPlan":
        return cls(
            version=payload["version"],
            created_at=payload["created_at"],
            source_root=payload["source_root"],
            target_root=payload["target_root"],
            mode=payload["mode"],
            oled_black_threshold=payload.get(
                "oled_black_threshold",
                payload.get("oled_threshold", 65),
            ),
            discovery_min_count=payload.get("discovery_min_count", 2),
            vision_profile=payload.get("vision_profile", "off"),
            vision_min_confidence=payload.get("vision_min_confidence", 0.72),
            items=[PlanItem.from_dict(item) for item in payload["items"]],
            skipped=payload.get("skipped", []),
        )
