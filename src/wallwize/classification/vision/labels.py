from __future__ import annotations

from dataclasses import dataclass

from wallwize.domain.taxonomy import GENRE_BY_ID, GENRE_PRIORITY


@dataclass(frozen=True)
class VisionPrompt:
    category_id: str
    folder_name: str
    prompt: str


PROMPTS_BY_CATEGORY: dict[str, tuple[str, ...]] = {
    "anime": (
        "anime wallpaper",
        "manga character illustration wallpaper",
        "Japanese anime character art",
    ),
    "superhero": (
        "superhero wallpaper",
        "comic book hero wallpaper",
        "masked superhero character art",
    ),
    "abstract": (
        "abstract wallpaper",
        "geometric abstract digital art",
        "colorful abstract pattern wallpaper",
    ),
    "minimalism": (
        "minimalist wallpaper",
        "simple minimal clean wallpaper",
        "minimal abstract wallpaper",
    ),
    "nature": (
        "nature landscape wallpaper",
        "forest mountain ocean landscape",
        "scenic outdoor natural wallpaper",
    ),
    "space": (
        "space wallpaper",
        "galaxy nebula planet wallpaper",
        "outer space stars wallpaper",
    ),
    "games": (
        "video game wallpaper",
        "gaming character wallpaper",
        "fantasy game scene wallpaper",
    ),
    "vehicles": (
        "car wallpaper",
        "sports car vehicle wallpaper",
        "motorcycle or automobile wallpaper",
    ),
    "cities": (
        "city skyline wallpaper",
        "urban street city wallpaper",
        "night city wallpaper",
    ),
    "fantasy": (
        "fantasy wallpaper",
        "magic castle dragon fantasy art",
        "medieval fantasy scene wallpaper",
    ),
    "sci-fi": (
        "science fiction wallpaper",
        "spaceship robot futuristic wallpaper",
        "sci fi technology scene wallpaper",
    ),
    "cyberpunk": (
        "cyberpunk wallpaper",
        "neon futuristic city wallpaper",
        "dark cyberpunk street wallpaper",
    ),
    "movies-tv": (
        "movie wallpaper",
        "television series character wallpaper",
        "cinematic film poster wallpaper",
    ),
    "music": (
        "music wallpaper",
        "band concert album art wallpaper",
        "musician instrument wallpaper",
    ),
    "sports": (
        "sports wallpaper",
        "football basketball racing sports wallpaper",
        "athlete action wallpaper",
    ),
    "architecture": (
        "architecture wallpaper",
        "building interior architecture wallpaper",
        "beautiful architectural structure wallpaper",
    ),
    "technology": (
        "technology wallpaper",
        "computer circuit code wallpaper",
        "digital technology abstract wallpaper",
    ),
    "retro": (
        "retro wallpaper",
        "vintage 80s 90s style wallpaper",
        "pixel art retro wallpaper",
    ),
}


def build_vision_prompts(extra_labels: dict[str, str] | None = None) -> list[VisionPrompt]:
    prompts: list[VisionPrompt] = []
    for category_id in GENRE_PRIORITY:
        genre = GENRE_BY_ID[category_id]
        for prompt in PROMPTS_BY_CATEGORY.get(category_id, (f"{genre.label} wallpaper",)):
            prompts.append(VisionPrompt(category_id, genre.label, prompt))

    for category_id, folder_name in (extra_labels or {}).items():
        prompts.append(
            VisionPrompt(
                category_id=category_id,
                folder_name=folder_name,
                prompt=f"{folder_name} wallpaper",
            )
        )

    return prompts

