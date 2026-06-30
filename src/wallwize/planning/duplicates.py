from __future__ import annotations

from collections import defaultdict

from wallwize.analysis.hashing import hamming_distance
from wallwize.domain.models import ImageRecord


def duplicates_by_sha(records: list[ImageRecord]) -> dict[str, list[ImageRecord]]:
    by_hash: dict[str, list[ImageRecord]] = defaultdict(list)
    for record in records:
        by_hash[record.sha256].append(record)
    return {sha: group for sha, group in by_hash.items() if len(group) > 1}


def duplicate_paths_to_skip(records: list[ImageRecord]) -> set[str]:
    duplicate_paths: set[str] = set()
    for group in duplicates_by_sha(records).values():
        sorted_group = sorted(group, key=lambda record: record.relative_path)
        for duplicate in sorted_group[1:]:
            duplicate_paths.add(duplicate.absolute_path)
    return duplicate_paths


def similar_hashes(records: list[ImageRecord], max_distance: int = 6) -> set[str]:
    return {
        record.average_hash
        for group in similar_hash_groups(records, max_distance=max_distance)
        for record in group
    }


def similar_hash_groups(
    records: list[ImageRecord],
    max_distance: int = 6,
) -> list[list[ImageRecord]]:
    parent = list(range(len(records)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left_index: int, right_index: int) -> None:
        left_root = find(left_index)
        right_root = find(right_index)
        if left_root != right_root:
            parent[right_root] = left_root

    for left_index, left in enumerate(records):
        for right_index in range(left_index + 1, len(records)):
            right = records[right_index]
            if hamming_distance(left.average_hash, right.average_hash) <= max_distance:
                union(left_index, right_index)

    groups: dict[int, list[ImageRecord]] = defaultdict(list)
    for index, record in enumerate(records):
        groups[find(index)].append(record)

    return [group for group in groups.values() if len(group) > 1]
