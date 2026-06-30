from __future__ import annotations

from dataclasses import replace
import shutil
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from wallwize.classification.vision import MockVisionClassifier
from wallwize.classification.vision import VisionResult
from wallwize.domain.models import ImageRecord
from wallwize.domain.policies import OrganizationPolicy
from wallwize.planning.applier import apply_plan
from wallwize.planning.duplicates import similar_hash_groups, similar_hashes
from wallwize.planning.plan_builder import PlanBuilder
from wallwize.planning.plan_builder import build_plan
from wallwize.services.scanner import scan_folder


def image_record(name: str, sha256: str, average_hash: str) -> ImageRecord:
    return ImageRecord(
        absolute_path=f"/wallpapers/{name}",
        relative_path=name,
        file_name=name,
        extension=Path(name).suffix,
        size_bytes=100,
        sha256=sha256,
        average_hash=average_hash,
        width=1920,
        height=1080,
        aspect_label="widescreen",
        brightness=100,
        dark_percent=10,
        black_percent=0,
        oled_score=20,
        dominant_colors=["blue"],
        color_percentages={"blue": 100},
        tags=[],
        filename_tags=[],
        visual_tags=[],
    )


class CapturingVisionClassifier:
    def __init__(self) -> None:
        self.extra_labels: dict[str, str] = {}

    def classify_batch(
        self,
        records: list[ImageRecord],
        extra_labels: dict[str, str] | None = None,
    ) -> dict[str, VisionResult]:
        self.extra_labels = extra_labels or {}
        return {}


