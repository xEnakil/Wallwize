from __future__ import annotations

import shutil
from pathlib import Path

from wallwize.domain.models import OrganizationPlan
from wallwize.planning.paths import next_available_path

ALLOWED_OPERATIONS = {"copy", "move"}


class PlanApplier:
    def apply(
        self,
        plan: OrganizationPlan,
        execute: bool = False,
        on_conflict: str = "skip",
    ) -> dict[str, int]:
        if on_conflict not in {"skip", "rename"}:
            raise ValueError("on_conflict must be skip or rename")
        validate_plan_operations(plan)

        counts = {"planned": 0, "copied": 0, "moved": 0, "skipped": 0, "missing": 0}
        for item in plan.items:
            source = Path(item.source)
            destination = Path(item.destination)
            counts["planned"] += 1

            if not source.exists():
                counts["missing"] += 1
                continue

            final_destination = destination
            if final_destination.exists():
                if on_conflict == "skip":
                    counts["skipped"] += 1
                    continue
                final_destination = next_available_path(destination)

            if not execute:
                continue

            final_destination.parent.mkdir(parents=True, exist_ok=True)
            if item.operation == "copy":
                shutil.copy2(source, final_destination)
                counts["copied"] += 1
            elif item.operation == "move":
                shutil.move(str(source), str(final_destination))
                counts["moved"] += 1
            else:
                raise ValueError(f"unknown operation: {item.operation}")

        return counts


def validate_plan_operations(plan: OrganizationPlan) -> None:
    invalid = sorted(
        {item.operation for item in plan.items if item.operation not in ALLOWED_OPERATIONS}
    )
    if invalid:
        raise ValueError(f"unknown operation: {', '.join(invalid)}")


def apply_plan(
    plan: OrganizationPlan,
    execute: bool = False,
    on_conflict: str = "skip",
) -> dict[str, int]:
    return PlanApplier().apply(plan, execute=execute, on_conflict=on_conflict)
