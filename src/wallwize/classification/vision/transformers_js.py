from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

from wallwize.classification.vision.base import (
    VisionCandidate,
    VisionClassifier,
    VisionResult,
)
from wallwize.classification.vision.labels import VisionPrompt, build_vision_prompts
from wallwize.classification.vision.profiles import VisionModelProfile
from wallwize.domain.models import ImageRecord


class TransformersJsVisionClassifier(VisionClassifier):
    def __init__(
        self,
        profile: VisionModelProfile,
        cache_dir: str | None = None,
        node_bin: str | None = None,
        local_only: bool = False,
        timeout_seconds: int = 1800,
    ) -> None:
        self._profile = profile
        self._cache_dir = cache_dir or str(Path(".wallwize") / "models")
        self._node_bin = node_bin
        self._local_only = local_only
        self._timeout_seconds = timeout_seconds

    def classify_batch(
        self,
        records: list[ImageRecord],
        extra_labels: dict[str, str] | None = None,
    ) -> dict[str, VisionResult]:
        if not records:
            return {}

        prompts = build_vision_prompts(extra_labels)
        prompt_by_text = {prompt.prompt: prompt for prompt in prompts}
        payload = {
            "profile": self._profile.name,
            "modelId": self._profile.model_id,
            "dtype": self._profile.dtype,
            "cacheDir": self._cache_dir,
            "localOnly": self._local_only,
            "labels": [prompt.prompt for prompt in prompts],
            "images": [
                {"path": record.absolute_path, "fileName": record.file_name}
                for record in records
            ],
        }

        output = self._run_node(payload)
        results: dict[str, VisionResult] = {}
        for item in output.get("results", []):
            image_path = item["path"]
            candidates = self._aggregate_candidates(item.get("labels", []), prompt_by_text)
            results[image_path] = VisionResult(
                image_path=image_path,
                profile=self._profile.name,
                model_id=self._profile.model_id,
                candidates=tuple(candidates),
                error=item.get("error"),
            )
        return results

    def _run_node(self, payload: dict[str, object]) -> dict[str, object]:
        node_bin = self._resolve_node_bin()
        runner = Path(__file__).with_name("transformers_runner.mjs")
        process = subprocess.run(
            [node_bin, str(runner)],
            input=json.dumps(payload).encode("utf-8"),
            capture_output=True,
            timeout=self._timeout_seconds,
            env={**os.environ, "NODE_NO_WARNINGS": "1"},
        )
        stdout = process.stdout.decode("utf-8", errors="replace")
        stderr = process.stderr.decode("utf-8", errors="replace")
        if process.returncode != 0:
            message = stderr.strip() or stdout.strip()
            raise RuntimeError(
                "local vision backend failed. Run `npm install` in the project root "
                f"and try again. Details: {message}"
            )
        try:
            return json.loads(stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"local vision backend returned invalid JSON: {stdout}") from exc

    def _resolve_node_bin(self) -> str:
        if self._node_bin:
            return self._node_bin
        env_node = os.environ.get("WALLWIZE_NODE_BIN")
        if env_node:
            return env_node
        resolved = shutil.which("node")
        if resolved:
            return resolved
        raise RuntimeError(
            "Node.js is required for local vision. Install Node.js, set WALLWIZE_NODE_BIN, "
            "or pass --vision-node-bin."
        )

    def _aggregate_candidates(
        self,
        labels: list[dict[str, object]],
        prompt_by_text: dict[str, VisionPrompt],
    ) -> list[VisionCandidate]:
        best_by_category: dict[str, VisionCandidate] = {}
        for label in labels:
            prompt_text = str(label.get("label", ""))
            prompt = prompt_by_text.get(prompt_text)
            if prompt is None:
                continue
            score = float(label.get("score", 0.0))
            candidate = VisionCandidate(
                category_id=prompt.category_id,
                folder_name=prompt.folder_name,
                prompt=prompt.prompt,
                score=score,
            )
            current = best_by_category.get(candidate.category_id)
            if current is None or candidate.score > current.score:
                best_by_category[candidate.category_id] = candidate

        return sorted(
            best_by_category.values(),
            key=lambda candidate: candidate.score,
            reverse=True,
        )
