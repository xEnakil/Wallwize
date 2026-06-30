from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from wallwize.classification import DiscoveryCatalog, WallpaperRouter
from wallwize.classification.vision import VisionClassifier, create_vision_classifier
from wallwize.classification.vision import VisionResult
from wallwize.domain.models import ImageRecord, OrganizationPlan, PlanItem, ScanIndex
from wallwize.domain.policies import DEFAULT_POLICY, OrganizationPolicy
from wallwize.planning.duplicates import duplicate_paths_to_skip, similar_hashes
from wallwize.planning.paths import unique_destination


class PlanBuilder:
    def __init__(
        self,
        policy: OrganizationPolicy = DEFAULT_POLICY,
        vision_classifier: VisionClassifier | None = None,
    ) -> None:
        policy.validate()
        self._policy = policy
        self._vision_classifier = vision_classifier

    def build(self, index: ScanIndex, target_root: Path, mode: str = "copy") -> OrganizationPlan:
        if mode not in {"copy", "move"}:
            raise ValueError("mode must be copy or move")

        target_root = target_root.resolve()
        used_destinations: set[Path] = set()
        items: list[PlanItem] = []
        skipped: list[dict[str, str]] = []
        duplicate_paths = duplicate_paths_to_skip(index.records)
        similar = similar_hashes(index.records)
        discovery = DiscoveryCatalog.build(index.records, self._policy.discovery_min_count)
        records_for_routing = [
            record for record in index.records if record.absolute_path not in duplicate_paths
        ]
        vision_results = self._classify_with_vision(
            records_for_routing,
            discovered_vision_labels(discovery),
        )
        router = WallpaperRouter(self._policy, discovery, vision_results)

        for record in index.records:
            if record.absolute_path in duplicate_paths:
                skipped.append(
                    {
                        "source": record.absolute_path,
                        "reason": "exact duplicate",
                        "sha256": record.sha256,
                    }
                )
                continue

            route = router.route(record)
            destination = unique_destination(
                target_root / route.folder_name / record.file_name,
                used_destinations,
            )
            used_destinations.add(destination)

            reason_parts = [route.reason, f"dark score {record.oled_score}"]
            if not route.is_oled:
                reason_parts.insert(1, f"pure black pixels {record.black_percent:.1f}%")
            if record.dominant_colors:
                reason_parts.append("colors " + ", ".join(record.dominant_colors[:3]))
            if record.average_hash in similar:
                reason_parts.append("similar image group detected")
            signals = {}
            vision_result = vision_results.get(record.absolute_path)
            if vision_result:
                signals["vision"] = vision_result.to_signal()

            items.append(
                PlanItem(
                    source=record.absolute_path,
                    destination=str(destination),
                    operation=mode,
                    category=route.folder_name,
                    reason="; ".join(reason_parts),
                    tags=record.tags,
                    classification_source=route.source,
                    confidence=route.confidence,
                    signals=signals,
                )
            )

        return OrganizationPlan(
            version=1,
            created_at=datetime.now(timezone.utc).isoformat(),
            source_root=index.source_root,
            target_root=str(target_root),
            mode=mode,
            oled_black_threshold=self._policy.oled_black_threshold,
            discovery_min_count=self._policy.discovery_min_count,
            vision_profile=self._policy.vision_profile,
            vision_min_confidence=self._policy.vision_min_confidence,
            items=items,
            skipped=skipped,
        )

    def _classify_with_vision(
        self,
        records: list[ImageRecord],
        extra_labels: dict[str, str],
    ) -> dict[str, VisionResult]:
        classifier = self._vision_classifier
        if classifier is None:
            classifier = create_vision_classifier(self._policy)
        if classifier is None:
            return {}
        return classifier.classify_batch(records, extra_labels=extra_labels)


def discovered_vision_labels(discovery: DiscoveryCatalog) -> dict[str, str]:
    return {
        item.label.lower().replace(" ", "-"): item.label
        for item in discovery.top_candidates(limit=24)
    }


def build_plan(
    index: ScanIndex,
    target_root: Path,
    mode: str = "copy",
    oled_black_threshold: float = DEFAULT_POLICY.oled_black_threshold,
    discovery_min_count: int = DEFAULT_POLICY.discovery_min_count,
    vision_profile: str = DEFAULT_POLICY.vision_profile,
    vision_min_confidence: float = DEFAULT_POLICY.vision_min_confidence,
    vision_cache_dir: str | None = DEFAULT_POLICY.vision_cache_dir,
    vision_node_bin: str | None = DEFAULT_POLICY.vision_node_bin,
    vision_local_only: bool = DEFAULT_POLICY.vision_local_only,
) -> OrganizationPlan:
    policy = OrganizationPolicy(
        oled_black_threshold=oled_black_threshold,
        discovery_min_count=discovery_min_count,
        vision_profile=vision_profile,
        vision_min_confidence=vision_min_confidence,
        vision_cache_dir=vision_cache_dir,
        vision_node_bin=vision_node_bin,
        vision_local_only=vision_local_only,
    )
    return PlanBuilder(policy).build(index, target_root, mode)
