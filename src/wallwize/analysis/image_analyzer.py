from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageOps

from wallwize.analysis.colors import (
    color_percentages,
    dominant_colors,
    pixel_metrics,
    visual_tags,
)
from wallwize.analysis.hashing import average_hash, image_pixels, sha256_file
from wallwize.domain.models import ImageRecord
from wallwize.domain.taxonomy import filename_genre_tags

SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
}


class ImageAnalyzer:
    def analyze(self, path: Path, source_root: Path) -> ImageRecord:
        absolute = path.resolve()
        relative = absolute.relative_to(source_root.resolve())
        sha256 = sha256_file(absolute)
        thumbnail_path = ""

        with Image.open(absolute) as image:
            image = ImageOps.exif_transpose(image)
            width, height = image.size
            rgb = image.convert("RGB")
            sample = rgb.resize((96, 96), Image.Resampling.LANCZOS)
            thumbnail_path = create_thumbnail(rgb, sha256)

            pixels = list(image_pixels(sample))
            metrics = pixel_metrics(pixels)
            percentages = color_percentages(pixels)
            dominant = dominant_colors(percentages)
            average = average_hash(rgb)

        filename_tags = filename_genre_tags(path.name, str(relative))
        visual = visual_tags(
            metrics["brightness"],
            metrics["dark_percent"],
            metrics["black_percent"],
            dominant,
            percentages,
        )
        warnings = image_warnings(
            width,
            height,
            metrics["brightness"],
            metrics["black_percent"],
        )
        tags = sorted(set(filename_tags + visual + dominant))

        return ImageRecord(
            absolute_path=str(absolute),
            relative_path=str(relative),
            file_name=path.name,
            extension=path.suffix.lower(),
            size_bytes=path.stat().st_size,
            sha256=sha256,
            average_hash=average,
            width=width,
            height=height,
            aspect_label=aspect_label(width, height),
            brightness=round(metrics["brightness"], 2),
            dark_percent=round(metrics["dark_percent"], 2),
            black_percent=round(metrics["black_percent"], 2),
            oled_score=metrics["oled_score"],
            dominant_colors=dominant,
            color_percentages=percentages,
            tags=tags,
            filename_tags=filename_tags,
            visual_tags=visual,
            thumbnail_path=thumbnail_path,
            warnings=warnings,
        )


def iter_image_paths(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def create_thumbnail(image: Image.Image, cache_key: str) -> str:
    thumbnail_root = os.environ.get("WALLWIZE_THUMBNAIL_DIR")
    if not thumbnail_root:
        return ""

    destination = Path(thumbnail_root) / f"{cache_key}.jpg"
    if destination.exists():
        return str(destination)

    destination.parent.mkdir(parents=True, exist_ok=True)
    thumbnail = image.copy()
    thumbnail.thumbnail((520, 300), Image.Resampling.LANCZOS)
    thumbnail.save(destination, "JPEG", quality=76, optimize=True)
    return str(destination)


def aspect_label(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "unknown"
    ratio = width / height
    if ratio < 0.8:
        return "portrait"
    if math.isclose(ratio, 1.0, rel_tol=0.08):
        return "square"
    if 1.2 <= ratio < 1.55:
        return "standard"
    if 1.55 <= ratio < 2.0:
        return "widescreen"
    if ratio >= 2.0:
        return "ultrawide"
    return "other"


def image_warnings(
    width: int,
    height: int,
    brightness: float,
    black_percent: float,
) -> list[str]:
    warnings: list[str] = []
    if width < 1280 or height < 720:
        warnings.append("small-resolution")
    if brightness >= 205:
        warnings.append("very-bright")
    if black_percent <= 3 and brightness >= 165:
        warnings.append("not-oled-friendly")
    return warnings
