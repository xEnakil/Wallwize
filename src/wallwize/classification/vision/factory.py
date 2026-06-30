from __future__ import annotations

from wallwize.classification.vision.base import VisionClassifier
from wallwize.classification.vision.profiles import get_vision_profile
from wallwize.classification.vision.transformers_js import TransformersJsVisionClassifier
from wallwize.domain.policies import OrganizationPolicy


def create_vision_classifier(policy: OrganizationPolicy) -> VisionClassifier | None:
    profile = get_vision_profile(policy.vision_profile)
    if profile.name == "off":
        return None
    return TransformersJsVisionClassifier(
        profile=profile,
        cache_dir=policy.vision_cache_dir,
        node_bin=policy.vision_node_bin,
        local_only=policy.vision_local_only,
    )

