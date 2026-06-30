from __future__ import annotations

from pathlib import Path


def unique_destination(destination: Path, used: set[Path]) -> Path:
    if destination not in used:
        return destination
    return next_available_path(destination, used)


def next_available_path(destination: Path, used: set[Path] | None = None) -> Path:
    used = used or set()
    stem = destination.stem
    suffix = destination.suffix
    parent = destination.parent
    counter = 2
    while True:
        candidate = parent / f"{stem} ({counter}){suffix}"
        if candidate not in used and not candidate.exists():
            return candidate
        counter += 1

