from __future__ import annotations

from collections import Counter

from wallwize.domain.policies import DEFAULT_OLED_BLACK_THRESHOLD


def pixel_metrics(pixels: list[tuple[int, int, int]]) -> dict[str, float | int]:
    luminance_values = [luminance(pixel) for pixel in pixels]
    brightness = sum(luminance_values) / len(luminance_values)
    dark_percent = sum(1 for value in luminance_values if value <= 55) / len(pixels) * 100
    black_percent = sum(1 for pixel in pixels if is_pure_black_pixel(pixel)) / len(pixels) * 100
    dark_score = round(
        (dark_percent * 0.62)
        + (black_percent * 0.28)
        + (max(0.0, 100 - brightness) * 0.10)
    )
    return {
        "brightness": brightness,
        "dark_percent": dark_percent,
        "black_percent": black_percent,
        "oled_score": max(0, min(100, dark_score)),
    }


def color_percentages(pixels: list[tuple[int, int, int]]) -> dict[str, float]:
    labels = [color_label(pixel) for pixel in pixels]
    counts = Counter(labels)
    total = len(labels)
    return {
        color: round((count / total) * 100, 2)
        for color, count in sorted(counts.items())
        if count / total >= 0.01
    }


def dominant_colors(percentages: dict[str, float], limit: int = 3) -> list[str]:
    return [
        color
        for color, _ in sorted(percentages.items(), key=lambda item: item[1], reverse=True)[
            :limit
        ]
        if color != "other"
    ]


def visual_tags(
    brightness: float,
    dark_percent: float,
    black_percent: float,
    dominant: list[str],
    percentages: dict[str, float],
) -> list[str]:
    tags: list[str] = []
    if black_percent >= DEFAULT_OLED_BLACK_THRESHOLD:
        tags.append("oled")
    if brightness <= 45:
        tags.append("dark")
    elif brightness >= 175:
        tags.append("bright")
    if black_percent >= DEFAULT_OLED_BLACK_THRESHOLD:
        tags.append("black-heavy")
    if dark_percent >= 70:
        tags.append("low-light")
    if is_vibrant(percentages):
        tags.append("vibrant")
    if is_muted(percentages):
        tags.append("muted")
    if set(dominant).issubset({"black", "gray", "white"}) and dominant:
        tags.append("monochrome")
    return tags


def color_label(pixel: tuple[int, int, int]) -> str:
    r, g, b = pixel
    luma = luminance(pixel)
    max_channel = max(pixel)
    min_channel = min(pixel)
    chroma = max_channel - min_channel

    if is_pure_black_pixel(pixel):
        return "black"
    if luma >= 230 and chroma <= 20:
        return "white"
    if chroma <= 18:
        return "gray"

    hue = rgb_hue_degrees(r, g, b)
    saturation = 0 if max_channel == 0 else chroma / max_channel

    if saturation < 0.18:
        return "gray"
    if 18 <= hue < 45 and r > 95 and g > 45 and b < 80 and luma < 150:
        return "brown"
    if hue < 15 or hue >= 345:
        return "red"
    if hue < 45:
        return "orange"
    if hue < 70:
        return "yellow"
    if hue < 165:
        return "green"
    if hue < 195:
        return "cyan"
    if hue < 255:
        return "blue"
    if hue < 295:
        return "purple"
    if hue < 345:
        return "pink"
    return "other"


def is_pure_black_pixel(pixel: tuple[int, int, int]) -> bool:
    max_channel = max(pixel)
    min_channel = min(pixel)
    chroma = max_channel - min_channel
    return max_channel <= 18 and chroma <= 8


def rgb_hue_degrees(r: int, g: int, b: int) -> float:
    red = r / 255
    green = g / 255
    blue = b / 255
    high = max(red, green, blue)
    low = min(red, green, blue)
    delta = high - low
    if delta == 0:
        return 0.0
    if high == red:
        hue = 60 * (((green - blue) / delta) % 6)
    elif high == green:
        hue = 60 * (((blue - red) / delta) + 2)
    else:
        hue = 60 * (((red - green) / delta) + 4)
    return hue % 360


def luminance(pixel: tuple[int, int, int]) -> float:
    r, g, b = pixel
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)


def is_vibrant(percentages: dict[str, float]) -> bool:
    colorful = sum(
        percent
        for color, percent in percentages.items()
        if color not in {"black", "white", "gray", "brown", "other"}
    )
    return colorful >= 45


def is_muted(percentages: dict[str, float]) -> bool:
    neutral = sum(
        percent
        for color, percent in percentages.items()
        if color in {"black", "white", "gray", "brown"}
    )
    return neutral >= 80
