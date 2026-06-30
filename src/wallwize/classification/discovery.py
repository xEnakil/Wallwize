from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

from wallwize.domain.models import ImageRecord
from wallwize.domain.taxonomy import GENRE_LABEL_BY_ID

GENERIC_WORDS = {
    "wallpaper",
    "wallpapers",
    "background",
    "desktop",
    "image",
    "picture",
    "photo",
    "art",
    "digital",
    "render",
    "rendered",
    "scene",
    "cool",
    "best",
    "new",
    "copy",
    "final",
    "edited",
    "dark",
    "black",
    "white",
    "gray",
    "grey",
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "cyan",
    "bright",
    "light",
    "hd",
    "uhd",
    "qhd",
    "fhd",
    "fullhd",
    "wide",
    "ultrawide",
    "mobile",
    "phone",
    "monitor",
    "screen",
}

KNOWN_LABELS = {label.lower().replace(" ", "") for label in GENRE_LABEL_BY_ID.values()}


@dataclass(frozen=True)
class DiscoveredGenre:
    label: str
    count: int
    examples: tuple[str, ...]


class DiscoveryCatalog:
    def __init__(self, candidates: dict[str, DiscoveredGenre], min_count: int) -> None:
        self._candidates = candidates
        self._min_count = min_count

    @classmethod
    def build(cls, records: list[ImageRecord], min_count: int) -> "DiscoveryCatalog":
        counts: Counter[str] = Counter()
        examples: dict[str, list[str]] = {}

        for record in records:
            for candidate in filename_candidates(record):
                counts[candidate] += 1
                examples.setdefault(candidate, [])
                if len(examples[candidate]) < 3:
                    examples[candidate].append(record.file_name)

        discovered = {
            label: DiscoveredGenre(label, count, tuple(examples.get(label, ())))
            for label, count in counts.items()
            if count >= min_count
        }
        return cls(discovered, min_count)

    def resolve(self, record: ImageRecord) -> DiscoveredGenre | None:
        parent = parent_folder_candidate(record)
        if parent:
            return DiscoveredGenre(parent, 1, (record.file_name,))

        candidates = filename_candidates(record)
        ranked = sorted(
            (self._candidates[candidate] for candidate in candidates if candidate in self._candidates),
            key=lambda item: (-item.count, item.label),
        )
        return ranked[0] if ranked else None

    def top_candidates(self, limit: int = 10) -> list[DiscoveredGenre]:
        return sorted(
            self._candidates.values(),
            key=lambda item: (-item.count, item.label),
        )[:limit]


def parent_folder_candidate(record: ImageRecord) -> str | None:
    parts = _path_parts(record.relative_path)
    if len(parts) < 2:
        return None
    for folder in reversed(parts[:-1]):
        label = label_from_text(folder)
        if label:
            return label
    return None


def filename_candidates(record: ImageRecord) -> list[str]:
    stem = record.file_name.rsplit(".", 1)[0]
    label = label_from_text(stem)
    return [label] if label else []


def label_from_text(value: str) -> str | None:
    tokens = [
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9]{2,}", value.lower())
        if _is_discoverable_token(token)
    ]
    if not tokens:
        return None
    compact = "".join(tokens)
    if compact in KNOWN_LABELS:
        return None
    if len(tokens) > 3:
        tokens = tokens[:3]
    return " ".join(token.capitalize() for token in tokens)


def _path_parts(relative_path: str) -> list[str]:
    return [part for part in re.split(r"[\\/]+", relative_path) if part]


def _is_discoverable_token(token: str) -> bool:
    if token in GENERIC_WORDS:
        return False
    if token.isdigit():
        return False
    if re.fullmatch(r"\d+[kK]?", token):
        return False
    if len(token) < 3:
        return False
    return True

