from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from wallwize.domain.models import OrganizationPlan, ScanIndex


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(payload, indent=2, sort_keys=True)
    temp_name = ""
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            delete=False,
            dir=path.parent,
            encoding="utf-8",
            suffix=".tmp",
        ) as temp_file:
            temp_file.write(content)
            temp_file.write("\n")
            temp_name = temp_file.name
        os.replace(temp_name, path)
    finally:
        if temp_name and Path(temp_name).exists():
            Path(temp_name).unlink()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_index(path: Path, index: ScanIndex) -> None:
    write_json(path, index.to_dict())


def read_index(path: Path) -> ScanIndex:
    return ScanIndex.from_dict(read_json(path))


def write_plan(path: Path, plan: OrganizationPlan) -> None:
    write_json(path, plan.to_dict())


def read_plan(path: Path) -> OrganizationPlan:
    return OrganizationPlan.from_dict(read_json(path))
