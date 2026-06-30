from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VisionModelProfile:
    name: str
    model_id: str
    dtype: str
    description: str
    recommended_for: str


VISION_PROFILES: dict[str, VisionModelProfile] = {
    "off": VisionModelProfile(
        name="off",
        model_id="",
        dtype="",
        description="Disable AI vision and use local rules only.",
        recommended_for="fast scans, tests, and machines without the model package",
    ),
    "small": VisionModelProfile(
        name="small",
        model_id="Xenova/clip-vit-base-patch32",
        dtype="q8",
        description="Smallest robust CLIP profile for local zero-shot routing.",
        recommended_for="default packaged app mode",
    ),
    "balanced": VisionModelProfile(
        name="balanced",
        model_id="Xenova/clip-vit-base-patch16",
        dtype="q8",
        description="Better visual detail than small, slower and larger.",
        recommended_for="users who want stronger classification",
    ),
    "large": VisionModelProfile(
        name="large",
        model_id="Xenova/clip-vit-large-patch14",
        dtype="q8",
        description="Highest-accuracy CLIP profile, largest and slowest.",
        recommended_for="power users and final library cleanup passes",
    ),
}

VISION_PROFILE_CHOICES = tuple(VISION_PROFILES)


def get_vision_profile(name: str) -> VisionModelProfile:
    try:
        return VISION_PROFILES[name]
    except KeyError as exc:
        choices = ", ".join(VISION_PROFILE_CHOICES)
        raise ValueError(f"unknown vision profile '{name}'. Choose one of: {choices}") from exc


def list_vision_profiles() -> list[VisionModelProfile]:
    return [VISION_PROFILES[name] for name in VISION_PROFILE_CHOICES]

