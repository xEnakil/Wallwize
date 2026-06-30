from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from PIL import UnidentifiedImageError

from wallwize.analysis.image_analyzer import ImageAnalyzer, iter_image_paths
from wallwize.domain.models import ScanIndex


class ScanService:
    def __init__(self, analyzer: ImageAnalyzer | None = None) -> None:
        self._analyzer = analyzer or ImageAnalyzer()

    def scan(self, source_root: Path) -> ScanIndex:
        source_root = source_root.resolve()
        records = []
        errors: list[dict[str, str]] = []

        for path in iter_image_paths(source_root):
            try:
                records.append(self._analyzer.analyze(path, source_root))
            except (OSError, UnidentifiedImageError, ValueError) as exc:
                errors.append({"path": str(path), "error": str(exc)})

        return ScanIndex(
            version=2,
            source_root=str(source_root),
            created_at=datetime.now(timezone.utc).isoformat(),
            image_count=len(records),
            records=records,
            errors=errors,
        )


def scan_folder(source_root: Path) -> ScanIndex:
    return ScanService().scan(source_root)
