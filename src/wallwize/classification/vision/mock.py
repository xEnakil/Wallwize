from __future__ import annotations

from wallwize.classification.vision.base import (
    VisionCandidate,
    VisionClassifier,
    VisionResult,
)
from wallwize.domain.models import ImageRecord


MockVisionValue = tuple[str, str, float] | list[tuple[str, str, float]]


class MockVisionClassifier(VisionClassifier):
    def __init__(self, results_by_name: dict[str, MockVisionValue]) -> None:
        self._results_by_name = results_by_name

    def classify_batch(
        self,
        records: list[ImageRecord],
        extra_labels: dict[str, str] | None = None,
    ) -> dict[str, VisionResult]:
        results: dict[str, VisionResult] = {}
        for record in records:
            value = self._results_by_name.get(record.file_name)
            if value is None:
                continue
            values = value if isinstance(value, list) else [value]
            results[record.absolute_path] = VisionResult(
                image_path=record.absolute_path,
                profile="mock",
                model_id="mock",
                candidates=tuple(
                    VisionCandidate(
                        category_id=category_id,
                        folder_name=folder_name,
                        prompt=f"{folder_name} wallpaper",
                        score=score,
                    )
                    for category_id, folder_name, score in values
                ),
            )
        return results
