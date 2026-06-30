from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from wallwize.domain.models import ImageRecord


@dataclass(frozen=True)
class VisionCandidate:
    category_id: str
    folder_name: str
    prompt: str
    score: float


@dataclass(frozen=True)
class VisionResult:
    image_path: str
    profile: str
    model_id: str
    candidates: tuple[VisionCandidate, ...]
    error: str | None = None

    @property
    def top(self) -> VisionCandidate | None:
        return self.candidates[0] if self.candidates else None

    def to_signal(self) -> dict[str, object]:
        top = self.top
        return {
            "profile": self.profile,
            "model_id": self.model_id,
            "error": self.error,
            "top_category": top.folder_name if top else None,
            "top_score": round(top.score, 4) if top else None,
            "top_prompt": top.prompt if top else None,
            "candidates": [
                {
                    "category": candidate.folder_name,
                    "score": round(candidate.score, 4),
                    "prompt": candidate.prompt,
                }
                for candidate in self.candidates[:5]
            ],
        }


class VisionClassifier(Protocol):
    def classify_batch(
        self,
        records: list[ImageRecord],
        extra_labels: dict[str, str] | None = None,
    ) -> dict[str, VisionResult]:
        """Return vision results keyed by ImageRecord.absolute_path."""

