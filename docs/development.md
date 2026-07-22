# Development

## Toolchain

- Python 3.12 for the repository environment;
- [uv](https://docs.astral.sh/uv/);
- Node.js 24 or newer;
- CMake 3.26 or newer;
- a C++20 compiler and normal platform build tools.

## Set up the repository

```bash
git clone https://github.com/unnobatroo/rubikoslav.git
cd rubikoslav
uv sync --locked
npm ci
```

Run the Python/native package directly from the checkout:

```bash
uv run rubikoslav doctor --strict
uv run rubikoslav --no-open
```

## Test the Python package

```bash
uv run python -m unittest discover -s python/tests -v
uv run rubikoslav doctor --strict
uv build
```

`uv build` creates an sdist and a platform wheel. Inspect packaged web assets when changing CMake install rules or deleting static files.

## Test the native library

```bash
cmake -S . -B build/native \
  -DRUBIKOSLAV_BUILD_PYTHON=OFF \
  -DRUBIKOSLAV_WARNINGS_AS_ERRORS=ON
cmake --build build/native --parallel
ctest --test-dir build/native --output-on-failure
```

## Work on the browser

Handwritten TypeScript lives under `web/src/`. Browser-ready ES modules under `web/dist/` are committed because wheels and Vercel serve them without a runtime Node build.

```bash
npm run verify
```

This performs strict type checking, compiles into a temporary comparison directory, and fails when committed JavaScript or the ordered CSS entry point is stale.

After changing native face-turn behavior, regenerate the typed browser permutations before compiling:

```bash
cmake --build build/native --target generate-web-data
npm run build
ctest --test-dir build/native --output-on-failure
```

## Work on the wiki

```bash
uv sync --locked --only-group docs --no-install-project
uv run --no-sync mkdocs serve
```

Open <http://127.0.0.1:8000>. Match CI before committing:

```bash
uv run --no-sync mkdocs build --strict
```

## Repository checks

For a change that crosses Python, C++, browser assets, and docs:

```bash
npm run verify
uv run python -m unittest discover -s python/tests -v
uv run --only-group docs mkdocs build --strict
uv build
git diff --check
```

## Deployment

Pushes to `main` run cross-platform CI and deploy:

- the visualizer and Python endpoint through `.github/workflows/deploy.yml`;
- the wiki through `.github/workflows/docs.yml` when documentation changes.

The production workflow requires the repository's `VERCEL_TOKEN` secret. Generated optimal-search tables use writable `/tmp` on Vercel warm instances.

## Release process

Keep the version identical in `pyproject.toml`, `CMakeLists.txt`, `python/rubikoslav/__init__.py`, and `uv.lock`.

```bash
uv run --no-project python scripts/check_release.py v1.0.3
git tag v1.0.3
git push origin v1.0.3
```

The tag workflow validates the version, builds CPython 3.10-3.14 wheels for Linux, macOS, and Windows, builds the sdist, publishes through PyPI trusted publishing, and creates the GitHub release.
