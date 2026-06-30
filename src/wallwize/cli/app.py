from __future__ import annotations

import argparse
import sys
from pathlib import Path

from wallwize.domain.policies import (
    DEFAULT_DISCOVERY_MIN_COUNT,
    DEFAULT_OLED_BLACK_THRESHOLD,
    DEFAULT_VISION_MIN_CONFIDENCE,
    DEFAULT_VISION_PROFILE,
)
from wallwize.classification.vision import VISION_PROFILE_CHOICES, list_vision_profiles
from wallwize.planning.applier import apply_plan
from wallwize.planning.plan_builder import build_plan
from wallwize.planning.summary import summarize_index, summarize_plan
from wallwize.sample import create_sample_wallpapers
from wallwize.services.scanner import scan_folder
from wallwize.storage.json_store import read_index, read_plan, write_index, write_plan


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("Cancelled.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="wallwize",
        description="Local-first wallpaper analysis and organization.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan = subparsers.add_parser("scan", help="Analyze a wallpaper folder.")
    scan.add_argument("source", type=Path, help="Folder containing wallpapers.")
    scan.add_argument("-o", "--output", type=Path, default=Path("wallwize-index.json"))
    scan.set_defaults(func=cmd_scan)

    report = subparsers.add_parser("report", help="Print a summary from an index.")
    report.add_argument("index", type=Path)
    add_policy_args(report)
    report.set_defaults(func=cmd_report)

    plan = subparsers.add_parser("plan", help="Create a safe organization plan.")
    plan.add_argument("index", type=Path)
    plan.add_argument("target", type=Path, help="Folder where organized wallpapers go.")
    plan.add_argument("-o", "--output", type=Path, default=Path("wallwize-plan.json"))
    plan.add_argument("--mode", choices=["copy", "move"], default="copy")
    add_policy_args(plan)
    plan.set_defaults(func=cmd_plan)

    apply = subparsers.add_parser("apply", help="Dry-run or execute a plan.")
    apply.add_argument("plan", type=Path)
    apply.add_argument("--execute", action="store_true", help="Actually copy or move files.")
    apply.add_argument("--on-conflict", choices=["skip", "rename"], default="skip")
    apply.set_defaults(func=cmd_apply)

    sample = subparsers.add_parser("sample", help="Create local sample wallpapers.")
    sample.add_argument("target", type=Path)
    sample.set_defaults(func=cmd_sample)

    profiles = subparsers.add_parser(
        "vision-profiles",
        help="List local AI vision profiles available to the planner.",
    )
    profiles.set_defaults(func=cmd_vision_profiles)

    return parser


def add_policy_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--oled-black-threshold",
        "--oled-threshold",
        type=float,
        default=DEFAULT_OLED_BLACK_THRESHOLD,
        help="Minimum pure black pixel percentage for the OLED folder.",
    )
    parser.add_argument(
        "--discovery-min-count",
        type=int,
        default=DEFAULT_DISCOVERY_MIN_COUNT,
        help="Minimum repeated filename pattern count for discovered genre folders.",
    )
    parser.add_argument(
        "--vision-profile",
        choices=VISION_PROFILE_CHOICES,
        default=DEFAULT_VISION_PROFILE,
        help="Local AI vision model profile to use while planning.",
    )
    parser.add_argument(
        "--vision-min-confidence",
        type=float,
        default=DEFAULT_VISION_MIN_CONFIDENCE,
        help="Minimum AI score needed before vision can route a wallpaper.",
    )
    parser.add_argument(
        "--vision-cache-dir",
        type=str,
        default=None,
        help="Directory for downloaded or packaged local model files.",
    )
    parser.add_argument(
        "--vision-node-bin",
        type=str,
        default=None,
        help="Path to Node.js binary for the Transformers.js backend.",
    )
    parser.add_argument(
        "--vision-local-only",
        action="store_true",
        help="Use only packaged/cached model files; do not download from Hugging Face.",
    )


def cmd_scan(args: argparse.Namespace) -> int:
    source = args.source.resolve()
    if not source.exists() or not source.is_dir():
        raise ValueError(f"source folder does not exist: {source}")
    index = scan_folder(source)
    write_index(args.output, index)
    print(f"Scanned {index.image_count} images from {source}")
    if index.errors:
        print(f"Skipped {len(index.errors)} unreadable files")
    print(f"Wrote {args.output.resolve()}")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    index = read_index(args.index)
    summary = summarize_index(
        index,
        oled_black_threshold=args.oled_black_threshold,
        discovery_min_count=args.discovery_min_count,
    )
    print(f"Images: {summary['image_count']}")
    print(f"Errors: {summary['error_count']}")
    print(
        "OLED candidates: "
        f"{summary['oled_candidate_count']} "
        f"(pure black >= {summary['oled_black_threshold']}%)"
    )
    print(f"Average dark score: {summary['average_dark_score']}")
    print(f"Exact duplicate extras: {summary['exact_duplicate_extra_files']}")
    print(f"Similar hash groups: {summary['similar_hash_groups']}")
    _print_counter("Top tags", summary["top_tags"])
    _print_counter("Discovered genres", summary["discovered_genres"])
    _print_counter("Aspect ratios", summary["aspect_counts"])
    _print_counter("Dominant colors", summary["dominant_colors"])
    return 0


def cmd_plan(args: argparse.Namespace) -> int:
    index = read_index(args.index)
    plan = build_plan(
        index=index,
        target_root=args.target,
        mode=args.mode,
        oled_black_threshold=args.oled_black_threshold,
        discovery_min_count=args.discovery_min_count,
        vision_profile=args.vision_profile,
        vision_min_confidence=args.vision_min_confidence,
        vision_cache_dir=args.vision_cache_dir,
        vision_node_bin=args.vision_node_bin,
        vision_local_only=args.vision_local_only,
    )
    write_plan(args.output, plan)
    summary = summarize_plan(plan)
    print(f"Planned {summary['item_count']} {summary['operation']} operations")
    print(f"Skipped {summary['skipped_count']} files")
    _print_counter("Destination categories", summary["categories"])
    _print_counter("Classification sources", summary["classification_sources"])
    print(f"Vision profile: {summary['vision_profile']}")
    print(f"Wrote {args.output.resolve()}")
    return 0


def cmd_apply(args: argparse.Namespace) -> int:
    plan = read_plan(args.plan)
    counts = apply_plan(plan, execute=args.execute, on_conflict=args.on_conflict)
    action = "Executed" if args.execute else "Dry run"
    print(f"{action}: {counts['planned']} planned")
    print(f"Copied: {counts['copied']}")
    print(f"Moved: {counts['moved']}")
    print(f"Skipped existing: {counts['skipped']}")
    print(f"Missing sources: {counts['missing']}")
    if not args.execute:
        print("No files changed. Add --execute to perform the plan.")
    return 0


def cmd_sample(args: argparse.Namespace) -> int:
    created = create_sample_wallpapers(args.target)
    print(f"Created {len(created)} sample wallpapers in {args.target.resolve()}")
    for path in created:
        print(path)
    return 0


def cmd_vision_profiles(args: argparse.Namespace) -> int:
    for profile in list_vision_profiles():
        model = profile.model_id or "none"
        dtype = profile.dtype or "none"
        print(f"{profile.name}: {model} ({dtype})")
        print(f"  {profile.description}")
        print(f"  Recommended for: {profile.recommended_for}")
    return 0


def _print_counter(title: str, values: object) -> None:
    print(f"{title}:")
    pairs = list(values)  # type: ignore[arg-type]
    if not pairs:
        print("  none")
        return
    for name, count in pairs:
        print(f"  {name}: {count}")
