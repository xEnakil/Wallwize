from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageOps


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def average_hash(image: Image.Image) -> str:
    grayscale = ImageOps.grayscale(image).resize((8, 8), Image.Resampling.LANCZOS)
    values = list(image_pixels(grayscale))
    average = sum(values) / len(values)
    bits = "".join("1" if value >= average else "0" for value in values)
    return f"{int(bits, 2):016x}"


def hamming_distance(left_hash: str, right_hash: str) -> int:
    left = int(left_hash, 16)
    right = int(right_hash, 16)
    return (left ^ right).bit_count()


def image_pixels(image: Image.Image):
    if hasattr(image, "get_flattened_data"):
        return image.get_flattened_data()
    return image.getdata()

