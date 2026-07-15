"""Fail a release when its tag and package versions disagree."""

from __future__ import annotations

from pathlib import Path
import re
import sys
import tomllib


ROOT = Path(__file__).resolve().parents[1]


def match_version(text: str, pattern: str, source: str) -> str:
    match = re.search(pattern, text, flags=re.MULTILINE)
    if match is None:
        raise SystemExit(f"Could not read the version from {source}")
    return match.group(1)


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: check_release.py vMAJOR.MINOR.PATCH")

    tag = sys.argv[1]
    project_version = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"][
        "version"
    ]
    cmake_version = match_version(
        (ROOT / "CMakeLists.txt").read_text(),
        r"project\(Rubikoslav VERSION ([0-9]+\.[0-9]+\.[0-9]+)",
        "CMakeLists.txt",
    )
    module_version = match_version(
        (ROOT / "python/rubikoslav/__init__.py").read_text(),
        r'^__version__ = "([0-9]+\.[0-9]+\.[0-9]+)"$',
        "python/rubikoslav/__init__.py",
    )

    expected_tag = f"v{project_version}"
    if len({project_version, cmake_version, module_version}) != 1:
        raise SystemExit(
            "Version mismatch: "
            f"pyproject={project_version}, CMake={cmake_version}, "
            f"module={module_version}"
        )
    if tag != expected_tag:
        raise SystemExit(f"Tag {tag!r} must match package version {expected_tag!r}")

    print(f"Release versions agree: {expected_tag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