class WallwizeTests(unittest.TestCase):
    def test_scan_and_plan_keep_one_copy_of_exact_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            anime = root / "anime_dark_blue.png"
            superhero = root / "bright_superhero_red.png"
            duplicate = root / "z_duplicate_anime_dark_blue.png"

            Image.new("RGB", (1280, 720), (4, 8, 16)).save(anime)
            Image.new("RGB", (1280, 720), (240, 40, 45)).save(superhero)
            shutil.copy2(anime, duplicate)

            index = scan_folder(root)
            plan = build_plan(index, Path(temp) / "sorted")

            self.assertEqual(index.image_count, 3)
            self.assertEqual(len(plan.items), 2)
            self.assertEqual(len(plan.skipped), 1)
            self.assertEqual(plan.skipped[0]["reason"], "exact duplicate")
            self.assertEqual(
                sorted(item.category for item in plan.items),
                ["Anime", "Superhero"],
            )

    def test_dark_but_not_black_heavy_image_uses_genre_folder(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            anime = root / "anime_dark_blue.png"
            Image.new("RGB", (1280, 720), (20, 26, 50)).save(anime)

            index = scan_folder(root)
            plan = build_plan(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 1)
            self.assertEqual(plan.items[0].category, "Anime")
            self.assertEqual(
                Path(plan.items[0].destination).parts[-2:],
                ("Anime", "anime_dark_blue.png"),
            )

    def test_pure_black_heavy_image_uses_oled_folder(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            anime = root / "anime_black_wallpaper.png"
            Image.new("RGB", (1280, 720), (0, 0, 0)).save(anime)

            index = scan_folder(root)
            plan = build_plan(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 1)
            self.assertEqual(plan.items[0].category, "OLED")
            self.assertEqual(
                Path(plan.items[0].destination).parts[-2:],
                ("OLED", "anime_black_wallpaper.png"),
            )

    def test_repeated_unknown_filename_pattern_becomes_discovered_genre(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            Image.new("RGB", (1280, 720), (74, 52, 96)).save(root / "samurai_moon_01.png")
            Image.new("RGB", (1280, 720), (84, 60, 104)).save(root / "samurai_moon_02.png")

            index = scan_folder(root)
            plan = build_plan(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 2)
            self.assertEqual({item.category for item in plan.items}, {"Samurai Moon"})
            self.assertEqual(
                {item.classification_source for item in plan.items},
                {"local-discovery"},
            )

    def test_confident_vision_result_routes_random_filename(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            image = root / "wallpaper_001.png"
            Image.new("RGB", (1280, 720), (80, 140, 80)).save(image)

            index = scan_folder(root)
            builder = PlanBuilder(
                OrganizationPolicy(vision_profile="small", vision_min_confidence=0.34),
                vision_classifier=MockVisionClassifier(
                    {"wallpaper_001.png": ("nature", "Nature", 0.87)}
                ),
            )
            plan = builder.build(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 1)
            self.assertEqual(plan.items[0].category, "Nature")
            self.assertEqual(plan.items[0].classification_source, "local-vision")
            self.assertGreater(plan.items[0].confidence, 0.8)
            self.assertEqual(
                plan.items[0].signals["vision"]["top_category"],
                "Nature",
            )

    def test_low_confidence_vision_does_not_override_known_filename(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            image = root / "anime_wallpaper.png"
            Image.new("RGB", (1280, 720), (80, 90, 130)).save(image)

            index = scan_folder(root)
            builder = PlanBuilder(
                OrganizationPolicy(vision_profile="small", vision_min_confidence=0.50),
                vision_classifier=MockVisionClassifier(
                    {
                        "anime_wallpaper.png": [
                            ("nature", "Nature", 0.42),
                            ("abstract", "Abstract", 0.41),
                        ]
                    }
                ),
            )
            plan = builder.build(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 1)
            self.assertEqual(plan.items[0].category, "Anime")
            self.assertEqual(plan.items[0].classification_source, "known-taxonomy")

    def test_plausible_low_confidence_vision_routes_category_but_stays_reviewable(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            image = root / "wallpaper_002.png"
            Image.new("RGB", (1280, 720), (30, 32, 50)).save(image)

            index = scan_folder(root)
            builder = PlanBuilder(
                OrganizationPolicy(vision_profile="small", vision_min_confidence=0.72),
                vision_classifier=MockVisionClassifier(
                    {
                        "wallpaper_002.png": [
                            ("cyberpunk", "Cyberpunk", 0.33),
                            ("movies-tv", "Movies TV", 0.03),
                        ]
                    }
                ),
            )
            plan = builder.build(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 1)
            self.assertEqual(plan.items[0].category, "Cyberpunk")
            self.assertEqual(plan.items[0].classification_source, "local-vision-suggestion")
            self.assertLess(plan.items[0].confidence, 0.70)

    def test_very_weak_vision_result_stays_needs_review(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            image = root / "wallpaper_003.png"
            Image.new("RGB", (1280, 720), (90, 90, 95)).save(image)

            index = scan_folder(root)
            builder = PlanBuilder(
                OrganizationPolicy(vision_profile="small", vision_min_confidence=0.72),
                vision_classifier=MockVisionClassifier(
                    {
                        "wallpaper_003.png": [
                            ("anime", "Anime", 0.15),
                            ("cyberpunk", "Cyberpunk", 0.07),
                        ]
                    }
                ),
            )
            plan = builder.build(index, Path(temp) / "sorted")

            self.assertEqual(len(plan.items), 1)
            self.assertEqual(plan.items[0].category, "Needs Review")
            self.assertEqual(plan.items[0].classification_source, "vision-low-confidence")

    def test_similar_hash_summary_groups_connected_images(self) -> None:
        records = [
            image_record("a.png", "sha-a", "0000000000000000"),
            image_record("b.png", "sha-b", "0000000000000001"),
            image_record("c.png", "sha-c", "ffffffffffffffff"),
        ]

        groups = similar_hash_groups(records, max_distance=1)

        self.assertEqual(len(groups), 1)
        self.assertEqual({record.file_name for record in groups[0]}, {"a.png", "b.png"})
        self.assertEqual(
            similar_hashes(records, max_distance=1),
            {"0000000000000000", "0000000000000001"},
        )

    def test_discovered_categories_are_available_to_vision_classifier(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            Image.new("RGB", (1280, 720), (74, 52, 96)).save(root / "samurai_moon_01.png")
            Image.new("RGB", (1280, 720), (84, 60, 104)).save(root / "samurai_moon_02.png")

            index = scan_folder(root)
            classifier = CapturingVisionClassifier()
            builder = PlanBuilder(
                OrganizationPolicy(vision_profile="small"),
                vision_classifier=classifier,
            )
            builder.build(index, Path(temp) / "sorted")

            self.assertEqual(classifier.extra_labels, {"samurai-moon": "Samurai Moon"})

    def test_apply_rejects_unknown_operation_even_during_dry_run(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / "wallpapers"
            root.mkdir()

            image = root / "anime_wallpaper.png"
            Image.new("RGB", (1280, 720), (80, 90, 130)).save(image)

            index = scan_folder(root)
            plan = build_plan(index, Path(temp) / "sorted")
            invalid_plan = replace(
                plan,
                items=[replace(plan.items[0], operation="delete")],
            )

            with self.assertRaisesRegex(ValueError, "unknown operation"):
                apply_plan(invalid_plan)


if __name__ == "__main__":
    unittest.main()
