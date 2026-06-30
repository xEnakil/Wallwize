from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class GenreDefinition:
    id: str
    label: str
    keywords: tuple[str, ...]


GENRES: tuple[GenreDefinition, ...] = (
    GenreDefinition(
        "anime",
        "Anime",
        (
            "anime",
            "manga",
            "waifu",
            "naruto",
            "sasuke",
            "one piece",
            "onepiece",
            "bleach",
            "demon slayer",
            "kimetsu",
            "jujutsu",
            "gojo",
            "goku",
            "dragon ball",
            "dbz",
            "attack on titan",
            "aot",
            "chainsaw",
            "evangelion",
            "makima",
            "berserk",
            "guts",
        ),
    ),
    GenreDefinition(
        "superhero",
        "Superhero",
        (
            "superhero",
            "marvel",
            "dc",
            "batman",
            "superman",
            "spiderman",
            "spider man",
            "spider-man",
            "avengers",
            "ironman",
            "iron man",
            "captain america",
            "thor",
            "hulk",
            "deadpool",
            "wolverine",
            "joker",
            "wonder woman",
            "flash",
        ),
    ),
    GenreDefinition(
        "abstract",
        "Abstract",
        (
            "abstract",
            "fractal",
            "pattern",
            "geometric",
            "geometry",
            "shape",
            "shapes",
            "gradient",
            "vaporwave",
            "synthwave",
        ),
    ),
    GenreDefinition(
        "minimalism",
        "Minimalism",
        ("minimal", "minimalism", "minimalist", "simple", "clean", "flat"),
    ),
    GenreDefinition(
        "nature",
        "Nature",
        (
            "nature",
            "forest",
            "mountain",
            "mountains",
            "ocean",
            "sea",
            "lake",
            "river",
            "waterfall",
            "sunset",
            "sunrise",
            "sky",
            "cloud",
            "clouds",
            "landscape",
        ),
    ),
    GenreDefinition(
        "space",
        "Space",
        (
            "space",
            "galaxy",
            "nebula",
            "planet",
            "planets",
            "star",
            "stars",
            "starfield",
            "cosmos",
            "astronaut",
        ),
    ),
    GenreDefinition(
        "games",
        "Games",
        (
            "game",
            "games",
            "gaming",
            "elden ring",
            "dark souls",
            "halo",
            "minecraft",
            "zelda",
            "league of legends",
            "valorant",
            "apex",
            "fortnite",
            "warcraft",
            "doom",
            "witcher",
        ),
    ),
    GenreDefinition(
        "vehicles",
        "Vehicles",
        (
            "car",
            "cars",
            "auto",
            "vehicle",
            "bmw",
            "mercedes",
            "ferrari",
            "lamborghini",
            "porsche",
            "supra",
            "nissan",
            "audi",
            "motorcycle",
            "bike",
        ),
    ),
    GenreDefinition(
        "cities",
        "Cities",
        (
            "city",
            "cities",
            "skyline",
            "street",
            "building",
            "buildings",
            "tokyo",
            "new york",
            "nyc",
            "seoul",
            "night city",
            "urban",
        ),
    ),
    GenreDefinition(
        "fantasy",
        "Fantasy",
        ("fantasy", "magic", "wizard", "dragon", "castle", "medieval", "mythic"),
    ),
    GenreDefinition(
        "sci-fi",
        "Sci Fi",
        ("sci fi", "sci-fi", "scifi", "science fiction", "spaceship", "robot", "mecha"),
    ),
    GenreDefinition(
        "cyberpunk",
        "Cyberpunk",
        ("cyberpunk", "neon", "futuristic", "dystopian", "night city"),
    ),
    GenreDefinition(
        "movies-tv",
        "Movies TV",
        ("movie", "movies", "film", "cinema", "series", "tv", "netflix"),
    ),
    GenreDefinition("music", "Music", ("music", "band", "album", "concert", "guitar")),
    GenreDefinition(
        "sports",
        "Sports",
        ("sport", "sports", "football", "basketball", "soccer", "racing"),
    ),
    GenreDefinition(
        "architecture",
        "Architecture",
        ("architecture", "interior", "house", "room", "temple", "palace"),
    ),
    GenreDefinition(
        "technology",
        "Technology",
        ("technology", "tech", "computer", "circuit", "code", "matrix"),
    ),
    GenreDefinition("retro", "Retro", ("retro", "vintage", "80s", "90s", "pixel")),
)

GENRE_BY_ID = {genre.id: genre for genre in GENRES}
GENRE_LABEL_BY_ID = {genre.id: genre.label for genre in GENRES}
GENRE_PRIORITY = tuple(genre.id for genre in GENRES)


def normalize_search_text(parts: Iterable[str]) -> str:
    raw = " ".join(parts).lower()
    raw = re.sub(r"[_\-.()[\]{}]+", " ", raw)
    raw = re.sub(r"\s+", " ", raw)
    return f" {raw.strip()} "


def filename_genre_tags(file_name: str, relative_path: str) -> list[str]:
    text = normalize_search_text([file_name, relative_path])
    matches: list[str] = []
    for genre in GENRES:
        if any(f" {keyword} " in text for keyword in normalized_genre_keywords(genre.id)):
            matches.append(genre.id)
    return matches


@lru_cache(maxsize=None)
def normalized_genre_keywords(genre_id: str) -> tuple[str, ...]:
    genre = GENRE_BY_ID[genre_id]
    return tuple(normalize_search_text([keyword]).strip() for keyword in genre.keywords)
