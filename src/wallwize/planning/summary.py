from __future__ import annotations

from collections import Counter

from wallwize.classification import DiscoveryCatalog, WallpaperRouter
from wallwize.domain.models import OrganizationPlan, ScanIndex
from wallwize.domain.policies import DEFAULT_POLICY, OrganizationPolicy
from wallwize.planning.duplicates import duplicates_by_sha, similar_hash_groups


def summarize_index(
    index: ScanIndex,
    oled_black_threshold: float = DEFAULT_POLICY.oled_black_threshold,
    discovery_min_count: int = DEFAULT_POLICY.discovery_min_count,
) -> dict[str, object]:
    policy = OrganizationPolicy(
        oled_black_threshold=oled_black_threshold,
        discovery_min_count=discovery_min_count,
    )
    discovery = DiscoveryCatalog.build(index.records, discovery_min_count)
    router = WallpaperRouter(policy, discovery)
    tag_counts = Counter(tag for record in index.records for tag in record.tags)
    aspect_counts = Counter(record.aspect_label for record in index.records)
    color_counts = Counter(
        color for record in index.records for color in record.dominant_colors[:1]
    )
    exact_duplicate_count = sum(
        len(paths) - 1 for paths in duplicates_by_sha(index.records).values()
    )
    similar_group_count = len(similar_hash_groups(index.records))
    oled_count = sum(1 for record in index.records if router.is_oled_candidate(record))
    average_dark = (
        round(sum(record.oled_score for record in index.records) / len(index.records), 1)
        if index.records
        else 0
    )
    return {
        "image_count": index.image_count,
        "error_count": len(index.errors),
        "oled_candidate_count": oled_count,
        "oled_black_threshold": oled_black_threshold,
        "average_dark_score": average_dark,
        "top_tags": tag_counts.most_common(12),
        "aspect_counts": aspect_counts.most_common(),
        "dominant_colors": color_counts.most_common(),
        "exact_duplicate_extra_files": exact_duplicate_count,
        "similar_hash_groups": similar_group_count,
        "discovered_genres": [
            (item.label, item.count) for item in discovery.top_candidates()
        ],
    }


def summarize_plan(plan: OrganizationPlan) -> dict[str, object]:
    category_counts = Counter(item.category for item in plan.items)
    source_counts = Counter(item.classification_source for item in plan.items)
    return {
        "operation": plan.mode,
        "item_count": len(plan.items),
        "skipped_count": len(plan.skipped),
        "categories": category_counts.most_common(),
        "classification_sources": source_counts.most_common(),
        "vision_profile": plan.vision_profile,
    }
