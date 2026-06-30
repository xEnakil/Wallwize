from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


def create_sample_wallpapers(target_dir: Path) -> list[Path]:
    target_dir.mkdir(parents=True, exist_ok=True)
    samples = [
        ("dark_anime_blue.png", (20, 24, 45), (45, 120, 240), "ANIME"),
        ("bright_superhero_red.png", (235, 235, 225), (210, 35, 45), "HERO"),
        ("oled_abstract_green.png", (2, 4, 6), (20, 220, 140), "ABSTRACT"),
        ("nature_sunset_orange.png", (160, 80, 30), (240, 180, 70), "NATURE"),
        ("plain_dark_minimal.png", (8, 8, 10), (90, 90, 95), "MINIMAL"),
        ("samurai_moon_01.png", (74, 52, 96), (220, 190, 120), "SAMURAI"),
        ("samurai_moon_02.png", (84, 60, 104), (230, 200, 140), "SAMURAI"),
    ]
    created: list[Path] = []
    for file_name, background, accent, label in samples:
        path = target_dir / file_name
        image = Image.new("RGB", (1280, 720), background)
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 510, 1280, 720), fill=tuple(max(0, value - 20) for value in background))
        draw.ellipse((430, 170, 850, 590), outline=accent, width=18)
        draw.line((120, 610, 1160, 120), fill=accent, width=12)
        draw.text((52, 48), label, fill=accent)
        image.save(path)
        created.append(path)
    return created
