# Publishing

Rubikoslav publishes compiled Python wheels to PyPI and attaches the same files to a GitHub release.

## One-time PyPI setup

Create a pending trusted publisher for a new PyPI project with these exact values:

| Setting | Value |
| --- | --- |
| PyPI project | `rubikoslav` |
| GitHub owner | `unnobatroo` |
| Repository | `rubikoslav` |
| Workflow | `release.yml` |
| Environment | `pypi` |

Trusted publishing uses GitHub's short-lived identity token. No long-lived PyPI API token needs to be stored in the repository.

## Prepare a release

Keep the version identical in:

- `pyproject.toml`
- `CMakeLists.txt`
- `python/rubikoslav/__init__.py`

Then run:

```bash
uv run python scripts/check_release.py v0.4.0
uv run python -m unittest discover -s python/tests -v
uv build
```

## Publish

Create and push a tag matching the version:

```bash
git tag v0.4.0
git push origin v0.4.0
```

`.github/workflows/release.yml` then:

1. checks that all versions match the tag;
2. builds the source archive;
3. builds and tests CPython 3.10–3.14 wheels on Linux, macOS, and Windows;
4. publishes the files to PyPI through trusted publishing;
5. creates a GitHub release with the packages attached.

Tags are release actions. Push one only after the commit on `main` has passed CI.
